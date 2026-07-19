import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
export function LoadingView({ label = 'Lighting the candles…' }: { label?: string }) { return <View style={styles.wrap}><ActivityIndicator size="large" color={colors.gold}/><Text style={styles.text}>{label}</Text></View>; }
export function EmptyView({ icon = 'flame-outline', title, message }: { icon?: keyof typeof Ionicons.glyphMap; title: string; message: string }) { return <View style={styles.wrap}><Ionicons name={icon} color={colors.gold} size={42}/><Text style={styles.title}>{title}</Text><Text style={styles.text}>{message}</Text></View>; }
const styles = StyleSheet.create({ wrap: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 28 }, title: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center' }, text: { color: colors.muted, textAlign: 'center', lineHeight: 20 } });
