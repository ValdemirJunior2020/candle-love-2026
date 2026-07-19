import * as SecureStore from 'expo-secure-store';
import type { SessionTokens } from './storage';
const KEY = 'candle-love-session';
export const sessionStorage = {
  async get(): Promise<SessionTokens | null> { const raw = await SecureStore.getItemAsync(KEY); return raw ? JSON.parse(raw) as SessionTokens : null; },
  async set(value: SessionTokens): Promise<void> { await SecureStore.setItemAsync(KEY, JSON.stringify(value), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); },
  async clear(): Promise<void> { await SecureStore.deleteItemAsync(KEY); }
};
