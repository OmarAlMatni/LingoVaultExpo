import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppServices } from '@/services/AppServices';
import { useTheme } from '@/theme/ThemeContext';
import type { VocabularyItem } from '@/types/vocabulary';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { vocabularyStorage } = useAppServices();

  const [query, setQuery] = useState(params.q ?? '');
  const [results, setResults] = useState<VocabularyItem[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!vocabularyStorage || !query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    let cancelled = false;
    vocabularyStorage.searchItems(query.trim()).then((r) => {
      if (!cancelled) {
        setResults(r);
        setSearched(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [vocabularyStorage, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Search</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.inkFaint} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search saved vocabulary..."
          placeholderTextColor={colors.inkFaint}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.resultsList}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <Text style={styles.itemJapanese}>{item.japanese}</Text>
            <Text style={styles.itemKana}>
              {item.kana} · {item.romaji}
            </Text>
            <Text style={styles.itemMeaning}>{item.englishMeanings.join('; ')}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={searched ? 'search-outline' : 'sparkles-outline'}
              size={26}
              color={colors.inkFaint}
            />
            <Text style={styles.emptyText}>
              {searched
                ? 'No saved words match your search.'
                : 'Search your saved vocabulary by Japanese, kana, romaji, or meaning.'}
            </Text>
          </View>
        }
      />
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
    resultsList: { marginTop: 16, paddingBottom: 24, flexGrow: 1 },
    itemCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
    },
    itemJapanese: { fontSize: 18, fontWeight: '700', color: colors.ink },
    itemKana: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
    itemMeaning: { fontSize: 13, color: colors.ink, marginTop: 6 },
    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 30, gap: 10 },
    emptyText: { fontSize: 13, color: colors.inkMuted, textAlign: 'center', lineHeight: 18 },
  });
}