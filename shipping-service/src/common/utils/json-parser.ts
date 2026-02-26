/* eslint-disable @typescript-eslint/no-unsafe-return */
export function safeJsonParse<T = any>(
  value: string,
  fallback: T | null = null,
): T | null {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
