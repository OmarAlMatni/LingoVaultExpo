export type PartOfSpeech =
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

export interface DictionaryEntry {
  id: number;
  kanji: string | null;
  kana: string;
  meanings: string[];
  pos: PartOfSpeech[];
}

export interface AnalyzedToken {
  /** Text exactly as it appeared in the input sentence. */
  surface: string;
  /** Dictionary/base form used for the lookup (e.g. "食べる" for "食べました"). */
  baseForm: string;
  kana: string;
  romaji: string;
  meanings: string[];
  pos: PartOfSpeech[];
  /** True if a dictionary entry was actually found for this token. */
  found: boolean;
}

export interface TranslationResult {
  inputText: string;
  tokens: AnalyzedToken[];
}
