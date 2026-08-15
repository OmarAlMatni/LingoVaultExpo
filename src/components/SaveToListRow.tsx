import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppServices } from '@/services/AppServices';
import type { VocabularyList } from '@/types/vocabulary';
import type { AnalyzedToken } from '@/types/translation';

export function SaveToListRow({ token, compact }: { token: AnalyzedToken; compact?: boolean }) {
  const { vocabularyStorage } = useAppServices();
  const [lists, setLists] = useState<VocabularyList[]>([]);
  const [savedListId, setSavedListId] = useState<string | null>(null);

  useEffect(() => {
    vocabularyStorage?.getLists().then(setLists);
  }, [vocabularyStorage]);

  async function handleSave(listId: string) {
    if (!vocabularyStorage) return;
    await vocabularyStorage.saveItem({
      listId,
      japanese: token.surface,
      kana: token.kana,
      romaji: token.romaji,
      englishMeanings: token.meanings,
      pos: token.pos,
      tags: [],
      notes: '',
      favorite: false,
    });
    setSavedListId(listId);
  }

  if (lists.length === 0) return null;

  return (
    <View style={compact ? styles.rowCompact : styles.row}>
      <Text style={styles.label}>Save to:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {lists.map((list) => (
          <Pressable
            key={list.id}
            onPress={() => handleSave(list.id)}
            style={[styles.chip, savedListId === list.id && styles.chipSaved]}
          >
            <Text style={[styles.chipText, savedListId === list.id && styles.chipTextSaved]}>
              {savedListId === list.id ? `Saved ✓ ${list.name}` : list.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 8, marginBottom: 4 },
  rowCompact: { marginTop: 4 },
  label: { fontSize: 12, color: '#9A9AA8', marginBottom: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1EFFB',
    marginRight: 8,
  },
  chipSaved: { backgroundColor: '#2F8F7F' },
  chipText: { fontSize: 12, color: '#4A4A5E', fontWeight: '500' },
  chipTextSaved: { color: '#FFFFFF' },
});
