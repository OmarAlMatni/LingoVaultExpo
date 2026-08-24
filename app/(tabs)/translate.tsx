import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAppServices } from '@/services/AppServices';
import { useTheme } from '@/theme/ThemeContext';
import { TokenCard } from '@/components/TokenCard';
import { SaveToListRow } from '@/components/SaveToListRow';
import type { TranslationResult } from '@/types/translation';

export default function TranslateScreen() {
  const params = useLocalSearchParams<{ text?: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { translationService, ready } = useAppServices();
  const [inputText, setInputText] = useState(params.text ?? '');
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function handleAnalyze() {
    if (!translationService || !inputText.trim()) return;
    setAnalyzing(true);
    try {
      const r = await translationService.analyze(inputText);
      setResult(r);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handlePaste() {
    const text = await Clipboard.getStringAsync();
    if (text) setInputText(text);
  }

  function handleClear() {
    setInputText('');
    setResult(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {!ready && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={colors.inkMuted} />
            <Text style={styles.loadingBannerText}>
              Loading offline dictionary — this only happens once...
            </Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons name="book-outline" size={14} color={colors.inkMuted} />
          <Text style={styles.infoText}>Japanese → English · Offline</Text>
        </View>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Enter Japanese text to analyze…"
            placeholderTextColor={colors.inkFaint}
            multiline
          />
          {inputText.length > 0 && (
            <Pressable style={styles.clearIcon} onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
            </Pressable>
          )}
          <View style={styles.inputActions}>
            <Pressable style={styles.pasteButton} onPress={handlePaste} hitSlop={8}>
              <Ionicons name="clipboard-outline" size={20} color={colors.inkMuted} />
            </Pressable>
            <Pressable
              style={[
                styles.analyzeButton,
                (!inputText.trim() || analyzing || !ready) && styles.disabled,
              ]}
              onPress={handleAnalyze}
              disabled={!inputText.trim() || analyzing || !ready}
            >
              {analyzing ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              )}
            </Pressable>
          </View>
        </View>

        <ScrollView style={styles.results} showsVerticalScrollIndicator={false}>
          {result?.tokens.map((token, idx) => (
            <View key={`${token.surface}-${idx}`}>
              <TokenCard token={token} />
              {token.found && <SaveToListRow token={token} />}
            </View>
          ))}
          {result && result.tokens.length === 0 && (
            <Text style={styles.empty}>No tokens to show.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    loadingBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginTop: 12,
    },
    loadingBannerText: { color: colors.inkMuted, fontSize: 12, flex: 1 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
    infoText: { fontSize: 12, color: colors.inkMuted, fontWeight: '600' },
    inputWrap: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      marginTop: 10,
      padding: 14,
    },
    input: {
      fontSize: 17,
      minHeight: 90,
      textAlignVertical: 'top',
      color: colors.ink,
      paddingRight: 24,
    },
    clearIcon: { position: 'absolute', top: 10, right: 10 },
    inputActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
    },
    pasteButton: { padding: 6 },
    analyzeButton: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 20,
      paddingVertical: 10,
      minWidth: 92,
      alignItems: 'center',
    },
    analyzeButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
    disabled: { opacity: 0.5 },
    results: { flex: 1, marginTop: 18 },
    empty: { textAlign: 'center', color: colors.inkFaint, marginTop: 40 },
  });
}