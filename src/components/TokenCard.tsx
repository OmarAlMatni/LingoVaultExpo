import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { AnalyzedToken } from '@/types/translation';

export function TokenCard({ token }: { token: AnalyzedToken }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={[styles.card, !token.found && styles.cardNotFound]}>
      <View style={styles.accentBar} />
      <View style={styles.body}>
        <Text style={styles.japanese}>{token.surface}</Text>
        {token.kana !== token.surface && <Text style={styles.kana}>{token.kana}</Text>}
        <Text style={styles.romaji}>{token.romaji}</Text>
        {token.found ? (
          <Text style={styles.meaning} numberOfLines={2}>
            {token.meanings.slice(0, 3).join('; ')}
          </Text>
        ) : (
          <Text style={styles.notFound}>Not in dictionary</Text>
        )}
        {token.pos.length > 0 && <Text style={styles.pos}>{token.pos.join(' · ')}</Text>}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
    },
    cardNotFound: { borderColor: colors.dangerSoft },
    accentBar: { width: 4, backgroundColor: colors.primary },
    body: { flex: 1, padding: 14 },
    japanese: { fontSize: 23, fontWeight: '700', color: colors.ink },
    kana: { fontSize: 15, color: colors.inkMuted, marginTop: 2 },
    romaji: { fontSize: 13, color: colors.inkFaint, marginTop: 1, fontStyle: 'italic' },
    meaning: { fontSize: 14, color: colors.ink, marginTop: 6 },
    notFound: { fontSize: 13, color: colors.danger, marginTop: 6 },
    pos: {
      fontSize: 11,
      color: colors.primary,
      marginTop: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      fontWeight: '600',
    },
  });
}