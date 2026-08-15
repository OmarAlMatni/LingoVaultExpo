import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AnalyzedToken } from '@/types/translation';

export function TokenCard({ token }: { token: AnalyzedToken }) {
  return (
    <View style={[styles.card, !token.found && styles.cardNotFound]}>
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
      {token.pos.length > 0 && <Text style={styles.pos}>{token.pos.join(', ')}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ECEAF6',
  },
  cardNotFound: {
    borderColor: '#F2D9D6',
    backgroundColor: '#FFFBFA',
  },
  japanese: { fontSize: 22, fontWeight: '700', color: '#221F35' },
  kana: { fontSize: 15, color: '#6B6B7D', marginTop: 2 },
  romaji: { fontSize: 13, color: '#9A9AA8', marginTop: 1, fontStyle: 'italic' },
  meaning: { fontSize: 14, color: '#33324A', marginTop: 6 },
  notFound: { fontSize: 13, color: '#B3261E', marginTop: 6 },
  pos: {
    fontSize: 11,
    color: '#2F8F7F',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
