import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { FormField } from '@/components/FormField';
import { AppButton } from '@/components/AppButton';
import { ProfilePhotoManager } from '@/components/ProfilePhotoManager';
import { colors, radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { appConfig } from '@/services/config';
import { errorMessage } from '@/hooks/useErrorMessage';
import type { ProfilePhoto } from '@/types/models';

export default function EditProfileScreen() {
  const { user, setUser, refreshUser } = useAuth();

  const [city, setCity] = useState(user?.city ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [interests, setInterests] = useState(
    (user?.interests ?? []).join(', '),
  );
  const [promptAnswer, setPrompt] = useState(user?.promptAnswer ?? '');
  const [photos, setPhotos] = useState<ProfilePhoto[]>(
    (user?.photos ?? []).slice().sort((a, b) => a.position - b.position),
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhotosChange = (nextPhotos: ProfilePhoto[]) => {
    const normalized = nextPhotos
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((photo, index) => ({ ...photo, position: index + 1 }));

    setPhotos(normalized);
    setError('');

    if (user) {
      setUser({
        ...user,
        photos: normalized,
        photoUrl: normalized[0]?.photoUrl ?? null,
      });
    }
  };

  const save = async () => {
    if (!user || loading) return;

    setLoading(true);
    setError('');
    setNotice('');

    const parsedInterests = interests
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 10);

    const payload = {
      city: city.trim(),
      bio: bio.trim(),
      interests: parsedInterests,
      promptAnswer: promptAnswer.trim(),
      intentions: user.intentions ?? 'relationship',
    };

    try {
      if (appConfig.demoMode) {
        const profileComplete =
          payload.bio.length >= 20 &&
          payload.city.length >= 2 &&
          payload.interests.length >= 3 &&
          payload.promptAnswer.length >= 10 &&
          photos.length >= 2;

        setUser({
          ...user,
          ...payload,
          photos,
          photoUrl: photos[0]?.photoUrl ?? null,
          profileComplete,
        });
      } else {
        const response = await api<{
          profile: { profileComplete: boolean };
          bonus: number;
        }>('/profile/', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        await refreshUser();

        if (response.bonus > 0) {
          setNotice(`Profile completed! You earned ${response.bonus} Sparks.`);
          return;
        }
      }

      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Screen keyboard>
      <Text style={styles.title}>Make your profile feel real</Text>
      <Text style={styles.copy}>
        Add at least 2 clear photos. Four photos are recommended, and you can
        upload up to 6.
      </Text>

      <ProfilePhotoManager
        photos={photos}
        onChange={handlePhotosChange}
        onError={setError}
        disabled={loading}
      />

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>About you</Text>

        <FormField
          label="City"
          value={city}
          onChangeText={setCity}
          placeholder="Miami, FL"
          maxLength={100}
        />

        <FormField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={500}
          placeholder="Tell people what makes time with you meaningful."
        />

        <FormField
          label="Interests (comma separated)"
          value={interests}
          onChangeText={setInterests}
          placeholder="Coffee, Travel, Live Music"
        />

        <FormField
          label="Profile prompt answer"
          value={promptAnswer}
          onChangeText={setPrompt}
          multiline
          maxLength={300}
          placeholder="A spark worth knowing…"
        />
      </View>

      {photos.length < 2 ? (
        <View style={styles.requirement}>
          <Text style={styles.requirementTitle}>Add 2 photos to go live</Text>
          <Text style={styles.requirementText}>
            You can save your answers now, but your profile will stay hidden
            from Discover until at least 2 photos are uploaded.
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <AppButton title="Save profile" loading={loading} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
  },
  copy: {
    color: colors.muted,
    lineHeight: 20,
  },
  formSection: {
    gap: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  requirement: {
    padding: 13,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldDark,
    backgroundColor: '#2A1A0D',
  },
  requirementTitle: {
    color: colors.goldBright,
    fontWeight: '900',
  },
  requirementText: {
    color: colors.cream,
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: colors.red,
    lineHeight: 20,
  },
  notice: {
    color: colors.green,
    lineHeight: 20,
    fontWeight: '700',
  },
});
