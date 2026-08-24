import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSQLiteContext, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { TinySegmenterTokenizer } from './tokenizer/TinySegmenterTokenizer';
import { LocalDictionaryService } from './dictionary/LocalDictionaryService';
import { OfflineTranslationService } from './translation/OfflineTranslationService';
import { VocabularyStorage } from '@/storage/VocabularyStorage';
import { SettingsStorage } from '@/storage/SettingsStorage';

/**
 * AppServices.tsx
 *
 * This is the concrete answer to the spec's "there must be ONE translation
 * engine" requirement (section 15). Every screen -- the tabs, the
 * PROCESS_TEXT popup route, and later the subtitle player -- reads the same
 * OfflineTranslationService instance out of this context. Nobody
 * constructs their own tokenizer/dictionary/service; that only happens
 * once, here, at app startup.
 *
 * Two SQLite databases are involved:
 *  - dictionary.db: bundled, read-only, imported via the SQLiteProvider in
 *    app/_layout.tsx (see that file for the assetSource import mechanism).
 *  - vocabulary.db: created fresh on-device, writable, holds saved words
 *    and lists. Opened directly here (it doesn't need asset importing).
 */

interface AppServicesValue {
  ready: boolean;
  error: string | null;
  translationService: OfflineTranslationService | null;
  vocabularyStorage: VocabularyStorage | null;
  settingsStorage: SettingsStorage;
}

const AppServicesContext = createContext<AppServicesValue | null>(null);

export function AppServicesProvider({ children }: { children: React.ReactNode }) {
  const dictionaryDb = useSQLiteContext(); // tied to the <SQLiteProvider> wrapping this in _layout.tsx
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const translationServiceRef = useRef<OfflineTranslationService | null>(null);
  const vocabularyStorageRef = useRef<VocabularyStorage | null>(null);
  const settingsStorageRef = useRef(new SettingsStorage());

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const vocabDb: SQLiteDatabase = await openDatabaseAsync('vocabulary.db');

        const dictionary = new LocalDictionaryService(dictionaryDb);
        const tokenizer = new TinySegmenterTokenizer();
        const translationService = new OfflineTranslationService(tokenizer, dictionary);
        await translationService.init();

        const vocabularyStorage = new VocabularyStorage(vocabDb);

        if (cancelled) return;
        translationServiceRef.current = translationService;
        vocabularyStorageRef.current = vocabularyStorage;
        setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, [dictionaryDb]);

  return (
    <AppServicesContext.Provider
      value={{
        ready,
        error,
        translationService: translationServiceRef.current,
        vocabularyStorage: vocabularyStorageRef.current,
        settingsStorage: settingsStorageRef.current,
      }}
    >
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices(): AppServicesValue {
  const ctx = useContext(AppServicesContext);
  if (!ctx) throw new Error('useAppServices() must be used inside <AppServicesProvider>');
  return ctx;
}
