import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { appConfig } from '@/services/config';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/hooks/useErrorMessage';
export default function SettingsScreen() { const { logout } = useAuth(); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const remove = async () => { setError(''); try { if (!appConfig.demoMode) await api('/profile/account', { method: 'DELETE', body: JSON.stringify({ password }) }); await logout(); } catch (e) { setError(errorMessage(e)); } }; return <Screen><Text style={styles.title}>Privacy & Account</Text><View style={styles.links}><AppButton title="Privacy Policy" kind="secondary" onPress={() => Linking.openURL(appConfig.privacyUrl)}/><AppButton title="Terms of Service" kind="secondary" onPress={() => Linking.openURL(appConfig.termsUrl)}/><AppButton title="Support" kind="secondary" onPress={() => Linking.openURL(appConfig.supportUrl)}/></View><View style={styles.danger}><Text style={styles.dangerTitle}>Delete account</Text><Text style={styles.copy}>This disables your account, anonymizes your profile, revokes sessions, and removes you from discovery. Enter your password to confirm.</Text><FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry/>{error ? <Text style={styles.error}>{error}</Text> : null}<AppButton title="Delete my account" kind="danger" onPress={remove}/></View></Screen>; }
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 28, fontWeight: '900' }, links: { gap: 10 }, danger: { gap: 12, padding: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.red, backgroundColor: colors.redBg }, dangerTitle: { color: colors.red, fontSize: 20, fontWeight: '900' }, copy: { color: '#E6C4C1', lineHeight: 20 }, error: { color: colors.red } });
