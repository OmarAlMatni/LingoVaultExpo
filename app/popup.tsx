import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAppServices } from '@/services/AppServices';
import { TokenCard } from '@/components/TokenCard';
import { SaveToListRow } from '@/components/SaveToListRow';
import type { TranslationResult } from '@/types/translation';

/**
 * popup.tsx
 *
 * Reached via the `lingovault://popup?text=...` deep link that
 * TranslatePopupActivity.kt sets as its own launch intent BEFORE handing
 * control to React Native (see plugins/withProcessTextPopup.js and
 * android/.../TranslatePopupActivity.kt in the generated project). This is
 * the same JS bundle and the same registered root component as the main
 * app -- only the Activity's native theme (small, floating, dialog-style)
 * and this route's compact layout make it "look like a popup". There is no
 * second translation engine: `useAppServices()` returns the exact same
 * OfflineTranslationService/VocabularyStorage singletons the tabs use.
 */
export default function PopupScreen() {
  const { text } = useLocalSearchParams<{ text?: string }>();
  const { translationService, ready } = useAppServices();
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!ready || !translationService || !text) return;
    setAnalyzing(true);
    translationService
      .analyze(text)
      .then(setResult)
      .finally(() => setAnalyzing(false));
  }, [ready, translationService, text]);

  function handleClose() {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    }
  }

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.card} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LingoVault</Text>
          <Pressable onPress={handleClose} hitSlop={10}>
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        {!text && <Text style={styles.empty}>No text was selected.</Text>}

        {analyzing && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#2F8F7F" />
            <Text style={styles.loadingText}>Analyzing…</Text>
          </View>
        )}

        {!analyzing && result && (
          <ScrollView style={styles.results}>
            {result.tokens.map((token, idx) => (
              <View key={`${token.surface}-${idx}`}>
                <TokenCard token={token} />
                {token.found && <SaveToListRow token={token} compact />}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  card: {
    backgroundColor: '#F8F7FF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#221F35' },
  close: { fontSize: 18, color: '#9A9AA8', padding: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, gap: 8 },
  loadingText: { color: '#6B6B7D', fontSize: 13 },
  results: { paddingBottom: 20 },
  empty: { color: '#9A9AA8', paddingVertical: 20, textAlign: 'center' },
});
