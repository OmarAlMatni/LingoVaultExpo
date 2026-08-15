import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAppServices } from '@/services/AppServices';
import type { VocabularyItem, VocabularyList } from '@/types/vocabulary';

export default function ListsScreen() {
  const { vocabularyStorage } = useAppServices();
  const [lists, setLists] = useState<VocabularyList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [newListName, setNewListName] = useState('');

  const reload = useCallback(async () => {
    if (!vocabularyStorage) return;
    const l = await vocabularyStorage.getLists();
    setLists(l);
    const currentActive = activeListId ?? l[0]?.id ?? null;
    setActiveListId(currentActive);
    if (currentActive) {
      setItems(await vocabularyStorage.getItems(currentActive));
    }
  }, [vocabularyStorage, activeListId]);

  useFocusEffect(
    useCallback(() => {
      reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vocabularyStorage])
  );

  async function selectList(id: string) {
    setActiveListId(id);
    if (vocabularyStorage) setItems(await vocabularyStorage.getItems(id));
  }

  async function addList() {
    if (!vocabularyStorage || !newListName.trim()) return;
    const list = await vocabularyStorage.createList(newListName.trim());
    setNewListName('');
    setLists((prev) => [...prev, list]);
    selectList(list.id);
  }

  async function removeItem(id: string) {
    if (!vocabularyStorage) return;
    await vocabularyStorage.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Lists</Text>

      <FlatList
        horizontal
        data={lists}
        keyExtractor={(l) => l.id}
        showsHorizontalScrollIndicator={false}
        style={styles.listRow}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => selectList(item.id)}
            style={[styles.listChip, item.id === activeListId && styles.listChipActive]}
          >
            <Text
              style={[
                styles.listChipText,
                item.id === activeListId && styles.listChipTextActive,
              ]}
            >
              {item.name}
            </Text>
          </Pressable>
        )}
      />

      <View style={styles.newListRow}>
        <TextInput
          style={styles.newListInput}
          placeholder="New list name"
          placeholderTextColor="#B4B4C4"
          value={newListName}
          onChangeText={setNewListName}
          onSubmitEditing={addList}
        />
        <Pressable style={styles.addButton} onPress={addList}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.itemsList}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemJapanese}>{item.japanese}</Text>
              <Pressable onPress={() => removeItem(item.id)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
            <Text style={styles.itemKana}>
              {item.kana} · {item.romaji}
            </Text>
            <Text style={styles.itemMeaning}>{item.englishMeanings.join('; ')}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No words saved in this list yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF', paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#221F35', marginTop: 12 },
  listRow: { marginTop: 14, maxHeight: 44 },
  listChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEAF6',
    marginRight: 8,
  },
  listChipActive: { backgroundColor: '#2F8F7F', borderColor: '#2F8F7F' },
  listChipText: { color: '#4A4A5E', fontWeight: '600', fontSize: 13 },
  listChipTextActive: { color: '#FFFFFF' },
  newListRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  newListInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ECEAF6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#221F35',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  itemsList: { marginTop: 16, paddingBottom: 24 },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECEAF6',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemJapanese: { fontSize: 18, fontWeight: '700', color: '#221F35' },
  remove: { fontSize: 12, color: '#B3261E' },
  itemKana: { fontSize: 13, color: '#6B6B7D', marginTop: 2 },
  itemMeaning: { fontSize: 13, color: '#33324A', marginTop: 6 },
  empty: { textAlign: 'center', color: '#9A9AA8', marginTop: 40 },
});
