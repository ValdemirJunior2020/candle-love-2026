import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

type Props = React.PropsWithChildren<{ scroll?: boolean; contentStyle?: ScrollViewProps['contentContainerStyle']; keyboard?: boolean }>;
export function Screen({ children, scroll = true, contentStyle, keyboard = false }: Props) {
  const content = scroll ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, contentStyle]}>{children}</ScrollView> : <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>;
  const body = keyboard ? <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{content}</KeyboardAvoidingView> : content;
  return <LinearGradient colors={['#0A0503', '#170B05', '#080504']} style={styles.flex}><SafeAreaView style={styles.safe}>{body}</SafeAreaView></LinearGradient>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, safe: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 560, backgroundColor: colors.background }, content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 120, gap: 14 } });
