import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { api } from '@/services/api';
import { appConfig } from '@/services/config';

export default function SafeDateScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [venueName, setVenueName] = useState(''); const [venueAddress, setVenueAddress] = useState(''); const [startsAt, setStartsAt] = useState(''); const [contactName, setContactName] = useState(''); const [contactPhone, setContactPhone] = useState(''); const [notice, setNotice] = useState('');
  const save = async () => { const parsed = new Date(startsAt); if (!venueName.trim() || Number.isNaN(parsed.getTime())) { setNotice('Add a venue and a valid date such as 2026-08-20 19:00.'); return; } if (!appConfig.demoMode) await api(`/intentional/safe-dates/${conversationId}`, { method: 'POST', body: JSON.stringify({ venueName: venueName.trim(), venueAddress: venueAddress.trim(), startsAt: parsed.toISOString(), trustedContactName: contactName.trim(), trustedContactPhone: contactPhone.trim() }) }); setNotice('Safe date created. Your trusted contact details remain private.'); };
  return <Screen keyboard><Text style={styles.title}>Candle Check-In</Text><Text style={styles.copy}>Save the date details and a trusted contact. Your match will never see who receives your private safety information.</Text><View style={styles.card}><FormField label="Public venue" value={venueName} onChangeText={setVenueName} placeholder="Coffee shop or restaurant"/><FormField label="Venue address" value={venueAddress} onChangeText={setVenueAddress} placeholder="Public location"/><FormField label="Date and time" value={startsAt} onChangeText={setStartsAt} placeholder="2026-08-20 19:00"/><FormField label="Trusted contact name" value={contactName} onChangeText={setContactName}/><FormField label="Trusted contact phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad"/></View><AppButton title="Create safe date" onPress={save}/>{notice ? <Text style={styles.notice}>{notice}</Text> : null}<View style={styles.safety}><Text style={styles.safetyTitle}>During the date</Text><Text style={styles.safetyText}>Use “I’m safe” when everything is okay. Use the Safety Center or emergency services if you feel at risk.</Text></View></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 27, fontWeight: '900' }, copy: { color: colors.muted, lineHeight: 21 }, card: { gap: 13, padding: 15, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface }, notice: { color: colors.green, fontWeight: '800', lineHeight: 20 }, safety: { padding: 15, borderRadius: radius.md, borderWidth: 1, borderColor: '#285B3C', backgroundColor: colors.greenBg }, safetyTitle: { color: colors.green, fontWeight: '900' }, safetyText: { color: '#C7E7D2', marginTop: 5, lineHeight: 19 } });
