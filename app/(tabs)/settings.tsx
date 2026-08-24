import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useAppServices } from '@/services/AppServices';
import { useTheme } from '@/theme/ThemeContext';
import type { ThemeMode } from '@/storage/SettingsStorage';

const MODES: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'desktop-outline' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, setMode } = useTheme();
  const styles = makeStyles(colors);
  const { vocabularyStorage } = useAppServices();

  const [vaultSize, setVaultSize] = useState({ totalWords: 0, totalLists: 0 });
  const [busy, setBusy] = useState<'export' | 'restore' | null>(null);

  const reload = useCallback(() => {
    vocabularyStorage?.getStats().then((s) =>
      setVaultSize({ totalWords: s.totalWords, totalLists: s.totalLists })
    );
  }, [vocabularyStorage]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleExport() {
    if (!vocabularyStorage) return;
    setBusy('export');
    try {
      const data = await vocabularyStorage.exportAll();
      const fileUri = FileSystem.documentDirectory + `lingovault-backup-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data, null, 2));

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export LingoVault backup',
        });
      } else {
        Alert.alert('Backup saved', `Saved to ${fileUri}`);
      }
    } catch (e: any) {
      Alert.alert('Export failed', e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    if (!vocabularyStorage) return;
    const picked = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    setBusy('restore');
    try {
      const content = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.lists) || !Array.isArray(parsed.items)) {
        throw new Error('This file doesn\'t look like a LingoVault backup.');
      }
      const result = await vocabularyStorage.importData(parsed);
      reload();
      Alert.alert(
        'Restore complete',
        `Added ${result.importedItems} word(s) across ${result.importedLists} new list(s). Existing lists were matched by name, not duplicated.`
      );
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={18} color={colors.inkMuted} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your vault and preferences</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>
          <Text style={styles.cardSubtitle}>Customize how LingoVault looks</Text>

          <View style={styles.segmented}>
            {MODES.map((m) => (
              <Pressable
                key={m.value}
                style={[styles.segment, mode === m.value && styles.segmentActive]}
                onPress={() => setMode(m.value)}
              >
                <Ionicons
                  name={m.icon}
                  size={16}
                  color={mode === m.value ? colors.onPrimary : colors.inkMuted}
                />
                <Text
                  style={[styles.segmentText, mode === m.value && styles.segmentTextActive]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="server-outline" size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Data &amp; Backup</Text>
          </View>
          <Text style={styles.cardSubtitle}>Your data is stored securely on this device.</Text>

          <View style={styles.vaultSizeRow}>
            <Text style={styles.vaultSizeLabel}>Vault Size</Text>
            <Text style={styles.vaultSizeValue}>
              {vaultSize.totalWords} words in {vaultSize.totalLists} lists
            </Text>
          </View>

          <View style={styles.backupRow}>
            <Pressable style={styles.backupButton} onPress={handleExport} disabled={busy !== null}>
              {busy === 'export' ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <Ionicons name="download-outline" size={16} color={colors.ink} />
              )}
              <Text style={styles.backupButtonText}>Export Backup</Text>
            </Pressable>
            <Pressable style={styles.backupButton} onPress={handleRestore} disabled={busy !== null}>
              {busy === 'restore' ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={16} color={colors.ink} />
              )}
              <Text style={styles.backupButtonText}>Restore Data</Text>
            </Pressable>
          </View>
          <Text style={styles.backupCaption}>
            Restoring matches lists by name and adds any words not already present.
          </Text>
        </View>

        <View style={styles.about}>
          <View style={styles.aboutIconCircle}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.aboutTitle}>LingoVault</Text>
          <Text style={styles.aboutVersion}>Version 2.0.0 — Offline Edition</Text>
          <Text style={styles.aboutTagline}>A quiet space for your vocabulary.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    backRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 2 },
    backText: { color: colors.inkMuted, fontSize: 14 },
    title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 12, letterSpacing: 0.2 },
    subtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 2, marginBottom: 20 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: 16,
      marginBottom: 14,
    },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    cardSubtitle: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
    segmented: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 12,
      padding: 4,
      marginTop: 14,
      gap: 4,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: 9,
    },
    segmentActive: { backgroundColor: colors.primary },
    segmentText: { fontSize: 13, color: colors.inkMuted, fontWeight: '600' },
    segmentTextActive: { color: colors.onPrimary },
    vaultSizeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginTop: 14,
    },
    vaultSizeLabel: { fontSize: 13, color: colors.inkMuted },
    vaultSizeValue: { fontSize: 13, color: colors.ink, fontWeight: '600' },
    backupRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    backupButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      borderRadius: 999,
      paddingVertical: 11,
    },
    backupButtonText: { fontSize: 13, color: colors.ink, fontWeight: '600' },
    backupCaption: { fontSize: 11, color: colors.inkFaint, marginTop: 10, textAlign: 'center' },
    about: { alignItems: 'center', paddingVertical: 24 },
    aboutIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    aboutTitle: { fontSize: 15, fontWeight: '800', color: colors.ink },
    aboutVersion: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
    aboutTagline: { fontSize: 12, color: colors.inkFaint, marginTop: 6, fontStyle: 'italic' },
  });
}