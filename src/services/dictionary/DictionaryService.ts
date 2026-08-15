import type { DictionaryEntry } from '@/types/translation';

/**
 * DictionaryService.ts
 *
 * The rest of the app (OfflineTranslationService, screens) only talks to
 * this interface. LocalDictionaryService is the current implementation
 * (bundled read-only SQLite database, see LocalDictionaryService.ts for why
 * SQLite instead of a giant JSON file).
 */
export interface DictionaryService {
  /** True once the bundled database is attached and ready to query. */
  isReady(): boolean;

  /**
   * Exact lookup by kanji OR kana headword. Returns every entry that
   * matches (a headword can have multiple senses/entries in JMdict).
   */
  lookupExact(word: string): Promise<DictionaryEntry[]>;

  /**
   * Returns true if `word` exists as a headword at all -- used by the
   * translation engine to disambiguate conjugation candidates without
   * pulling back full entry data.
   */
  exists(word: string): Promise<boolean>;

  /**
   * Prefix search, used for the dictionary-assisted merge pass that
   * recovers fixed expressions TinySegmenter over-splits (e.g. こんにちは).
   * Returns headwords only, longest reasonable match first.
   */
  findByPrefix(prefix: string, maxLength: number): Promise<string[]>;
}
