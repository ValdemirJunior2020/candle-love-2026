import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  api,
  getRefreshToken,
  hydrateTokens,
  saveTokens,
} from '@/services/api';
import { appConfig } from '@/services/config';
import { demoUser } from '@/services/demo';
import type { ProfilePhoto, User } from '@/types/models';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(input: {
    displayName: string;
    email: string;
    password: string;
    birthDate: string;
    acceptedTerms: true;
  }): Promise<void>;
  logout(): Promise<void>;
  refreshUser(): Promise<void>;
  setUser(user: User | null): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizePhoto(raw: Record<string, unknown>, index: number): ProfilePhoto {
  return {
    id: String(raw.id ?? `photo-${index}`),
    photoUrl: String(raw.photoUrl ?? raw.photo_url ?? ''),
    mimeType: raw.mimeType ? String(raw.mimeType) : undefined,
    position: Number(raw.position ?? index + 1),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

function normalize(raw: Record<string, unknown>): User {
  const rawPhotos = Array.isArray(raw.photos)
    ? raw.photos.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object',
      )
    : [];

  const photos = rawPhotos
    .map(normalizePhoto)
    .filter((photo) => photo.photoUrl)
    .sort((a, b) => a.position - b.position);

  const mainPhoto =
    photos[0]?.photoUrl ??
    (raw.photoUrl ? String(raw.photoUrl) : null) ??
    (raw.photo_url ? String(raw.photo_url) : null);

  return {
    id: String(raw.id),
    email: String(raw.email),
    displayName: String(raw.displayName ?? raw.display_name ?? ''),
    birthDate: raw.birthDate
      ? String(raw.birthDate)
      : raw.birth_date
        ? String(raw.birth_date)
        : undefined,
    verified: Boolean(raw.verified),
    trustLevel: Number(raw.trustLevel ?? raw.trust_level ?? 0),
    bio: String(raw.bio ?? ''),
    city: String(raw.city ?? ''),
    photoUrl: mainPhoto,
    photos,
    intentions: (raw.intentions as User['intentions']) ?? 'relationship',
    interests: Array.isArray(raw.interests)
      ? raw.interests.map(String)
      : [],
    promptAnswer: String(raw.promptAnswer ?? raw.prompt_answer ?? ''),
    profileComplete: Boolean(
      raw.profileComplete ?? raw.profile_complete ?? false,
    ),
    sparkBalance: Number(raw.sparkBalance ?? raw.spark_balance ?? 0),
  };
}

export function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (appConfig.demoMode) {
      setUser(demoUser);
      return;
    }

    const data = await api<{ user: Record<string, unknown> }>('/auth/me');
    setUser(normalize(data.user));
  };

  useEffect(() => {
    (async () => {
      try {
        await hydrateTokens();
        await refreshUser();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    if (appConfig.demoMode) {
      setUser({ ...demoUser, email });
      return;
    }

    const data = await api<{
      user: Record<string, unknown>;
      session: { accessToken: string; refreshToken: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    await saveTokens(data.session);
    await refreshUser();
  };

  const register = async (input: {
    displayName: string;
    email: string;
    password: string;
    birthDate: string;
    acceptedTerms: true;
  }) => {
    if (appConfig.demoMode) {
      setUser({
        ...demoUser,
        displayName: input.displayName,
        email: input.email,
        birthDate: input.birthDate,
      });
      return;
    }

    const data = await api<{
      user: Record<string, unknown>;
      session: { accessToken: string; refreshToken: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    await saveTokens(data.session);
    await refreshUser();
  };

  const logout = async () => {
    try {
      if (!appConfig.demoMode) {
        await api('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: getRefreshToken() }),
        });
      }
    } finally {
      await saveTokens(null);
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      setUser,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
