import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import { Avatar } from '@/components/Avatar';
import { EmptyView } from '@/components/StateView';
import { api } from '@/services/api';
import { appConfig } from '@/services/config';
import { demoMatches } from '@/services/demo';
import type { Match } from '@/types/models';
import { colors, radius } from '@/constants/theme';
export default function MessagesScreen() { const [items, setItems] = useState<Match[]>(demoMatches); useEffect(() => { if (!appConfig.demoMode) api<{ matches: Match[] }>('/discover/matches').then(d => setItems(d.matches)).catch(() => setItems([])); }, []); return <Screen><View style={styles.heading}><BrandMark compact/><Text style={styles.title}>Messages</Text></View>{items.length ? items.map(item => <Pressable key={item.id} onPress={() => router.push({ pathname: '/messages/[conversationId]', params: { conversationId: item.conversationId, userId: item.userId, displayName: item.displayName } })} style={styles.row}><Avatar name={item.displayName} uri={item.photoUrl}/><View style={styles.meta}><Text style={styles.name}>{item.displayName}</Text><Text numberOfLines={1} style={styles.preview}>{item.unlockedAt ? 'Your candle is lit. Keep the conversation going.' : `${Math.max(0, item.freeMessageLimit - item.messageCount)} free messages left`}</Text></View><Ionicons name={item.unlockedAt ? 'flame' : 'lock-closed-outline'} color={item.unlockedAt ? colors.gold : colors.muted} size={21}/></Pressable>) : <EmptyView icon="chatbubbles-outline" title="Your inbox is quiet" message="When a Spark becomes mutual, your conversation appears here."/>}</Screen>; }
const styles = StyleSheet.create({ heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { color: colors.text, fontSize: 27, fontWeight: '900' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.md }, meta: { flex: 1, gap: 4 }, name: { color: colors.text, fontSize: 16, fontWeight: '800' }, preview: { color: colors.muted, fontSize: 13 } });
