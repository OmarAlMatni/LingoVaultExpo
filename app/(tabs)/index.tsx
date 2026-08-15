import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useAppServices } from '@/services/AppServices';

export default function HomeScreen() {
  const router = useRouter();
  const { vocabularyStorage } = useAppServices();
  const [totalSaved, setTotalSaved] = useState(0);

  useEffect(() => {
    vocabularyStorage?.getItems().then((items) => setTotalSaved(items.length));
  }, [vocabularyStorage]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>LingoVault</Text>
      <Text style={styles.subtitle}>Offline Japanese analyzer &amp; vocabulary trainer</Text>

      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{totalSaved}</Text>
        <Text style={styles.statLabel}>words saved</Text>
      </View>

      <Pressable style={styles.cta} onPress={() => router.push('/(tabs)/translate')}>
        <Text style={styles.ctaText}>Analyze Japanese text</Text>
      </Pressable>

      <Text style={styles.hint}>
        Tip: select Japanese text in any other app and tap "LingoVault" in the share menu for an
        instant translation popup — no need to open the app.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#221F35', marginTop: 12 },
  subtitle: { fontSize: 14, color: '#6B6B7D', marginTop: 4 },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginTop: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEAF6',
  },
  statNumber: { fontSize: 36, fontWeight: '800', color: '#2F8F7F' },
  statLabel: { fontSize: 13, color: '#9A9AA8', marginTop: 2 },
  cta: {
    marginTop: 24,
    backgroundColor: '#2F8F7F',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  hint: { fontSize: 12, color: '#9A9AA8', marginTop: 20, lineHeight: 18 },
});
