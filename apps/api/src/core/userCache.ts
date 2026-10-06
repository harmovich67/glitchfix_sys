/**
 * Short-lived cache of the authenticated user row. Every API request resolves the session user,
 * and with a remote database that lookup alone costs a full network round-trip. Writers call
 * invalidateUser() so changes apply immediately on this instance; other serverless instances
 * pick them up when the entry expires.
 */
const TTL_MS = 15_000;
const MAX_ENTRIES = 500;

interface Entry<T> {
  value: T;
  expires: number;
}

const cache = new Map<string, Entry<unknown>>();

export function getCachedUser<T>(id: string): T | undefined {
  const hit = cache.get(id);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    cache.delete(id);
    return undefined;
  }
  return hit.value as T;
}

export function setCachedUser<T>(id: string, value: T) {
  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(id, { value, expires: Date.now() + TTL_MS });
}

export function invalidateUser(id: string) {
  cache.delete(id);
}
