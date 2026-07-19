import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { api } from '@/services/api';
import { appConfig } from '@/services/config';

type Reflection = { id: string; reflectionWeek: string; answer: string };
export default function ReflectionScreen() {
  const [answer, setAnswer] = useState(''); const [items, setItems] = useState<Reflection[]>([]); const [notice, setNotice] = useState('');
  const load = () => { if (!appConfig.demoMode) api<{ reflections: Reflection[] }>('/intentional/reflections').then((data) => setItems(data.reflections)).catch(() => {}); };
  useEffect(load, []);
  const save = async () => { if (answer.trim().length < 3) return; if (!appConfig.demoMode) await api('/intentional/reflections', { method: 'POST', body: JSON.stringify({ answer: answer.trim() }) }); setAnswer(''); setNotice('Your private reflection was saved.'); load(); };
  return <Screen keyboard><Text style={styles.title}>Weekly Candle Reflection</Text><Text style={styles.copy}>What did you learn about what you need in a relationship this week?</Text><FormField label="Private reflection" value={answer} onChangeText={setAnswer} multiline maxLength={1000} placeholder="I learned that…"/><AppButton title="Save privately" onPress={save}/>{notice ? <Text style={styles.notice}>{notice}</Text> : null}<Text style={styles.heading}>Your journal</Text>{items.map((item) => <View key={item.id} style={styles.card}><Text style={styles.week}>{String(item.reflectionWeek).slice(0,10)}</Text><Text style={styles.answer}>{item.answer}</Text></View>)}</Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 27, fontWeight: '900' }, copy: { color: colors.muted, lineHeight: 21 }, notice: { color: colors.green, fontWeight: '800' }, heading: { color: colors.goldBright, fontSize: 18, fontWeight: '900', marginTop: 8 }, card: { gap: 7, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft }, week: { color: colors.gold, fontSize: 12, fontWeight: '900' }, answer: { color: colors.cream, lineHeight: 20 } });
