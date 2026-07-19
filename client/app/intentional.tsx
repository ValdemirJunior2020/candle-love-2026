import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import { colors, radius } from '@/constants/theme';
import { api } from '@/services/api';
import { appConfig } from '@/services/config';

type Dashboard = {
  compatibilityComplete: boolean;
  reflectionCount: number;
  voiceIntroUrl?: string | null;
  introductionsRemaining: number;
  trustShield: { emailVerified: boolean; voiceIntro: boolean; respectfulStanding: boolean; trustLevel: number };
};

export default function IntentionalHubScreen() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  useEffect(() => {
    if (!appConfig.demoMode) api<Dashboard>('/intentional/dashboard').then(setDashboard).catch(() => setDashboard(null));
  }, []);

  const rows = [
    { icon: 'heart-circle-outline' as const, title: 'Compatibility compass', subtitle: dashboard?.compatibilityComplete ? 'Your values are ready for matching' : 'Answer 8 meaningful questions', route: '/compatibility' as const },
    { icon: 'mic-outline' as const, title: 'Voice Candle', subtitle: dashboard?.voiceIntroUrl ? 'Your 20-second introduction is live' : 'Let people hear your warmth', route: '/voice-intro' as const },
    { icon: 'book-outline' as const, title: 'Weekly reflection', subtitle: `${dashboard?.reflectionCount ?? 0} private reflections saved`, route: '/reflection' as const },
  ];

  return (
    <Screen>
      <BrandMark compact />
      <View style={styles.hero}>
        <Ionicons name="flame" color={colors.goldBright} size={34} />
        <Text style={styles.title}>Your Slow-Burn Journey</Text>
        <Text style={styles.copy}>A spark starts the connection. Conversation creates the glow. Trust turns it into a flame.</Text>
        <View style={styles.remaining}><Text style={styles.remainingText}>{dashboard?.introductionsRemaining ?? 3} intentional introductions remaining today</Text></View>
      </View>

      <View style={styles.trustCard}>
        <Text style={styles.sectionTitle}>Trust Shield</Text>
        <Check label="Email verified" active={Boolean(dashboard?.trustShield.emailVerified)} />
        <Check label="Voice introduction" active={Boolean(dashboard?.trustShield.voiceIntro)} />
        <Check label="Respectful standing" active={dashboard?.trustShield.respectfulStanding !== false} />
      </View>

      {rows.map((row) => (
        <Pressable key={row.title} onPress={() => router.push(row.route)} style={styles.row}>
          <Ionicons name={row.icon} color={colors.gold} size={24} />
          <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowSubtitle}>{row.subtitle}</Text></View>
          <Ionicons name="chevron-forward" color={colors.muted} size={18} />
        </Pressable>
      ))}
    </Screen>
  );
}

function Check({ label, active }: { label: string; active: boolean }) {
  return <View style={styles.check}><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} color={active ? colors.green : colors.muted} size={18}/><Text style={styles.checkText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 9, padding: 20, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#21140B' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', textAlign: 'center' },
  copy: { color: colors.cream, textAlign: 'center', lineHeight: 21 },
  remaining: { marginTop: 5, borderRadius: radius.pill, backgroundColor: colors.gold, paddingHorizontal: 13, paddingVertical: 7 },
  remainingText: { color: '#2A1204', fontWeight: '900', fontSize: 11 },
  trustCard: { gap: 9, padding: 16, borderRadius: radius.md, backgroundColor: colors.greenBg, borderWidth: 1, borderColor: '#285B3C' },
  sectionTitle: { color: colors.green, fontWeight: '900', fontSize: 18 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkText: { color: '#C7E7D2' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  rowTitle: { color: colors.text, fontWeight: '900' },
  rowSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
