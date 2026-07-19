import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  manipulateAsync,
  SaveFormat,
} from 'expo-image-manipulator';

import { api } from '@/services/api';
import { appConfig } from '@/services/config';
import { resolveMediaUrl } from '@/services/media';
import type { ProfilePhoto } from '@/types/models';
import { colors, radius } from '@/constants/theme';

const MINIMUM_PHOTOS = 2;
const RECOMMENDED_PHOTOS = 4;
const MAXIMUM_PHOTOS = 6;

type Props = {
  photos: ProfilePhoto[];
  onChange: (photos: ProfilePhoto[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
};

type UploadResponse = {
  photo: ProfilePhoto;
  profileComplete: boolean;
  bonus: number;
};

async function confirmDelete(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return globalThis.confirm?.('Delete this photo?') ?? false;
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Delete photo?',
      'This photo will be permanently removed from your profile.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

async function prepareImage(asset: ImagePicker.ImagePickerAsset) {
  const actions = asset.width > 1600 ? [{ resize: { width: 1600 } }] : [];

  return manipulateAsync(asset.uri, actions, {
    compress: 0.84,
    format: SaveFormat.JPEG,
  });
}

async function createPhotoForm(uri: string): Promise<FormData> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    form.append('photo', blob, 'profile-photo.jpg');
  } else {
    form.append(
      'photo',
      {
        uri,
        name: 'profile-photo.jpg',
        type: 'image/jpeg',
      } as unknown as Blob,
    );
  }

  return form;
}

export function ProfilePhotoManager({
  photos,
  onChange,
  onError,
  disabled = false,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);

  const canAdd = photos.length < MAXIMUM_PHOTOS;
  const remaining = Math.max(0, MAXIMUM_PHOTOS - photos.length);

  const uploadAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets.length || busy || disabled) return;

    const selected = assets.slice(0, remaining);
    if (!selected.length) {
      onError('You can upload a maximum of 6 photos.');
      return;
    }

    setBusy(true);
    onError('');

    try {
      let nextPhotos = [...photos];

      for (const asset of selected) {
        const prepared = await prepareImage(asset);

        if (appConfig.demoMode) {
          const demoPhoto: ProfilePhoto = {
            id: `demo-photo-${Date.now()}-${nextPhotos.length}`,
            photoUrl: prepared.uri,
            mimeType: 'image/jpeg',
            position: nextPhotos.length + 1,
          };
          nextPhotos = [...nextPhotos, demoPhoto];
          onChange(nextPhotos);
          continue;
        }

        const form = await createPhotoForm(prepared.uri);
        const response = await api<UploadResponse>('/profile/photos', {
          method: 'POST',
          body: form,
        });

        nextPhotos = [...nextPhotos, response.photo].sort(
          (a, b) => a.position - b.position,
        );
        onChange(nextPhotos);
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Photo upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const pickFromLibrary = async () => {
    if (!canAdd || busy || disabled) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      onError('Please allow photo-library access to add profile photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
      exif: false,
    });

    if (!result.canceled) {
      await uploadAssets(result.assets);
    }
  };

  const takePhoto = async () => {
    if (!canAdd || busy || disabled) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      onError('Please allow camera access to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 1,
      exif: false,
    });

    if (!result.canceled) {
      await uploadAssets(result.assets);
    }
  };

  const saveOrder = async (nextPhotos: ProfilePhoto[]) => {
    const normalized = nextPhotos.map((photo, index) => ({
      ...photo,
      position: index + 1,
    }));

    const previous = photos;
    onChange(normalized);

    if (appConfig.demoMode) return;

    try {
      const response = await api<{ photos: ProfilePhoto[] }>(
        '/profile/photos/order',
        {
          method: 'PATCH',
          body: JSON.stringify({
            photoIds: normalized.map((photo) => photo.id),
          }),
        },
      );
      onChange(response.photos);
    } catch (error) {
      onChange(previous);
      onError(error instanceof Error ? error.message : 'Could not reorder photos.');
    }
  };

  const movePhoto = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length || busy || disabled) return;

    const next = [...photos];
    [next[index], next[target]] = [next[target]!, next[index]!];
    await saveOrder(next);
  };

  const makePrimary = async (index: number) => {
    if (index === 0 || busy || disabled) return;
    const next = [...photos];
    const [selected] = next.splice(index, 1);
    if (!selected) return;
    next.unshift(selected);
    await saveOrder(next);
  };

  const deletePhoto = async (photo: ProfilePhoto) => {
    if (busy || disabled) return;

    if (photos.length <= MINIMUM_PHOTOS) {
      onError('Keep at least 2 photos on your profile. Add another before deleting.');
      return;
    }

    if (!(await confirmDelete())) return;

    setBusyPhotoId(photo.id);
    onError('');

    try {
      if (appConfig.demoMode) {
        const next = photos
          .filter((item) => item.id !== photo.id)
          .map((item, index) => ({ ...item, position: index + 1 }));
        onChange(next);
        return;
      }

      const response = await api<{ photos: ProfilePhoto[] }>(
        `/profile/photos/${photo.id}`,
        { method: 'DELETE' },
      );
      onChange(response.photos);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not delete photo.');
    } finally {
      setBusyPhotoId(null);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Profile photos</Text>
          <Text style={styles.subtitle}>
            {photos.length} of {MAXIMUM_PHOTOS} uploaded
          </Text>
        </View>

        <View
          style={[
            styles.countBadge,
            photos.length >= RECOMMENDED_PHOTOS && styles.countBadgeReady,
          ]}
        >
          <Text style={styles.countText}>
            {photos.length < MINIMUM_PHOTOS
              ? `${MINIMUM_PHOTOS - photos.length} required`
              : photos.length < RECOMMENDED_PHOTOS
                ? `${RECOMMENDED_PHOTOS - photos.length} recommended`
                : 'Great variety'}
          </Text>
        </View>
      </View>

      <Text style={styles.rules}>
        Minimum 2 · Recommended 4 · Maximum 6. Your first photo is your main
        profile photo.
      </Text>

      <View style={styles.grid}>
        {Array.from({ length: MAXIMUM_PHOTOS }).map((_, index) => {
          const photo = photos[index];

          if (!photo) {
            return (
              <Pressable
                key={`empty-${index}`}
                disabled={!canAdd || busy || disabled}
                onPress={pickFromLibrary}
                style={({ pressed }) => [
                  styles.emptySlot,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name="add"
                  size={28}
                  color={colors.goldBright}
                />
                <Text style={styles.emptyText}>Add photo</Text>
              </Pressable>
            );
          }

          const uri = resolveMediaUrl(photo.photoUrl) ?? photo.photoUrl;
          const isDeleting = busyPhotoId === photo.id;

          return (
            <View key={photo.id} style={styles.photoSlot}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />

              {index === 0 ? (
                <View style={styles.primaryBadge}>
                  <Ionicons name="star" size={11} color="#2A1204" />
                  <Text style={styles.primaryText}>Main</Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => makePrimary(index)}
                  style={styles.makePrimary}
                >
                  <Ionicons name="star-outline" size={14} color={colors.cream} />
                </Pressable>
              )}

              <View style={styles.photoControls}>
                <Pressable
                  disabled={index === 0 || busy || disabled}
                  onPress={() => movePhoto(index, -1)}
                  style={[styles.control, index === 0 && styles.controlDisabled]}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.text} />
                </Pressable>

                <Pressable
                  disabled={index === photos.length - 1 || busy || disabled}
                  onPress={() => movePhoto(index, 1)}
                  style={[
                    styles.control,
                    index === photos.length - 1 && styles.controlDisabled,
                  ]}
                >
                  <Ionicons name="chevron-forward" size={16} color={colors.text} />
                </Pressable>

                <Pressable
                  disabled={busy || disabled}
                  onPress={() => deletePhoto(photo)}
                  style={[styles.control, styles.deleteControl]}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Ionicons name="trash-outline" size={15} color={colors.text} />
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={!canAdd || busy || disabled}
          onPress={pickFromLibrary}
          style={({ pressed }) => [
            styles.actionButton,
            (!canAdd || busy || disabled) && styles.actionDisabled,
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#2A1204" />
          ) : (
            <Ionicons name="images-outline" size={20} color="#2A1204" />
          )}
          <Text style={styles.actionText}>
            {busy ? 'Uploading…' : 'Choose photos'}
          </Text>
        </Pressable>

        <Pressable
          disabled={!canAdd || busy || disabled}
          onPress={takePhoto}
          style={({ pressed }) => [
            styles.secondaryButton,
            (!canAdd || busy || disabled) && styles.actionDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="camera-outline" size={20} color={colors.goldBright} />
          <Text style={styles.secondaryText}>Take photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headingCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  rules: { color: colors.cream, fontSize: 12, lineHeight: 18 },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#2A1A0D',
    borderWidth: 1,
    borderColor: colors.goldDark,
  },
  countBadgeReady: {
    backgroundColor: colors.greenBg,
    borderColor: '#285B3C',
  },
  countText: { color: colors.goldBright, fontSize: 10, fontWeight: '800' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 0.8,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.goldDark,
  },
  emptySlot: {
    width: '31%',
    aspectRatio: 0.8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.goldDark,
  },
  emptyText: { color: colors.goldBright, fontSize: 11, fontWeight: '700' },
  primaryBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  primaryText: { color: '#2A1204', fontSize: 9, fontWeight: '900' },
  makePrimary: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,5,3,.8)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoControls: {
    position: 'absolute',
    left: 5,
    right: 5,
    bottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 3,
  },
  control: {
    flex: 1,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(10,5,3,.82)',
  },
  deleteControl: { backgroundColor: 'rgba(105,21,18,.9)' },
  controlDisabled: { opacity: 0.3 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  actionText: { color: '#2A1204', fontWeight: '900' },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldDark,
    backgroundColor: colors.surfaceAlt,
  },
  secondaryText: { color: colors.goldBright, fontWeight: '800' },
  actionDisabled: { opacity: 0.45 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
