import type { SQLiteDatabase } from 'expo-sqlite';
import type { DictionaryService } from './DictionaryService';
import type { DictionaryEntry, PartOfSpeech } from '@/types/translation';

/**
 * LocalDictionaryService.ts
 *
 * Why SQLite instead of the old dictionary.json approach:
 *
 * The v1 app fetched a single ~29MB JSON file over `fetch('/dictionary.json')`
 * inside a WebView, which is exactly the kind of asset-path/WebView-routing
 * problem this rewrite exists to eliminate -- and even when it *did* load,
 * parsing a 29MB JSON blob and holding the whole thing in memory on a phone
 * is wasteful.
 *
 * Here, `dictionary.db` ships as a bundled asset (assets/dictionary.db) and
 * is imported into the app's private SQLite directory ONE TIME on first
 * launch via expo-sqlite's documented `assetSource` mechanism (see
 * app/_layout.tsx's `<SQLiteProvider assetSource={...}>`). After that it's
 * a normal on-disk, indexed, read-only database -- lookups are fast even
 * for the full ~190k-entry JMdict, and nothing is ever fetched over a
 * network-shaped API, because there is no network layer involved at all.
 *
 * Schema (see scripts/build-dictionary.js):
 *   entries(id, kanji, kana, meanings JSON-text, pos JSON-text)
 *   indexes on kanji and kana for O(log n) exact lookups.
 */

interface EntryRow {
  id: number;
  kanji: string | null;
  kana: string;
  meanings: string; // JSON-encoded string[]
  pos: string; // JSON-encoded string[]
}

function rowToEntry(row: EntryRow): DictionaryEntry {
  let meanings: string[] = [];
  let pos: PartOfSpeech[] = [];
  try {
    meanings = JSON.parse(row.meanings);
  } catch {
    meanings = [];
  }
  try {
    pos = JSON.parse(row.pos);
  } catch {
    pos = [];
  }
  return { id: row.id, kanji: row.kanji, kana: row.kana, meanings, pos };
}

export class LocalDictionaryService implements DictionaryService {
  private db: SQLiteDatabase;
  private ready = false;

  constructor(db: SQLiteDatabase) {
    this.db = db;
    this.ready = true; // db is already open/imported by the time SQLiteProvider renders children
  }

  isReady(): boolean {
    return this.ready;
  }

  async lookupExact(word: string): Promise<DictionaryEntry[]> {
    if (!word) return [];
    const rows = await this.db.getAllAsync<EntryRow>(
      `SELECT id, kanji, kana, meanings, pos FROM entries WHERE kanji = ? OR kana = ? LIMIT 20`,
      [word, word]
    );
    return rows.map(rowToEntry);
  }

  async exists(word: string): Promise<boolean> {
    if (!word) return false;
    const row = await this.db.getFirstAsync<{ id: number }>(
      `SELECT id FROM entries WHERE kanji = ? OR kana = ? LIMIT 1`,
      [word, word]
    );
    return row != null;
  }

  async findByPrefix(prefix: string, maxLength = 8): Promise<string[]> {
    if (!prefix) return [];
    const rows = await this.db.getAllAsync<{ headword: string }>(
      `SELECT COALESCE(kanji, kana) AS headword FROM entries
       WHERE kanji LIKE ? OR kana LIKE ?
       ORDER BY LENGTH(headword) DESC LIMIT ?`,
      [`${prefix}%`, `${prefix}%`, maxLength]
    );
    return rows.map((r) => r.headword);
  }
}
