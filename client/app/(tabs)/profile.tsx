import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import { Avatar } from '@/components/Avatar';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const photoCount = user.photos?.length ?? 0;
  const photoStatus =
    photoCount < 2
      ? `${photoCount}/6 photos · add ${2 - photoCount} required`
      : photoCount < 4
        ? `${photoCount}/6 photos · 4 recommended`
        : `${photoCount}/6 photos`;

  const rows: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    onPress: () => void;
  }[] = [
    {
      icon: 'flame-outline',
      title: 'Slow-Burn Journey',
      subtitle: 'Compatibility, Voice Candle, reflections',
      onPress: () => router.push('/intentional'),
    },
    {
      icon: 'create-outline',
      title: 'Edit profile',
      subtitle: `${photoStatus} · bio and interests`,
      onPress: () => router.push('/profile/edit'),
    },
    {
      icon: 'wallet-outline',
      title: 'Spark wallet',
      subtitle: `${user.sparkBalance ?? 0} Sparks available`,
      onPress: () => router.push('/wallet'),
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Safety center',
      subtitle: 'Block, report, community rules',
      onPress: () => router.push('/safety'),
    },
    {
      icon: 'settings-outline',
      title: 'Privacy and account',
      subtitle: 'Terms, privacy, delete account',
      onPress: () => router.push('/settings'),
    },
  ];

  return (
    <Screen>
      <BrandMark />

      <View style={styles.identity}>
        <Avatar name={user.displayName} uri={user.photoUrl} size={72} />

        <View style={styles.identityCopy}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.displayName}</Text>
            {user.verified ? (
              <Ionicons name="checkmark-circle" color={colors.blue} size={18} />
            ) : null}
          </View>

          <Text style={styles.city}>{user.city || 'Add your city'}</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {user.profileComplete
                ? 'Profile complete'
                : 'Finish your profile +10 Sparks'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.trust}>
        <Ionicons name="shield-checkmark" color={colors.green} size={24} />
        <View style={styles.trustCopy}>
          <Text style={styles.trustTitle}>
            Trust Shield:{' '}
            {user.trustLevel && user.trustLevel > 1 ? 'Strong' : 'Building'}
          </Text>
          <Text style={styles.trustText}>
            Respectful behavior helps protect your standing.
          </Text>
        </View>
      </View>

      {rows.map((row) => (
        <Pressable key={row.title} onPress={row.onPress} style={styles.row}>
          <Ionicons name={row.icon} color={colors.gold} size={22} />
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>{row.title}</Text>
            <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" color={colors.muted} size={18} />
        </Pressable>
      ))}

      <Pressable onPress={logout} style={styles.row}>
        <Ionicons name="log-out-outline" color={colors.red} size={22} />
        <Text style={[styles.rowTitle, styles.signOut]}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  identityCopy: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { color: colors.text, fontSize: 18, fontWeight: '900' },
  city: { color: colors.muted, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: 7,
  },
  badgeText: { color: '#2A1204', fontSize: 10, fontWeight: '900' },
  trust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.greenBg,
    borderColor: '#285B3C',
    borderWidth: 1,
    borderRadius: radius.md,
  },
  trustCopy: { flex: 1 },
  trustTitle: { color: colors.green, fontWeight: '900' },
  trustText: { color: '#B7D8C3', fontSize: 12, marginTop: 3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    padding: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
  },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontWeight: '800' },
  rowSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  signOut: { flex: 1 },
});
