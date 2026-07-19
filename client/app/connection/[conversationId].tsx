import { useEffect, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { api } from '@/services/api';
import { appConfig } from '@/services/config';

type Stage = 'spark'|'glow'|'flame'|'ready_to_meet'|'date_planned';
type Journey = { stage: Stage; sharedPrompt?: string | null; gracefulClosedAt?: string | null };
const STAGES: { key: Stage; title: string; subtitle: string }[] = [
  { key: 'spark', title: 'Spark', subtitle: 'You chose each other.' },
  { key: 'glow', title: 'Glow', subtitle: 'A meaningful conversation has started.' },
  { key: 'flame', title: 'Flame', subtitle: 'Trust and consistency are growing.' },
  { key: 'ready_to_meet', title: 'Ready to meet', subtitle: 'You both feel ready for a safe first date.' },
  { key: 'date_planned', title: 'Date planned', subtitle: 'Your safe-date details are ready.' },
];

export default function ConnectionJourneyScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [journey, setJourney] = useState<Journey | null>(null); const [notice, setNotice] = useState('');
  const load = () => { if (!appConfig.demoMode) api<{ journey: Journey }>(`/intentional/journey/${conversationId}`).then((d) => setJourney(d.journey)).catch(() => {}); };
  useEffect(load, [conversationId]);
  const setStage = async (stage: Stage) => { if (!appConfig.demoMode) await api(`/intentional/journey/${conversationId}`, { method: 'PATCH', body: JSON.stringify({ stage }) }); setJourney((current) => ({ ...(current ?? { stage }), stage })); setNotice('Connection stage updated.'); };
  const goodbye = async () => { const message = 'Thank you for the conversation. I do not feel the connection I am looking for, and I wish you well.'; if (!appConfig.demoMode) await api(`/intentional/journey/${conversationId}/goodbye`, { method: 'POST', body: JSON.stringify({ reason: 'not_a_match', message }) }); setNotice('The connection was closed kindly.'); setTimeout(() => router.replace('/(tabs)/matches'), 800); };
  return <Screen><Text style={styles.title}>Spark → Glow → Flame</Text><Text style={styles.copy}>This journey is not a score. It is a shared way to notice when trust and intention are growing.</Text>{journey?.sharedPrompt ? <View style={styles.prompt}><Ionicons name="sparkles" color={colors.gold} size={20}/><Text style={styles.promptText}>{journey.sharedPrompt}</Text></View> : null}{STAGES.map((stage, index) => { const activeIndex = STAGES.findIndex((item) => item.key === journey?.stage); const active = index <= activeIndex; return <Pressable key={stage.key} onPress={() => setStage(stage.key)} style={[styles.stage, active && styles.stageActive]}><View style={[styles.circle, active && styles.circleActive]}><Text style={styles.circleText}>{index + 1}</Text></View><View style={{ flex: 1 }}><Text style={styles.stageTitle}>{stage.title}</Text><Text style={styles.stageSubtitle}>{stage.subtitle}</Text></View>{journey?.stage === stage.key ? <Ionicons name="flame" color={colors.goldBright} size={23}/> : null}</Pressable>; })}<AppButton title="Plan a safe date" onPress={() => router.push({ pathname: '/safe-date', params: { conversationId } })}/><AppButton title="Close this connection kindly" kind="secondary" onPress={goodbye}/>{notice ? <Text style={styles.notice}>{notice}</Text> : null}</Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 27, fontWeight: '900' }, copy: { color: colors.muted, lineHeight: 21 }, prompt: { flexDirection: 'row', gap: 10, padding: 15, borderRadius: radius.md, borderWidth: 1, borderColor: colors.goldDark, backgroundColor: '#241508' }, promptText: { color: colors.cream, flex: 1, lineHeight: 20, fontWeight: '700' }, stage: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface }, stageActive: { borderColor: colors.goldDark, backgroundColor: '#21140B' }, circle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt }, circleActive: { backgroundColor: colors.gold }, circleText: { color: '#2A1204', fontWeight: '900' }, stageTitle: { color: colors.text, fontWeight: '900' }, stageSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 }, notice: { color: colors.green, textAlign: 'center', fontWeight: '800' } });
