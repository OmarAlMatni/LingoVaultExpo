import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppServices } from '@/services/AppServices';
import type { Settings } from '@/storage/SettingsStorage';

const ROTATION_OPTIONS: { label: string; value: Settings['widgetRotationMinutes'] }[] = [
  { label: '30 sec', value: 0.5 },
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '1 hour', value: 60 },
];

export default function SettingsScreen() {
  const { settingsStorage } = useAppServices();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    settingsStorage.load().then(setSettings);
  }, [settingsStorage]);

  async function setRotation(value: Settings['widgetRotationMinutes']) {
    const next = await settingsStorage.update({ widgetRotationMinutes: value });
    setSettings(next);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionTitle}>Widget rotation interval</Text>
      <Text style={styles.sectionHint}>
        How often a home-screen widget advances to the next saved word. (Widgets themselves are
        Phase 3 -- not implemented yet. This setting is wired up now so the widget code has
        something real to read once it exists.)
      </Text>
      <View style={styles.optionsRow}>
        {ROTATION_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            style={[
              styles.option,
              settings?.widgetRotationMinutes === opt.value && styles.optionActive,
            ]}
            onPress={() => setRotation(opt.value)}
          >
            <Text
              style={[
                styles.optionText,
                settings?.widgetRotationMinutes === opt.value && styles.optionTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>About</Text>
      <Text style={styles.aboutText}>
        LingoVault works fully offline. Tokenization runs entirely on-device (TinySegmenter), and
        the Japanese-English dictionary is a bundled local database -- no network requests are
        made for translation, saving, or PROCESS_TEXT.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF', paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#221F35', marginTop: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#221F35', marginTop: 8 },
  sectionHint: { fontSize: 12, color: '#9A9AA8', marginTop: 4, lineHeight: 17 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEAF6',
  },
  optionActive: { backgroundColor: '#2F8F7F', borderColor: '#2F8F7F' },
  optionText: { fontSize: 13, color: '#4A4A5E', fontWeight: '600' },
  optionTextActive: { color: '#FFFFFF' },
  aboutText: { fontSize: 13, color: '#5B5B6B', marginTop: 8, lineHeight: 19 },
});
