import { useState } from 'react';
import { Link, router } from 'expo-router';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { BrandMark } from '@/components/BrandMark';
import { FormField } from '@/components/FormField';
import { AppButton } from '@/components/AppButton';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/hooks/useErrorMessage';
import { appConfig } from '@/services/config';

type FieldName =
  | 'displayName'
  | 'birthDate'
  | 'email'
  | 'password'
  | 'accepted';

type FieldErrors = Partial<
  Record<FieldName, string>
>;

type ParsedBirthDate = {
  year: number;
  month: number;
  day: number;
};

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBirthDate(
  value: string,
): ParsedBirthDate | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      value.trim(),
    );

  if (!match) {
    return null;
  }

  const yearText = match[1];
  const monthText = match[2];
  const dayText = match[3];

  if (
    !yearText ||
    !monthText ||
    !dayText
  ) {
    return null;
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
    ),
  );

  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isRealDate) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
}

function calculateAge(
  birthDate: string,
): number | null {
  const parsedDate =
    parseBirthDate(birthDate);

  if (!parsedDate) {
    return null;
  }

  const {
    year,
    month,
    day,
  } = parsedDate;

  const today = new Date();

  const currentYear =
    today.getUTCFullYear();

  const currentMonth =
    today.getUTCMonth() + 1;

  const currentDay =
    today.getUTCDate();

  let age = currentYear - year;

  const birthdayHasPassed =
    currentMonth > month ||
    (currentMonth === month &&
      currentDay >= day);

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age;
}

function getApiErrorCode(
  error: unknown,
): string | undefined {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('code' in error)
  ) {
    return undefined;
  }

  const possibleCode = (
    error as {
      code?: unknown;
    }
  ).code;

  return typeof possibleCode === 'string'
    ? possibleCode
    : undefined;
}

export default function RegisterScreen() {
  const { register } = useAuth();

  const [
    displayName,
    setDisplayName,
  ] = useState('');

  const [
    birthDate,
    setBirthDate,
  ] = useState('');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [accepted, setAccepted] =
    useState(false);

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<FieldErrors>({});

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const clearFieldError = (
    field: FieldName,
  ) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = {
        ...current,
      };

      delete next[field];

      return next;
    });

    setError('');
  };

  const validateForm = (): boolean => {
    const nextErrors: FieldErrors = {};

    const cleanName =
      displayName.trim();

    const cleanBirthDate =
      birthDate.trim();

    const cleanEmail =
      email.trim().toLowerCase();

    const age =
      calculateAge(cleanBirthDate);

    if (cleanName.length < 2) {
      nextErrors.displayName =
        'Enter at least 2 characters for your name.';
    } else if (
      cleanName.length > 50
    ) {
      nextErrors.displayName =
        'Your name cannot exceed 50 characters.';
    }

    if (!cleanBirthDate) {
      nextErrors.birthDate =
        'Enter your birth date.';
    } else if (age === null) {
      nextErrors.birthDate =
        'Enter a valid date using YYYY-MM-DD.';
    } else if (age < 18) {
      nextErrors.birthDate =
        'You must be at least 18 years old.';
    }

    if (!cleanEmail) {
      nextErrors.email =
        'Enter your email address.';
    } else if (
      !EMAIL_PATTERN.test(cleanEmail)
    ) {
      nextErrors.email =
        'Enter a valid email address.';
    }

    if (!password) {
      nextErrors.password =
        'Create a password.';
    } else if (
      password.length < 10
    ) {
      nextErrors.password =
        `Your password needs at least 10 characters. You currently have ${password.length}.`;
    } else if (
      password.length > 128
    ) {
      nextErrors.password =
        'Your password cannot exceed 128 characters.';
    }

    if (!accepted) {
      nextErrors.accepted =
        'You must confirm that you are 18 or older and accept the safety rules.';
    }

    setFieldErrors(nextErrors);

    if (
      Object.keys(nextErrors).length > 0
    ) {
      setError(
        'Please correct the highlighted information.',
      );

      return false;
    }

    setError('');
    return true;
  };

  const submit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register({
        displayName:
          displayName.trim(),
        birthDate:
          birthDate.trim(),
        email:
          email.trim().toLowerCase(),
        password,
        acceptedTerms: true,
      });

      router.replace(
        '/(tabs)/discover',
      );
    } catch (caughtError) {
      const code =
        getApiErrorCode(caughtError);

      if (code === 'EMAIL_IN_USE') {
        setFieldErrors((current) => ({
          ...current,
          email:
            'An account already uses this email address.',
        }));

        setError(
          'Use another email address or sign in to your existing account.',
        );

        return;
      }

      if (code === 'ADULTS_ONLY') {
        setFieldErrors((current) => ({
          ...current,
          birthDate:
            'Candle Love is only available to adults age 18 and older.',
        }));

        setError(
          'You must be at least 18 years old to create an account.',
        );

        return;
      }

      if (code === 'INVALID_INPUT') {
        setError(
          'Please check your name, birth date, email, and password.',
        );

        return;
      }

      if (
        code === 'RATE_LIMITED' ||
        code === 'TOO_MANY_REQUESTS'
      ) {
        setError(
          'Too many attempts. Please wait a moment and try again.',
        );

        return;
      }

      setError(
        errorMessage(caughtError),
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordIsLongEnough =
    password.length >= 10;

  return (
    <Screen keyboard>
      <BrandMark />

      <View style={styles.card}>
        <Text style={styles.title}>
          Start with a real spark
        </Text>

        <Text style={styles.copy}>
          Adults only. Every account
          starts with 25 Sparks.
        </Text>

        <View style={styles.fieldGroup}>
          <FormField
            label="First name"
            value={displayName}
            onChangeText={(value) => {
              setDisplayName(value);
              clearFieldError(
                'displayName',
              );
            }}
            autoComplete="name"
          />

          {fieldErrors.displayName ? (
            <Text
              style={styles.fieldError}
            >
              {
                fieldErrors.displayName
              }
            </Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <FormField
            label="Birth date (YYYY-MM-DD)"
            value={birthDate}
            onChangeText={(value) => {
              setBirthDate(value);
              clearFieldError(
                'birthDate',
              );
            }}
            placeholder="1990-08-24"
            keyboardType="numbers-and-punctuation"
          />

          <Text style={styles.helper}>
            Example: 1990-08-24
          </Text>

          {fieldErrors.birthDate ? (
            <Text
              style={styles.fieldError}
            >
              {fieldErrors.birthDate}
            </Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <FormField
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              clearFieldError('email');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          {fieldErrors.email ? (
            <Text
              style={styles.fieldError}
            >
              {fieldErrors.email}
            </Text>
          ) : null}
        </View>

        <View style={styles.fieldGroup}>
          <FormField
            label="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              clearFieldError(
                'password',
              );
            }}
            secureTextEntry
            autoCapitalize="none"
          />

          <View
            style={styles.passwordRule}
          >
            <Ionicons
              name={
                passwordIsLongEnough
                  ? 'checkmark-circle'
                  : 'ellipse-outline'
              }
              size={18}
              color={
                passwordIsLongEnough
                  ? colors.gold
                  : colors.muted
              }
            />

            <Text
              style={[
                styles.helper,
                passwordIsLongEnough &&
                  styles.validRule,
              ]}
            >
              At least 10 characters —{' '}
              {password.length}/10
            </Text>
          </View>

          {fieldErrors.password ? (
            <Text
              style={styles.fieldError}
            >
              {fieldErrors.password}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => {
            setAccepted(
              (current) => !current,
            );

            clearFieldError('accepted');
          }}
          style={styles.checkRow}
          accessibilityRole="checkbox"
          accessibilityState={{
            checked: accepted,
          }}
        >
          <Ionicons
            name={
              accepted
                ? 'checkbox'
                : 'square-outline'
            }
            size={24}
            color={
              accepted
                ? colors.gold
                : colors.muted
            }
          />

          <Text
            style={styles.checkText}
          >
            I’m 18 or older and agree
            to the zero-tolerance safety
            rules.
          </Text>
        </Pressable>

        {fieldErrors.accepted ? (
          <Text style={styles.fieldError}>
            {fieldErrors.accepted}
          </Text>
        ) : null}

        <View style={styles.legalRow}>
          <Text
            onPress={() =>
              Linking.openURL(
                appConfig.termsUrl,
              )
            }
            style={styles.link}
          >
            Terms of Service
          </Text>

          <Text style={styles.dot}>
            •
          </Text>

          <Text
            onPress={() =>
              Linking.openURL(
                appConfig.privacyUrl,
              )
            }
            style={styles.link}
          >
            Privacy Policy
          </Text>
        </View>

        {error ? (
          <View
            style={styles.errorBox}
            accessibilityLiveRegion="polite"
          >
            <Ionicons
              name="alert-circle"
              size={20}
              color={colors.red}
            />

            <Text style={styles.error}>
              {error}
            </Text>
          </View>
        ) : null}

        <AppButton
          title="Create my account"
          loading={loading}
          onPress={submit}
        />

        <Text style={styles.footer}>
          Already have an account?{' '}
          <Link
            href="/(auth)/login"
            style={styles.link}
          >
            Sign in
          </Link>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 22,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },

  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },

  copy: {
    color: colors.muted,
    lineHeight: 20,
  },

  fieldGroup: {
    gap: 6,
  },

  helper: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },

  validRule: {
    color: colors.gold,
    fontWeight: '700',
  },

  passwordRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  fieldError: {
    color: colors.red,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },

  checkRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },

  checkText: {
    color: colors.cream,
    lineHeight: 19,
    flex: 1,
  },

  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: radius.md,
    padding: 12,
  },

  error: {
    color: colors.red,
    flex: 1,
    lineHeight: 19,
  },

  footer: {
    color: colors.muted,
    textAlign: 'center',
  },

  dot: {
    color: colors.muted,
  },

  link: {
    color: colors.gold,
    fontWeight: '800',
  },
});