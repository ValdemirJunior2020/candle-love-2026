import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { resolveMediaUrl } from '@/services/media';

const maya = require('@/assets/profiles/maya.png');

export function Avatar({
  name,
  uri,
  size = 58,
}: {
  name: string;
  uri?: string | null;
  size?: number;
}) {
  const resolvedUri = resolveMediaUrl(uri);
  const source = resolvedUri
    ? { uri: resolvedUri }
    : name.toLowerCase() === 'maya'
      ? maya
      : null;

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {source ? (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
          {name[0]?.toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A2416',
    borderWidth: 1,
    borderColor: colors.goldDark,
  },
  initial: { color: colors.goldBright, fontWeight: '800' },
});
