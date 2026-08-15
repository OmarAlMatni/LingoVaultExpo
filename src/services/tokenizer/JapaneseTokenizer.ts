/**
 * JapaneseTokenizer.ts
 *
 * The whole app talks to tokenizers through this interface only.
 * TinySegmenterTokenizer is the current implementation (see
 * TinySegmenterTokenizer.ts for why it was chosen over Suzume/Kuromoji).
 *
 * To try a different engine later (a WASM-based one, a native module,
 * whatever): implement this interface in a new file and swap the export
 * in `index.ts` — nothing else in the app needs to change.
 */

export type RawPartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'particle'
  | 'auxiliary'
  | 'conjunction'
  | 'interjection'
  | 'symbol'
  | 'prefix'
  | 'suffix'
  | 'other'
  | 'unknown';

export interface RawToken {
  /** The exact substring as it appeared in the input. */
  surface: string;
  /**
   * Best-effort dictionary/base form (e.g. "食べました" -> "食べる").
   * Falls back to `surface` when the tokenizer can't infer one.
   */
  baseForm: string;
  /**
   * Some conjugated forms are genuinely ambiguous without a dictionary
   * (e.g. godan "った" could come from 買う, 待つ, or 乗る). When the
   * tokenizer can't fully resolve it, `baseForm` holds its best single
   * guess and `altBaseForms` holds the other candidates -- callers that
   * have dictionary access (OfflineTranslationService) should try each
   * candidate against the dictionary and prefer whichever one resolves.
   */
  altBaseForms?: string[];
  /** Coarse part-of-speech guess. Tokenizers that can't classify return 'unknown'. */
  pos: RawPartOfSpeech;
}

export interface JapaneseTokenizer {
  /** Human-readable name, surfaced in Settings for debugging. */
  readonly name: string;
  /** Tokenizers that need to load anything async should resolve here first. */
  init(): Promise<void>;
  /** Synchronous once init() has resolved. */
  tokenize(text: string): RawToken[];
}
