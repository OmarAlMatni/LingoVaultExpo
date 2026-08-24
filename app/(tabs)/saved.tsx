import React, { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppServices } from '@/services/AppServices';
import { useTheme } from '@/theme/ThemeContext';
import type { VocabularyItem, VocabularyList } from '@/types/vocabulary';

export default function SavedScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { vocabularyStorage } = useAppServices();

  const [lists, setLists] = useState<VocabularyList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null); // null = All Lists
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const reload = useCallback(async () => {
    if (!vocabularyStorage) return;
    const l = await vocabularyStorage.getLists();
    setLists(l);

    if (searchText.trim()) {
      setItems(await vocabularyStorage.searchItems(searchText.trim()));
    } else {
      setItems(await vocabularyStorage.getItems(activeListId ?? undefined));
    }
  }, [vocabularyStorage, activeListId, searchText]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleCreateList() {
    if (!vocabularyStorage || !newListName.trim()) return;
    const list = await vocabularyStorage.createList(newListName.trim());
    setLists((prev) => [...prev, list]);
    setNewListName('');
    setCreateOpen(false);
    setActiveListId(list.id);
  }

  async function removeItem(id: string) {
    if (!vocabularyStorage) return;
    await vocabularyStorage.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const activeListName = activeListId ? lists.find((l) => l.id === activeListId)?.name : 'All Lists';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Saved</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.inkFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved words..."
          placeholderTextColor={colors.inkFaint}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <View style={styles.filterRow}>
        <Pressable style={styles.listPicker} onPress={() => setListPickerOpen(true)}>
          <Text style={styles.listPickerText} numberOfLines={1}>
            {activeListName}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.inkMuted} />
        </Pressable>
        <Pressable style={styles.newListButton} onPress={() => setCreateOpen(true)}>
          <Ionicons name="add" size={16} color={colors.onPrimary} />
          <Text style={styles.newListButtonText}>New List</Text>
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
              <Pressable onPress={() => removeItem(item.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
            <Text style={styles.itemKana}>
              {item.kana} · {item.romaji}
            </Text>
            <Text style={styles.itemMeaning}>{item.englishMeanings.join('; ')}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="filter-outline" size={24} color={colors.inkFaint} />
            </View>
            <Text style={styles.emptyTitle}>No words found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters or search term, or translate some new words.
            </Text>
          </View>
        }
      />

      {/* List picker */}
      <Modal visible={listPickerOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setListPickerOpen(false)}>
          <View style={styles.modalCard}>
            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setActiveListId(null);
                setListPickerOpen(false);
              }}
            >
              <Text style={styles.modalOptionText}>All Lists</Text>
            </Pressable>
            {lists.map((list) => (
              <Pressable
                key={list.id}
                style={styles.modalOption}
                onPress={() => {
                  setActiveListId(list.id);
                  setListPickerOpen(false);
                }}
              >
                <Text style={styles.modalOptionText}>{list.name}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* New list */}
      <Modal visible={createOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setCreateOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>New list</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="List name"
              placeholderTextColor={colors.inkFaint}
              value={newListName}
              onChangeText={setNewListName}
              onSubmitEditing={handleCreateList}
              autoFocus
            />
            <Pressable
              style={[styles.modalCreateButton, !newListName.trim() && styles.disabled]}
              onPress={handleCreateList}
              disabled={!newListName.trim()}
            >
              <Text style={styles.modalCreateButtonText}>Create</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 12, letterSpacing: 0.2 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginTop: 14,
    },
    searchInput: { flex: 1, color: colors.ink, fontSize: 14 },
    filterRow: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' },
    listPicker: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    listPickerText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
    newListButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    newListButtonText: { color: colors.onPrimary, fontSize: 13, fontWeight: '700' },
    itemsList: { marginTop: 16, paddingBottom: 24, flexGrow: 1 },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemJapanese: { fontSize: 18, fontWeight: '700', color: colors.ink },
    itemKana: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
    itemMeaning: { fontSize: 13, color: colors.ink, marginTop: 6 },
    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30 },
    emptyIconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 14 },
    emptySubtitle: {
      fontSize: 13,
      color: colors.inkMuted,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 18,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 30,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    modalOption: { paddingVertical: 12, paddingHorizontal: 4 },
    modalOptionText: { fontSize: 15, color: colors.ink, fontWeight: '600' },
    modalTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 10 },
    modalInput: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.ink,
    },
    modalCreateButton: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 12,
    },
    modalCreateButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
    disabled: { opacity: 0.5 },
  });
}