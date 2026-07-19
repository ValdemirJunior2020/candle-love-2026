import { useState } from 'react';
import { router } from 'expo-router';
import {
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { appConfig } from '@/services/config';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/hooks/useErrorMessage';

export default function SettingsScreen() {
  const { logout } = useAuth();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const openPrivacyPolicy = () => {
    router.push('/privacy');
  };

  const openTerms = async () => {
    await Linking.openURL(appConfig.termsUrl);
  };

  const openSupport = async () => {
    const subject = encodeURIComponent(
      'Candle Love Support Request',
    );

    const emailUrl =
      `mailto:${appConfig.supportEmail}?subject=${subject}`;

    const supported = await Linking.canOpenURL(emailUrl);

    if (supported) {
      await Linking.openURL(emailUrl);
      return;
    }

    await Linking.openURL(appConfig.supportUrl);
  };

  const remove = async () => {
    if (deleting) {
      return;
    }

    setError('');

    if (!appConfig.demoMode && !password) {
      setError(
        'Enter your password before deleting your account.',
      );
      return;
    }

    setDeleting(true);

    try {
      if (!appConfig.demoMode) {
        await api('/profile/account', {
          method: 'DELETE',
          body: JSON.stringify({
            password,
          }),
        });
      }

      await logout();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen contentStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Privacy & Account</Text>

        <Text style={styles.subtitle}>
          Manage your legal information, support options, and
          Candle Love account.
        </Text>
      </View>

      <View style={styles.links}>
        <AppButton
          title="Privacy Policy"
          kind="secondary"
          onPress={openPrivacyPolicy}
        />

        <AppButton
          title="Terms of Service"
          kind="secondary"
          onPress={openTerms}
        />

        <AppButton
          title="Contact Support"
          kind="secondary"
          onPress={openSupport}
        />
      </View>

      <View style={styles.danger}>
        <Text style={styles.dangerTitle}>
          Delete account
        </Text>

        <Text style={styles.copy}>
          This disables your account, anonymizes your profile,
          revokes your sessions, and removes you from discovery.
          Enter your password to confirm.
        </Text>

        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
        />

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        <AppButton
          title="Delete my account"
          kind="danger"
          loading={deleting}
          onPress={remove}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 20,
  },

  header: {
    gap: 6,
    marginBottom: 4,
  },

  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },

  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },

  links: {
    gap: 10,
  },

  danger: {
    gap: 12,
    padding: 16,
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.red,
    backgroundColor: colors.redBg,
  },

  dangerTitle: {
    color: colors.red,
    fontSize: 20,
    fontWeight: '900',
  },

  copy: {
    color: '#E6C4C1',
    fontSize: 14,
    lineHeight: 21,
  },

  error: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 20,
  },
});