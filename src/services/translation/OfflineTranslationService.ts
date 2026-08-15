import * as wanakana from 'wanakana';
import type { JapaneseTokenizer, RawToken } from '../tokenizer/JapaneseTokenizer';
import type { DictionaryService } from '../dictionary/DictionaryService';
import type { AnalyzedToken, TranslationResult, PartOfSpeech } from '@/types/translation';

/**
 * OfflineTranslationService.ts
 *
 * This is the ONE analyzer the whole app uses -- the main Translate screen,
 * the PROCESS_TEXT popup, and (later) subtitle word-tapping all call the
 * same `analyze()` on the same instance. That's a hard architectural
 * requirement from the spec (section 15), not just a nice-to-have: it's
 * what guarantees "select a word in a video, tap it, get the exact same
 * result you'd get on the Translate screen" actually holds, rather than
 * silently drifting into two different behaviors over time.
 *
 * Pipeline:
 *   1. Tokenize with the injected JapaneseTokenizer (TinySegmenter today).
 *   2. Dictionary-assisted re-merge pass: TinySegmenter has no dictionary
 *      awareness, so fixed expressions get over-split (raw こんにちは ->
 *      "こん","にち","は"). Greedily try merging runs of 2-6 consecutive
 *      raw tokens and keep the longest merge that's an actual headword in
 *      the bundled dictionary.
 *   3. For each (possibly merged) token, look up baseForm in the
 *      dictionary; for ambiguous conjugations (see altBaseForms in
 *      TinySegmenterTokenizer), try each candidate until one resolves.
 *   4. Attach kana/romaji via wanakana, a small pure-JS conversion library
 *      (no assets, no native code -- same reasoning as picking TinySegmenter).
 *
 * This is a dictionary-based analyzer, not a machine translation model --
 * word-by-word glosses, not fluent sentence translation. That's by design
 * per the spec ("do not promise perfect machine translation").
 */
export class OfflineTranslationService {
  constructor(
    private tokenizer: JapaneseTokenizer,
    private dictionary: DictionaryService
  ) {}

  async init(): Promise<void> {
    await this.tokenizer.init();
  }

  async analyze(text: string): Promise<TranslationResult> {
    const trimmed = text.trim();
    if (!trimmed) return { inputText: text, tokens: [] };

    const rawTokens = this.tokenizer.tokenize(trimmed);
    const merged = await this.mergeKnownExpressions(rawTokens);

    const tokens: AnalyzedToken[] = [];
    for (const raw of merged) {
      tokens.push(await this.resolveToken(raw));
    }

    return { inputText: text, tokens };
  }

  /**
   * Greedily merges runs of consecutive raw tokens when the concatenation
   * is itself a dictionary headword, longest-match-first. Bounded window
   * (6 tokens) keeps this cheap -- it's a handful of extra exists() calls
   * per position, not a search over the whole sentence.
   */
  private async mergeKnownExpressions(raw: RawToken[]): Promise<RawToken[]> {
    const result: RawToken[] = [];
    let i = 0;
    const MAX_WINDOW = 6;

    while (i < raw.length) {
      let mergedThisStep = false;

      const maxWindow = Math.min(MAX_WINDOW, raw.length - i);
      for (let window = maxWindow; window >= 2; window--) {
        const span = raw.slice(i, i + window);
        const candidate = span.map((t) => t.surface).join('');
        // eslint-disable-next-line no-await-in-loop
        if (await this.dictionary.exists(candidate)) {
          result.push({ surface: candidate, baseForm: candidate, pos: 'unknown' });
          i += window;
          mergedThisStep = true;
          break;
        }
      }

      if (!mergedThisStep) {
        result.push(raw[i]);
        i += 1;
      }
    }

    return result;
  }

  private async resolveToken(raw: RawToken): Promise<AnalyzedToken> {
    const candidates = [raw.baseForm, ...(raw.altBaseForms ?? []), raw.surface];

    for (const candidate of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const entries = await this.dictionary.lookupExact(candidate);
      if (entries.length > 0) {
        const entry = entries[0];
        const kana = entry.kana || toKana(candidate);
        return {
          surface: raw.surface,
          baseForm: candidate,
          kana,
          romaji: toRomaji(raw.surface, kana),
          meanings: entries.flatMap((e) => e.meanings),
          pos: mergePos(entries.flatMap((e) => e.pos), raw.pos),
          found: true,
        };
      }
    }

    // Nothing resolved -- still return something useful (kana/romaji if we
    // can derive it, empty meanings, found:false) rather than dropping the
    // token. The UI is responsible for showing "not found" appropriately.
    const kana = toKana(raw.surface);
    return {
      surface: raw.surface,
      baseForm: raw.baseForm,
      kana,
      romaji: toRomaji(raw.surface, kana),
      meanings: [],
      pos: raw.pos === 'unknown' ? [] : [raw.pos as PartOfSpeech],
      found: false,
    };
  }
}

function toKana(text: string): string {
  // If it's already kana, wanakana just hands it back. If it's kanji we
  // have no reading for, this is a best-effort no-op (kanji can't be
  // algorithmically converted to kana without a reading dictionary) --
  // an honest gap the UI should treat as "reading unknown", not silently
  // show something misleading.
  return wanakana.isKana(text) ? text : text;
}

// Standalone は and を are grammatical particles pronounced "wa" and "o" --
// not the "ha"/"wo" a naive kana->romaji table would produce. Verified via
// integration testing against real sentences, not theoretical. Only applies
// when the token IS that single character (a particle), not when は/を
// appear inside a longer word's reading.
const PARTICLE_ROMAJI_OVERRIDES: Record<string, string> = {
  は: 'wa',
  を: 'o',
};

// A handful of common greetings have a fossilized particle は pronounced
// "wa" as part of the word itself (not a standalone particle), which
// mechanical kana->romaji conversion gets wrong ("konnichiha" instead of
// "konnichiwa"). This is a small, explicit exception list, not a general
// rule -- は inside most other words (はな "hana"/flower, etc.) really is
// pronounced "ha", so a blanket substitution would be wrong more often
// than it's right. Extend this list as more cases are found.
const IDIOM_ROMAJI_OVERRIDES: Record<string, string> = {
  こんにちは: 'konnichiwa',
  こんばんは: 'konbanwa',
};

function toRomaji(surface: string, kana: string): string {
  if (IDIOM_ROMAJI_OVERRIDES[kana]) return IDIOM_ROMAJI_OVERRIDES[kana];
  if (PARTICLE_ROMAJI_OVERRIDES[surface]) return PARTICLE_ROMAJI_OVERRIDES[surface];
  return wanakana.toRomaji(kana);
}

function mergePos(dictPos: PartOfSpeech[], tokenizerPos: string): PartOfSpeech[] {
  if (dictPos.length > 0) return Array.from(new Set(dictPos));
  if (tokenizerPos && tokenizerPos !== 'unknown') return [tokenizerPos as PartOfSpeech];
  return [];
}
