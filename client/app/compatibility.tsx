import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { api } from '@/services/api';
import { appConfig } from '@/services/config';

type Question = { key: string; label: string };
type Answer = { questionKey: string; answerValue: number; importance: number };

export default function CompatibilityScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (appConfig.demoMode) return;
    api<{ questions: Question[]; answers: Answer[] }>('/intentional/compatibility').then((data) => {
      setQuestions(data.questions);
      setAnswers(Object.fromEntries(data.answers.map((answer) => [answer.questionKey, answer.answerValue])));
    }).catch(() => {});
  }, []);
  const save = async () => {
    const payload = questions.map((question) => ({ questionKey: question.key, answerValue: answers[question.key] ?? 3, importance: 4 }));
    if (!appConfig.demoMode) await api('/intentional/compatibility', { method: 'PUT', body: JSON.stringify({ answers: payload }) });
    setNotice('Compatibility compass saved.');
  };
  return <Screen><Text style={styles.title}>Compatibility Compass</Text><Text style={styles.copy}>Choose how strongly each statement describes you. Your exact answers stay private; matches only see an alignment summary.</Text>{questions.map((question) => <View key={question.key} style={styles.card}><Text style={styles.question}>{question.label}</Text><View style={styles.scale}>{[1,2,3,4,5].map((value) => <AppButton key={value} title={String(value)} kind={(answers[question.key] ?? 3) === value ? 'primary' : 'secondary'} onPress={() => setAnswers((current) => ({ ...current, [question.key]: value }))}/>)}</View><Text style={styles.hint}>1 = not like me · 5 = very much like me</Text></View>)}{notice ? <Text style={styles.notice}>{notice}</Text> : null}<AppButton title="Save compatibility" onPress={save}/></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 27, fontWeight: '900' }, copy: { color: colors.muted, lineHeight: 21 }, card: { gap: 11, padding: 15, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface }, question: { color: colors.text, fontWeight: '800', lineHeight: 21 }, scale: { flexDirection: 'row', gap: 7 }, hint: { color: colors.muted, fontSize: 11 }, notice: { color: colors.green, fontWeight: '800' } });
