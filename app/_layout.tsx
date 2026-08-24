import React from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppServicesProvider, useAppServices } from '@/services/AppServices';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="dictionary.db"
      assetSource={{ assetId: require('../assets/dictionary.db') }}
      onError={(err) => console.error('Failed to open dictionary.db', err)}
    >
      <AppServicesProvider>
        <ThemeProvider>
          <AppGate />
        </ThemeProvider>
      </AppServicesProvider>
    </SQLiteProvider>
  );
}

/**
 * Only blocks the whole app on a hard startup error. "Still initializing"
 * is NOT blocking anymore -- Home/Saved/Search work immediately, and the
 * Translate screen shows its own inline "Loading offline dictionary..."
 * banner (matching the reference screenshots) while `ready` is false,
 * rather than the previous full-screen spinner gating every screen.
 */
function AppGate() {
  const { error } = useAppServices();
  const { colors, effectiveScheme } = useTheme();
  const styles = makeStyles(colors);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>LingoVault failed to start</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="popup"
          options={{
               headerShown: false,
               animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      padding: 24,
    },
    errorTitle: { fontSize: 16, fontWeight: '600', color: colors.danger, marginBottom: 8 },
    errorBody: { fontSize: 13, color: colors.inkMuted, textAlign: 'center' },
  });
}