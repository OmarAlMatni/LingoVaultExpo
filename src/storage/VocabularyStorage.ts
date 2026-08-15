import type { SQLiteDatabase } from 'expo-sqlite';
import type { VocabularyItem, VocabularyList } from '@/types/vocabulary';

/**
 * VocabularyStorage.ts
 *
 * Separate, writable SQLite database from the bundled read-only
 * dictionary.db (see db.ts for why they're two separate databases).
 * Everything here survives app restarts and phone restarts because it's
 * plain on-disk SQLite in the app's private storage -- no extra work
 * needed for that requirement, it's just what SQLite files do.
 *
 * Both the main Translate screen and the PROCESS_TEXT popup call the same
 * methods on the same underlying database file, so a word saved from the
 * popup shows up in Lists immediately without any sync step.
 */
export class VocabularyStorage {
  constructor(private db: SQLiteDatabase) {}

  async init(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL,
        japanese TEXT NOT NULL,
        kana TEXT NOT NULL,
        romaji TEXT NOT NULL,
        english_meanings TEXT NOT NULL,
        pos TEXT NOT NULL,
        tags TEXT NOT NULL,
        notes TEXT NOT NULL,
        favorite INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_items_list ON items(list_id);
    `);

    const existing = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM lists`
    );
    if (!existing || existing.count === 0) {
      // Seed the default lists mentioned in the spec so Lists isn't empty
      // on first launch.
      for (const name of ['Favorites', 'N5', 'N4']) {
        await this.createList(name);
      }
    }
  }

  // -- Lists ---------------------------------------------------------------

  async getLists(): Promise<VocabularyList[]> {
    const rows = await this.db.getAllAsync<{ id: string; name: string; created_at: number }>(
      `SELECT id, name, created_at FROM lists ORDER BY created_at ASC`
    );
    return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at }));
  }

  async createList(name: string): Promise<VocabularyList> {
    const id = `list_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();
    await this.db.runAsync(`INSERT INTO lists (id, name, created_at) VALUES (?, ?, ?)`, [
      id,
      name,
      createdAt,
    ]);
    return { id, name, createdAt };
  }

  async deleteList(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM items WHERE list_id = ?`, [id]);
    await this.db.runAsync(`DELETE FROM lists WHERE id = ?`, [id]);
  }

  // -- Items -----------------------------------------------------------------

  async getItems(listId?: string): Promise<VocabularyItem[]> {
    const rows = listId
      ? await this.db.getAllAsync<any>(
          `SELECT * FROM items WHERE list_id = ? ORDER BY created_at DESC`,
          [listId]
        )
      : await this.db.getAllAsync<any>(`SELECT * FROM items ORDER BY created_at DESC`);
    return rows.map(rowToItem);
  }

  async saveItem(
    item: Omit<VocabularyItem, 'id' | 'createdAt'>
  ): Promise<VocabularyItem> {
    const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = Date.now();
    await this.db.runAsync(
      `INSERT INTO items
        (id, list_id, japanese, kana, romaji, english_meanings, pos, tags, notes, favorite, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.listId,
        item.japanese,
        item.kana,
        item.romaji,
        JSON.stringify(item.englishMeanings),
        JSON.stringify(item.pos),
        JSON.stringify(item.tags),
        item.notes,
        item.favorite ? 1 : 0,
        createdAt,
      ]
    );
    return { ...item, id, createdAt };
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM items WHERE id = ?`, [id]);
  }

  async toggleFavorite(id: string, favorite: boolean): Promise<void> {
    await this.db.runAsync(`UPDATE items SET favorite = ? WHERE id = ?`, [favorite ? 1 : 0, id]);
  }
}

function rowToItem(row: any): VocabularyItem {
  return {
    id: row.id,
    listId: row.list_id,
    japanese: row.japanese,
    kana: row.kana,
    romaji: row.romaji,
    englishMeanings: JSON.parse(row.english_meanings),
    pos: JSON.parse(row.pos),
    tags: JSON.parse(row.tags),
    notes: row.notes,
    favorite: !!row.favorite,
    createdAt: row.created_at,
  };
}
