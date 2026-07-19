import { useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import { FormField } from '@/components/FormField';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/hooks/useErrorMessage';
import { appConfig } from '@/services/config';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@candlelove.app');
  const [password, setPassword] = useState('CandleLove123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(normalizedEmail, password);
      router.replace('/(tabs)/discover');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard contentStyle={styles.page}>
      <BrandMark style={styles.brand} />

      <View style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.copy}>
          Pick up where your conversations left off.
        </Text>

        {appConfig.demoMode ? (
          <Text style={styles.demo}>
            Demo mode is on. Any email and password will work.
          </Text>
        ) : null}

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton title="Sign in" loading={loading} onPress={submit} />

        <Text style={styles.footer}>
          New to Candle Love?{' '}
          <Link href="/(auth)/register" style={styles.link}>
            Create an account
          </Link>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    justifyContent: 'center',
    minHeight: '100%',
    paddingVertical: 32,
  },
  brand: { marginBottom: 20 },
  card: {
    backgroundColor: colors.surface,
    padding: 22,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  copy: { color: colors.muted, lineHeight: 20 },
  demo: {
    color: colors.goldBright,
    backgroundColor: '#2A1A0D',
    padding: 10,
    borderRadius: 10,
    fontSize: 12,
  },
  error: { color: colors.red, lineHeight: 20 },
  footer: { color: colors.muted, textAlign: 'center' },
  link: { color: colors.gold, fontWeight: '800' },
});
