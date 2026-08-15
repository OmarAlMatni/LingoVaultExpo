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
import { useAppServices } from '@/services/AppServices';
import { TokenCard } from '@/components/TokenCard';
import { SaveToListRow } from '@/components/SaveToListRow';
import type { TranslationResult } from '@/types/translation';

export default function TranslateScreen() {
  const params = useLocalSearchParams<{ text?: string }>();
  const { translationService } = useAppServices();
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
        <Text style={styles.title}>Translate</Text>

        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="日本語を入力してください..."
          placeholderTextColor="#B4B4C4"
          multiline
        />

        <View style={styles.buttonRow}>
          <Pressable style={styles.secondaryButton} onPress={handleClear}>
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryButton, (!inputText.trim() || analyzing) && styles.disabled]}
            onPress={handleAnalyze}
            disabled={!inputText.trim() || analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Analyze</Text>
            )}
          </Pressable>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8F7FF', paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#221F35', marginTop: 12, marginBottom: 12 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECEAF6',
    padding: 14,
    fontSize: 18,
    minHeight: 90,
    textAlignVertical: 'top',
    color: '#221F35',
  },
  buttonRow: { flexDirection: 'row', marginTop: 12, gap: 10 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2F8F7F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEAF6',
  },
  secondaryButtonText: { color: '#6B6B7D', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  results: { flex: 1, marginTop: 18 },
  empty: { textAlign: 'center', color: '#9A9AA8', marginTop: 40 },
});
