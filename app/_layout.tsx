import React from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppServicesProvider, useAppServices } from '@/services/AppServices';

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="dictionary.db"
      assetSource={{ assetId: require('../assets/dictionary.db') }}
      onError={(err) => console.error('Failed to open dictionary.db', err)}
    >
      <AppServicesProvider>
        <StatusBar style="dark" />
        <AppGate />
      </AppServicesProvider>
    </SQLiteProvider>
  );
}

/**
 * Blocks rendering the real navigator until the tokenizer + dictionary +
 * vocabulary storage have all finished initializing (see AppServices.tsx).
 * Per spec section 17 ("show an appropriate loading state, keep the UI
 * responsive"), rather than letting screens render with a null service and
 * crash or silently do nothing.
 */
function AppGate() {
  const { ready, error } = useAppServices();

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>LingoVault failed to start</Text>
        <Text style={styles.errorBody}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2F8F7F" />
        <Text style={styles.loadingText}>Loading dictionary…</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="popup"
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F7FF',
    padding: 24,
  },
  loadingText: { marginTop: 12, color: '#5B5B6B', fontSize: 14 },
  errorTitle: { fontSize: 16, fontWeight: '600', color: '#B3261E', marginBottom: 8 },
  errorBody: { fontSize: 13, color: '#5B5B6B', textAlign: 'center' },
});
