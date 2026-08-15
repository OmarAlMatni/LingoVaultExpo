import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * SettingsStorage.ts
 *
 * Plain key-value settings. AsyncStorage (not SQLite) is the right tool
 * here -- it's a handful of scalar preferences, not relational data, so a
 * simple KV store keeps this trivial.
 */

export interface Settings {
  /** Minutes between widget vocabulary rotations (Phase 3 -- see README). */
  widgetRotationMinutes: 0.5 | 1 | 5 | 15 | 60;
  defaultListId: string | null;
}

const DEFAULTS: Settings = {
  widgetRotationMinutes: 5,
  defaultListId: null,
};

const KEY = 'lingovault:settings';

export class SettingsStorage {
  private cache: Settings | null = null;

  async load(): Promise<Settings> {
    if (this.cache) return this.cache;
    const raw = await AsyncStorage.getItem(KEY);
    this.cache = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    return this.cache;
  }

  async update(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.load();
    const next = { ...current, ...patch };
    this.cache = next;
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }
}
