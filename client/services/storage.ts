export type SessionTokens = { accessToken: string; refreshToken: string };
const noop = async () => null as SessionTokens | null;
export const sessionStorage = { get: noop, set: async (_value: SessionTokens) => {}, clear: async () => {} };
