import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, radius, shadow } from '@/constants/theme';
import { resolveMediaUrl } from '@/services/media';
import type { Profile } from '@/types/models';

const maya = require('@/assets/profiles/maya.png');

export function ProfileCard({ profile }: { profile: Profile }) {
  const [photoState, setPhotoState] = useState({ profileId: profile.id, index: 0 });
  const photoIndex = photoState.profileId === profile.id ? photoState.index : 0;

  const photoUrls = useMemo(() => {
    const fromGallery = (profile.photos ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((photo) => resolveMediaUrl(photo.photoUrl))
      .filter((value): value is string => Boolean(value));

    if (fromGallery.length) return fromGallery;

    const main = resolveMediaUrl(profile.photoUrl);
    return main ? [main] : [];
  }, [profile.photoUrl, profile.photos]);

  const currentPhoto = photoUrls[photoIndex] ?? photoUrls[0] ?? null;
  const source = currentPhoto
    ? { uri: currentPhoto }
    : profile.id === 'maya'
      ? maya
      : null;

  const previousPhoto = () => {
    setPhotoState({
      profileId: profile.id,
      index: photoIndex <= 0 ? photoUrls.length - 1 : photoIndex - 1,
    });
  };

  const nextPhoto = () => {
    setPhotoState({
      profileId: profile.id,
      index: photoIndex >= photoUrls.length - 1 ? 0 : photoIndex + 1,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.photo}>
        {source ? (
          <Image
            source={source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <LinearGradient
            colors={['#765034', '#2A1710']}
            style={styles.fallback}
          >
            <Text style={styles.initial}>{profile.displayName[0]}</Text>
          </LinearGradient>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(4,2,1,.96)']}
          style={styles.overlay}
        />

        {photoUrls.length > 1 ? (
          <>
            <Pressable
              accessibilityLabel="Previous photo"
              onPress={previousPhoto}
              style={({ pressed }) => [
                styles.photoArrow,
                styles.photoArrowLeft,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="chevron-back" size={25} color={colors.text} />
            </Pressable>

            <Pressable
              accessibilityLabel="Next photo"
              onPress={nextPhoto}
              style={({ pressed }) => [
                styles.photoArrow,
                styles.photoArrowRight,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="chevron-forward" size={25} color={colors.text} />
            </Pressable>

            <View style={styles.dots}>
              {photoUrls.map((_, index) => (
                <View
                  key={`${profile.id}-photo-${index}`}
                  style={[styles.dot, index === photoIndex && styles.dotActive]}
                />
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {profile.displayName}, {profile.age}
            </Text>
            {profile.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={21}
                color={colors.blue}
              />
            ) : null}
          </View>

          <Text style={styles.city}>{profile.city}</Text>
          <Text style={styles.bio}>{profile.bio}</Text>

          <View style={styles.tags}>
            {profile.interests.map((item) => (
              <View key={item} style={styles.tag}>
                <Text style={styles.tagText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.compatibility}>
        <View style={styles.compatibilityHeader}>
          <Text style={styles.compatibilityTitle}>Why this person?</Text>
          <Text style={styles.compatibilityScore}>{profile.compatibilityScore ?? 78}% aligned</Text>
        </View>
        {(profile.compatibilityReasons ?? []).map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <Ionicons name="checkmark-circle" size={15} color={colors.green} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
        {profile.voiceIntroUrl ? (
          <View style={styles.voiceBadge}>
            <Ionicons name="mic" size={15} color={colors.goldBright} />
            <Text style={styles.voiceText}>Voice Candle available</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.prompt}>
        <Ionicons name="sparkles" size={16} color={colors.gold} />
        <View style={styles.promptCopy}>
          <Text style={styles.promptLabel}>A spark worth knowing</Text>
          <Text style={styles.promptText}>{profile.promptAnswer}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  photo: {
    height: 480,
    position: 'relative',
    backgroundColor: colors.surfaceAlt,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 120,
    color: colors.goldBright,
    fontWeight: '300',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  photoArrow: {
    position: 'absolute',
    top: '42%',
    width: 42,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(10,5,3,.55)',
  },
  photoArrowLeft: { left: 8 },
  photoArrowRight: { right: 8 },
  pressed: { opacity: 0.65, transform: [{ scale: 0.96 }] },
  dots: {
    position: 'absolute',
    top: 13,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 24,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,.35)',
  },
  dotActive: { backgroundColor: colors.goldBright },
  meta: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    gap: 7,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  name: { color: colors.text, fontSize: 30, fontWeight: '900' },
  city: { color: colors.goldBright, fontWeight: '700' },
  bio: { color: colors.cream, fontSize: 15, lineHeight: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    borderWidth: 1,
    borderColor: colors.goldDark,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: 'rgba(20,10,5,.72)',
  },
  tagText: { color: colors.cream, fontSize: 12 },
  compatibility: { padding: 16, gap: 8, backgroundColor: '#18100B', borderTopWidth: 1, borderTopColor: colors.borderSoft },
  compatibilityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compatibilityTitle: { color: colors.text, fontWeight: '900', fontSize: 15 },
  compatibilityScore: { color: colors.goldBright, fontWeight: '900', fontSize: 12 },
  reasonRow: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  reasonText: { color: colors.cream, flex: 1, fontSize: 12, lineHeight: 18 },
  voiceBadge: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.goldDark, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  voiceText: { color: colors.goldBright, fontSize: 11, fontWeight: '800' },
  prompt: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: '#100A07',
  },
  promptCopy: { flex: 1 },
  promptLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  promptText: { color: colors.text, marginTop: 4, lineHeight: 20 },
});
