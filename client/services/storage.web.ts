import type { SessionTokens } from './storage';
const KEY = 'candle-love-session';
export const sessionStorage = {
  async get(): Promise<SessionTokens | null> { if (typeof window === 'undefined') return null; const raw = window.localStorage.getItem(KEY); return raw ? JSON.parse(raw) as SessionTokens : null; },
  async set(value: SessionTokens): Promise<void> { window.localStorage.setItem(KEY, JSON.stringify(value)); },
  async clear(): Promise<void> { if (typeof window !== 'undefined') window.localStorage.removeItem(KEY); }
};
