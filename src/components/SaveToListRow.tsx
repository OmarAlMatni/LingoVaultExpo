import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppServices } from '@/services/AppServices';
import { useTheme } from '@/theme/ThemeContext';
import type { VocabularyList } from '@/types/vocabulary';
import type { AnalyzedToken } from '@/types/translation';

/**
 * SaveToListRow.tsx
 *
 * Lists start empty on first launch -- so this can't assume a list already
 * exists. Supports creating a list inline, right where you're about to
 * save a word, in both the Translate screen and the PROCESS_TEXT popup
 * (same shared component, same VocabularyStorage instance either way).
 */
export function SaveToListRow({ token, compact }: { token: AnalyzedToken; compact?: boolean }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { vocabularyStorage } = useAppServices();
  const [lists, setLists] = useState<VocabularyList[]>([]);
  const [savedListId, setSavedListId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');

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

  async function handleCreateAndSave() {
    if (!vocabularyStorage || !newListName.trim()) return;
    const list = await vocabularyStorage.createList(newListName.trim());
    setLists((prev) => [...prev, list]);
    setNewListName('');
    setCreating(false);
    await handleSave(list.id);
  }

  return (
    <View style={compact ? styles.rowCompact : styles.row}>
      <Text style={styles.label}>Save to:</Text>

      {lists.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
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
          <Pressable style={styles.newChip} onPress={() => setCreating(true)}>
            <Text style={styles.newChipText}>+ New list</Text>
          </Pressable>
        </ScrollView>
      )}

      {lists.length === 0 && !creating && (
        <Pressable style={styles.newChip} onPress={() => setCreating(true)}>
          <Text style={styles.newChipText}>+ Create a list</Text>
        </Pressable>
      )}

      {creating && (
        <View style={styles.createRow}>
          <TextInput
            style={styles.createInput}
            placeholder="List name (e.g. Favorites)"
            placeholderTextColor={colors.inkFaint}
            value={newListName}
            onChangeText={setNewListName}
            onSubmitEditing={handleCreateAndSave}
            autoFocus
          />
          <Pressable
            style={[styles.createButton, !newListName.trim() && styles.disabled]}
            onPress={handleCreateAndSave}
            disabled={!newListName.trim()}
          >
            <Text style={styles.createButtonText}>Save</Text>
          </Pressable>
          <Pressable
            style={styles.cancelButton}
            onPress={() => {
              setCreating(false);
              setNewListName('');
            }}
          >
            <Text style={styles.cancelButtonText}>✕</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    row: { marginTop: 8, marginBottom: 4 },
    rowCompact: { marginTop: 4 },
    label: { fontSize: 12, color: colors.inkFaint, marginBottom: 6, fontWeight: '600' },
    chipScroll: { flexDirection: 'row' },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      marginRight: 8,
    },
    chipSaved: { backgroundColor: colors.primary },
    chipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    chipTextSaved: { color: colors.onPrimary },
    newChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderStyle: 'dashed',
    },
    newChipText: { fontSize: 12, color: colors.inkMuted, fontWeight: '600' },
    createRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
    createInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 13,
      color: colors.ink,
    },
    createButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    createButtonText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
    cancelButton: { paddingHorizontal: 6, paddingVertical: 6 },
    cancelButtonText: { color: colors.inkFaint, fontSize: 13 },
    disabled: { opacity: 0.5 },
  });
}