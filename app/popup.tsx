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
import { useLocalSearchParams } from 'expo-router';
import { useAppServices } from '@/services/AppServices';
import { TokenCard } from '@/components/TokenCard';
import { SaveToListRow } from '@/components/SaveToListRow';
import { useTheme } from '@/theme/ThemeContext';
import type { TranslationResult } from '@/types/translation';

export default function PopupScreen() {
  const { text } = useLocalSearchParams<{ text?: string }>();

  const { translationService, ready } = useAppServices();
  const { colors } = useTheme();

  const styles = makeStyles(colors);

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
    <View style={styles.container}>

      {/* Transparent space above the popup */}
      <Pressable
        style={styles.dismissArea}
        onPress={handleClose}
      />

      {/* Small popup card */}
      <View style={styles.card}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            LingoVault
          </Text>

          <Pressable
            onPress={handleClose}
            hitSlop={12}
            style={styles.closeButton}
          >
            <Text style={styles.close}>
              ×
            </Text>
          </Pressable>
        </View>

        {!text && (
          <Text style={styles.empty}>
            No text was selected.
          </Text>
        )}

        {analyzing && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />

            <Text style={styles.loadingText}>
              Analyzing…
            </Text>
          </View>
        )}

        {!analyzing && result && (
          <ScrollView
            style={styles.results}
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
          >
            {result.tokens.map((token, idx) => (
              <View key={`${token.surface}-${idx}`}>
                <TokenCard token={token} />

                {token.found && (
                  <SaveToListRow
                    token={token}
                    compact
                  />
                )}
              </View>
            ))}
          </ScrollView>
        )}

      </View>
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useTheme>['colors']
) {
  return StyleSheet.create({

    /*
     * The native Activity may still technically occupy
     * the whole screen, but this root is transparent.
     */
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },

    /*
     * Everything above the popup is transparent.
     * Tapping it closes the popup.
     */
    dismissArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },

    /*
     * IMPORTANT:
     * No flex: 1 here.
     *
     * The card only takes the space required by its content.
     */
  card: {
  backgroundColor: colors.background,

  borderRadius: 22,

  borderWidth: 1,
  borderColor: colors.surfaceBorder,

  overflow: 'hidden',

  paddingHorizontal: 16,
  paddingTop: 10,

  width: '100%',
  maxHeight: 420,
},

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',

      marginBottom: 8,
    },

    headerTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.ink,
      letterSpacing: 0.2,
    },

    closeButton: {
      width: 36,
      height: 36,

      alignItems: 'center',
      justifyContent: 'center',
    },

    close: {
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '300',
      color: colors.inkFaint,
    },

    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',

      paddingVertical: 20,

      gap: 10,
    },

    loadingText: {
      color: colors.inkMuted,
      fontSize: 13,
    },

    /*
     * Don't use flex: 1.
     *
     * Limit the results so a large amount of selected
     * text doesn't make the popup enormous.
     */
    results: {
      maxHeight: 320,
    },

    resultsContent: {
      paddingBottom: 4,
    },

    empty: {
      color: colors.inkFaint,
      paddingVertical: 20,
      textAlign: 'center',
    },
  });
}