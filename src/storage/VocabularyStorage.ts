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

    // Lists start empty -- the user creates their own (Favorites, N5, Anime,
    // whatever they want). No default lists are seeded.
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

  /** Simple substring search across the fields you'd actually look a word up by. */
  async searchItems(query: string): Promise<VocabularyItem[]> {
    const q = query.trim();
    if (!q) return [];
    const like = `%${q}%`;
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM items
       WHERE japanese LIKE ? OR kana LIKE ? OR romaji LIKE ? OR english_meanings LIKE ?
       ORDER BY created_at DESC`,
      [like, like, like, like]
    );
    return rows.map(rowToItem);
  }

  async getStats(): Promise<{ totalWords: number; totalFavorites: number; totalLists: number }> {
    const [wordsRow, favRow, listsRow] = await Promise.all([
      this.db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM items`),
      this.db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM items WHERE favorite = 1`),
      this.db.getFirstAsync<{ c: number }>(`SELECT COUNT(*) as c FROM lists`),
    ]);
    return {
      totalWords: wordsRow?.c ?? 0,
      totalFavorites: favRow?.c ?? 0,
      totalLists: listsRow?.c ?? 0,
    };
  }

  // -- Backup / restore ------------------------------------------------------

  /** Full snapshot for "Export Backup" -- plain JSON, human-inspectable. */
  async exportAll(): Promise<{ version: 1; lists: VocabularyList[]; items: VocabularyItem[] }> {
    const [lists, items] = await Promise.all([this.getLists(), this.getItems()]);
    return { version: 1, lists, items };
  }

  /**
   * Imports a previously-exported snapshot. Lists are matched by name (a
   * list with the same name is reused rather than duplicated); items are
   * always inserted fresh with new ids, since keeping the original ids
   * risks colliding with ones already on this device. Returns counts so
   * the Settings screen can show a real result instead of a blind "done".
   */
  async importData(data: {
    lists: VocabularyList[];
    items: VocabularyItem[];
  }): Promise<{ importedLists: number; importedItems: number }> {
    const existingLists = await this.getLists();
    const nameToId = new Map(existingLists.map((l) => [l.name, l.id]));
    let importedLists = 0;

    for (const list of data.lists) {
      if (!nameToId.has(list.name)) {
        const created = await this.createList(list.name);
        nameToId.set(list.name, created.id);
        importedLists++;
      }
    }

    const oldIdToNewListId = new Map(data.lists.map((l) => [l.id, nameToId.get(l.name)!]));

    let importedItems = 0;
    for (const item of data.items) {
      const listId = oldIdToNewListId.get(item.listId);
      if (!listId) continue; // orphaned reference in the backup file -- skip rather than guess
      await this.saveItem({
        listId,
        japanese: item.japanese,
        kana: item.kana,
        romaji: item.romaji,
        englishMeanings: item.englishMeanings,
        pos: item.pos,
        tags: item.tags,
        notes: item.notes,
        favorite: item.favorite,
      });
      importedItems++;
    }

    return { importedLists, importedItems };
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