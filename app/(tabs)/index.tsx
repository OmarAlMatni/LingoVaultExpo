import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppServices } from '@/services/AppServices';
import { useTheme } from '@/theme/ThemeContext';
import type { VocabularyItem } from '@/types/vocabulary';

const RECENT_LIMIT = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { vocabularyStorage } = useAppServices();
  const [stats, setStats] = useState({ totalWords: 0, totalFavorites: 0, totalLists: 0 });
  const [recent, setRecent] = useState<VocabularyItem[]>([]);
  const [searchText, setSearchText] = useState('');

  const reload = useCallback(async () => {
    if (!vocabularyStorage) return;
    const [s, items] = await Promise.all([
      vocabularyStorage.getStats(),
      vocabularyStorage.getItems(),
    ]);
    setStats(s);
    setRecent(items.slice(0, RECENT_LIMIT));
  }, [vocabularyStorage]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  function handleSearchSubmit() {
    if (!searchText.trim()) return;
    router.push({ pathname: '/(tabs)/search', params: { q: searchText.trim() } });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.brand}>LingoVault</Text>
        <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
          <Ionicons name="settings-outline" size={22} color={colors.inkMuted} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.inkFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your vocabulary..."
          placeholderTextColor={colors.inkFaint}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.totalWords}</Text>
          <Text style={styles.statLabel}>Words</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.amber }]}>{stats.totalFavorites}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: colors.ink }]}>{stats.totalLists}</Text>
          <Text style={styles.statLabel}>Lists</Text>
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="time-outline" size={16} color={colors.ink} />
          <Text style={styles.sectionTitle}>Recently Saved</Text>
        </View>
        {recent.length > 0 && (
          <Pressable
            style={styles.viewAllRow}
            onPress={() => router.push('/(tabs)/saved')}
            hitSlop={8}
          >
            <Text style={styles.viewAllText}>View all</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {recent.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="book-outline" size={30} color={colors.inkFaint} />
          <Text style={styles.emptyTitle}>Your vault is empty</Text>
          <Text style={styles.emptySubtitle}>
            Start building your vocabulary by translating new words.
          </Text>
          <Pressable style={styles.emptyButton} onPress={() => router.push('/(tabs)/translate')}>
            <Text style={styles.emptyButtonText}>Translate a word</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={recent}
          keyExtractor={(i) => i.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.recentCard}>
              <Text style={styles.recentJapanese}>{item.japanese}</Text>
              <Text style={styles.recentMeaning} numberOfLines={1}>
                {item.englishMeanings.join('; ')}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    brand: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: 0.2 },
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
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingVertical: 16,
      alignItems: 'center',
    },
    statNumber: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 12, color: colors.inkMuted, marginTop: 4 },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 12,
    },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    viewAllRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    viewAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderStyle: 'dashed',
      paddingVertical: 32,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.ink, marginTop: 10 },
    emptySubtitle: {
      fontSize: 13,
      color: colors.inkMuted,
      textAlign: 'center',
      marginTop: 4,
      lineHeight: 18,
    },
    emptyButton: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginTop: 16,
    },
    emptyButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
    recentCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: 12,
      marginBottom: 8,
    },
    recentJapanese: { fontSize: 16, fontWeight: '700', color: colors.ink },
    recentMeaning: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  });
}