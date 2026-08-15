/**
 * TinySegmenterTokenizer.ts
 *
 * Why TinySegmenter instead of Suzume or Kuromoji:
 *
 * - Suzume (@libraz/suzume) is a real, actively-maintained, more accurate
 *   tokenizer -- but it ships as C++ compiled to WebAssembly. Hermes (React
 *   Native's default JS engine) has no WebAssembly runtime, and there is no
 *   published React Native/Expo binding for it. Using it would mean writing
 *   a custom native module that embeds the C++ library directly -- a much
 *   bigger native-code commitment than this phase calls for, and it
 *   reintroduces exactly the "binary blob asset" risk this rewrite exists to
 *   avoid. Revisit this if a real RN binding appears later; the
 *   JapaneseTokenizer interface is there specifically so that swap is easy.
 *
 * - Kuromoji is explicitly out of scope per your instructions (and is the
 *   thing that caused all the WebView asset-loading problems in v1).
 *
 * - TinySegmenter is a ~18KB pure-JS statistical model (see
 *   vendor/tinysegmenter.ts) with ZERO dictionary files, ZERO WASM, ZERO
 *   native module, and ZERO asset loading of any kind. It's part of the JS
 *   bundle like any other module. That completely eliminates the entire bug
 *   class that ate weeks of the old project.
 *
 * Known, real trade-offs (verified empirically, not theoretical):
 *
 * 1. No dictionary awareness -> fixed expressions get over-split.
 *    e.g. raw segment("こんにちは") = ["こん","にち","は"], not one word.
 *    Mitigation: OfflineTranslationService does a dictionary-assisted
 *    greedy re-merge pass after tokenizing (see translation/OfflineTranslationService.ts).
 *    That fixes greetings/compounds *if* they exist in the bundled dictionary.
 *
 * 2. No lemmatization -> "食べました" segments as ["食べ","まし","た"], not
 *    a single token with base form "食べる". `normalizeConjugation()` below
 *    is a hand-written, DELIBERATELY LIMITED pattern table covering the
 *    common ichidan/godan/i-adjective/suru-verb inflections. It will not
 *    catch every irregular or rare conjugation. This is a real accuracy
 *    regression versus Kuromoji's IPAdic-based lemmatization -- the
 *    trade-off for not shipping multi-megabyte dictionary files. Flagged
 *    here explicitly per your "don't overclaim" instruction.
 */

import { TinySegmenter } from './vendor/tinysegmenter';
import type { JapaneseTokenizer, RawToken, RawPartOfSpeech } from './JapaneseTokenizer';

const PARTICLES = new Set([
  'は', 'が', 'を', 'に', 'で', 'の', 'も', 'へ', 'と', 'から', 'まで',
  'より', 'か', 'ね', 'よ', 'な', 'わ', 'ぞ', 'けど', 'けれど', 'し', 'て', 'ば', 'や',
]);

const AUX_TAILS = new Set([
  'まし', 'ます', 'ませ', 'た', 'だ', 'ない', 'ぬ', 'う', 'よう', 'れる', 'られる', 'せる', 'させる',
]);

// (て/た-form ending) -> unambiguous godan dictionary-form ending
const GODAN_TE_TA_UNAMBIGUOUS: Record<string, string> = {
  いて: 'く', いた: 'く',
  いで: 'ぐ', いだ: 'ぐ',
  して: 'す', した: 'す',
};
// (て/た-form ending) -> every godan row that collapses to this ending.
// う/つ/る all become って/った; む/ぶ/ぬ all become んで/んだ.
// The dictionary layer (OfflineTranslationService) tries these in order
// and keeps the first one that's an actual dictionary entry.
const GODAN_TE_TA_AMBIGUOUS: Record<string, string[]> = {
  って: ['う', 'つ', 'る'],
  った: ['う', 'つ', 'る'],
  んで: ['む', 'ぶ', 'ぬ'],
  んだ: ['む', 'ぶ', 'ぬ'],
};

function isKanjiOrKana(ch: string): boolean {
  return /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/.test(ch);
}

/**
 * Best-effort: given a run of raw TinySegmenter tokens starting at index i,
 * try to recognize a common conjugated verb/i-adjective and return
 * { baseForm, consumed } if recognized, else null.
 */
interface ConjugationMatch {
  baseForm: string;
  altBaseForms?: string[];
  consumed: number;
}

function tryConjugation(tokens: string[], i: number): ConjugationMatch | null {
  const t0 = tokens[i];
  const t1 = tokens[i + 1] ?? '';
  const t2 = tokens[i + 2] ?? '';

  if (!t0 || !isKanjiOrKana(t0[t0.length - 1])) return null;

  const combo2 = t0 + t1;
  const combo3 = t0 + t1 + t2;

  // i-adjective past ("大きかった" -> "大きい") / negative ("大きくない" -> "大きい").
  // Checked FIRST and against the raw combined string (not assumed token
  // boundaries) because TinySegmenter doesn't split these consistently --
  // e.g. it may hand back ["大きかっ","た"] rather than ["大き","かっ","た"].
  // Also must come before the godan って/った check below, since "かった"
  // and godan-verb "った" share a suffix and would otherwise collide
  // (e.g. "大きかった" vs "買った").
  if (combo2.endsWith('かった')) {
    return { baseForm: combo2.slice(0, -3) + 'い', consumed: 2 };
  }
  if (combo3.endsWith('かった')) {
    return { baseForm: combo3.slice(0, -3) + 'い', consumed: 3 };
  }
  if (combo2.endsWith('くない')) {
    return { baseForm: combo2.slice(0, -3) + 'い', consumed: 2 };
  }
  if (combo3.endsWith('くない')) {
    return { baseForm: combo3.slice(0, -3) + 'い', consumed: 3 };
  }

  // する-verb, e.g. "勉強" + "し" + "ます" -> "勉強する"
  if (t1 === 'し' && (t2 === 'ます' || t2 === 'まし' || t2 === 'て')) {
    return { baseForm: t0 + 'する', consumed: t2 === 'て' ? 2 : 3 };
  }

  // Ichidan -ます stem, e.g. "食べ" + "まし" + "た" -> "食べる"
  if (t1 === 'まし' || t1 === 'ます' || t1 === 'ませ') {
    const lastChar = t0[t0.length - 1];
    if ('えけげせてねべめれいきぎしちにびみり'.includes(lastChar)) {
      const consumed = t2 === 'た' || t2 === 'て' ? 3 : 2;
      return { baseForm: t0 + 'る', consumed };
    }
  }

  // Godan て/た-form, unambiguous rows, e.g. "書い" + "た" -> "書く"
  for (const suffix of Object.keys(GODAN_TE_TA_UNAMBIGUOUS)) {
    if (combo2.endsWith(suffix)) {
      const stem = combo2.slice(0, -suffix.length);
      return { baseForm: stem + GODAN_TE_TA_UNAMBIGUOUS[suffix], consumed: 2 };
    }
  }

  // Godan て/た-form, ambiguous rows (う/つ/る or む/ぶ/ぬ all collapse to
  // the same surface form) -- e.g. "買った" could be 買う/買つ/買る.
  // Return every candidate; the dictionary layer picks the real one.
  for (const suffix of Object.keys(GODAN_TE_TA_AMBIGUOUS)) {
    if (combo2.endsWith(suffix)) {
      const stem = combo2.slice(0, -suffix.length);
      const rows = GODAN_TE_TA_AMBIGUOUS[suffix];
      return {
        baseForm: stem + rows[0],
        altBaseForms: rows.slice(1).map((row) => stem + row),
        consumed: 2,
      };
    }
  }

  return null;
}

function guessPos(surface: string, wasConjugationMerge: boolean): RawPartOfSpeech {
  if (PARTICLES.has(surface)) return 'particle';
  if (AUX_TAILS.has(surface)) return 'auxiliary';
  if (/^[.,!?。、！？「」『』・…\s]+$/.test(surface)) return 'symbol';
  if (wasConjugationMerge) return 'verb';
  if (/^[\u4E00-\u9FFF]+$/.test(surface)) return 'noun'; // pure-kanji run: best guess without a dictionary
  return 'unknown';
}

export class TinySegmenterTokenizer implements JapaneseTokenizer {
  readonly name = 'TinySegmenter';
  private engine: TinySegmenter | null = null;

  async init(): Promise<void> {
    // Nothing async to load -- pure JS, already in the bundle. Kept async
    // to satisfy the shared interface (and so a future engine that DOES
    // need async setup is a drop-in replacement).
    this.engine = new TinySegmenter();
  }

  tokenize(text: string): RawToken[] {
    if (!this.engine) {
      throw new Error('TinySegmenterTokenizer.tokenize() called before init()');
    }
    const raw: string[] = this.engine.segment(text);
    const tokens: RawToken[] = [];

    let i = 0;
    while (i < raw.length) {
      const conjugation = tryConjugation(raw, i);
      if (conjugation) {
        const surface = raw.slice(i, i + conjugation.consumed).join('');
        tokens.push({
          surface,
          baseForm: conjugation.baseForm,
          altBaseForms: conjugation.altBaseForms,
          pos: 'verb',
        });
        i += conjugation.consumed;
        continue;
      }
      const surface = raw[i];
      tokens.push({ surface, baseForm: surface, pos: guessPos(surface, false) });
      i += 1;
    }

    return tokens;
  }
}
