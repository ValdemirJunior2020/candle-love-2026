import { appConfig } from './config';
import { sessionStorage, type SessionTokens } from './storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Please sign in to continue.',
  SESSION_EXPIRED: 'Your session expired. Please sign in again.',
  INVALID_CREDENTIALS: 'That email or password is incorrect.',
  EMAIL_IN_USE: 'An account already uses that email.',
  ADULTS_ONLY: 'Candle Love is only for adults age 18 and older.',
  INSUFFICIENT_SPARKS: 'You need more Sparks for that.',
  CHAT_LOCKED: 'Your free messages are used. Light the Candle to continue.',
  MESSAGE_BLOCKED: 'That message did not pass our safety check.',
  PHOTO_REQUIRED: 'Choose a photo first.',
  PHOTO_TOO_LARGE: 'That photo is too large. Choose an image under 8 MB.',
  UNSUPPORTED_PHOTO_TYPE: 'Use a JPG, PNG, or WebP photo.',
  MAXIMUM_SIX_PHOTOS: 'You can upload a maximum of 6 photos.',
  MINIMUM_TWO_PHOTOS: 'Keep at least 2 photos on your profile.',
  INVALID_PHOTO_ORDER: 'The photo order could not be saved.',
  PHOTO_NOT_FOUND: 'That photo could not be found.',
};

let tokens: SessionTokens | null = null;

export async function hydrateTokens() {
  tokens = await sessionStorage.get();
  return tokens;
}

export async function saveTokens(next: SessionTokens | null) {
  tokens = next;
  if (next) await sessionStorage.set(next);
  else await sessionStorage.clear();
}

export function getAccessToken() {
  return tokens?.accessToken ?? null;
}

export function getRefreshToken() {
  return tokens?.refreshToken ?? null;
}

async function parse(response: Response) {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: 'INVALID_RESPONSE', message: text };
  }
}

async function refreshSession(): Promise<boolean> {
  if (!tokens?.refreshToken) return false;

  const response = await fetch(`${appConfig.apiUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  });

  const data = (await parse(response)) as
    | { session?: SessionTokens }
    | undefined;

  if (!response.ok || !data?.session) {
    await saveTokens(null);
    return false;
  }

  await saveTokens(data.session);
  return true;
}

function isFormDataBody(body: BodyInit | null | undefined): boolean {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.apiTimeout);

  try {
    const formData = isFormDataBody(init.body);
    const response = await fetch(
      `${appConfig.apiUrl}/api${path.startsWith('/') ? path : `/${path}`}`,
      {
        ...init,
        signal: controller.signal,
        headers: {
          ...(!formData ? { 'Content-Type': 'application/json' } : {}),
          ...(tokens?.accessToken
            ? { Authorization: `Bearer ${tokens.accessToken}` }
            : {}),
          ...(init.headers || {}),
        },
      },
    );

    if (response.status === 401 && retry && (await refreshSession())) {
      return api<T>(path, init, false);
    }

    const data = (await parse(response)) as Record<string, unknown> | undefined;

    if (!response.ok) {
      const code =
        typeof data?.error === 'string'
          ? data.error
          : `HTTP_${response.status}`;
      const message =
        typeof data?.message === 'string'
          ? data.message
          : messages[code] || 'Something went wrong. Please try again.';

      throw new ApiError(response.status, code, message, data?.details);
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        408,
        'TIMEOUT',
        'The server took too long to respond.',
      );
    }

    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Could not reach ${appConfig.apiUrl}. Check the server and API URL.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
