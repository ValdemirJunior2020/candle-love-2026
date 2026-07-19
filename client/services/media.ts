import { appConfig } from './config';

export function resolveMediaUrl(value?: string | null): string | null {
  if (!value) return null;

  if (/^(https?:|data:|blob:|file:)/i.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${appConfig.apiUrl}${value}`;
  }

  return `${appConfig.apiUrl}/${value}`;
}
