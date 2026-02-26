/**
 * Product Cache — 2-layer caching for product data.
 *
 * Layer 1: In-memory Map (instant, cleared on app restart)
 * Layer 2: AsyncStorage (persists across restarts, TTL-based)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'pcache_';
const TTL_MS = 60 * 60 * 1000; // 1 hour

// Layer 1: in-memory
const memCache = new Map<string, { data: unknown; ts: number }>();

function isExpired(ts: number): boolean {
  return Date.now() - ts > TTL_MS;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const fullKey = CACHE_PREFIX + key;

  // Layer 1
  const mem = memCache.get(fullKey);
  if (mem && !isExpired(mem.ts)) return mem.data as T;

  // Layer 2
  try {
    const raw = await AsyncStorage.getItem(fullKey);
    if (raw) {
      const entry = JSON.parse(raw) as { data: T; ts: number };
      if (!isExpired(entry.ts)) {
        memCache.set(fullKey, entry);
        return entry.data;
      }
    }
  } catch { /* ignore parse errors */ }

  return null;
}

export async function getStale<T>(key: string): Promise<T | null> {
  const fullKey = CACHE_PREFIX + key;

  const mem = memCache.get(fullKey);
  if (mem) return mem.data as T;

  try {
    const raw = await AsyncStorage.getItem(fullKey);
    if (raw) {
      const entry = JSON.parse(raw) as { data: T; ts: number };
      return entry.data;
    }
  } catch { /* ignore */ }

  return null;
}

export async function setCache<T>(key: string, data: T): Promise<void> {
  const fullKey = CACHE_PREFIX + key;
  const entry = { data, ts: Date.now() };
  memCache.set(fullKey, entry);
  try {
    await AsyncStorage.setItem(fullKey, JSON.stringify(entry));
  } catch { /* storage full — memory cache still works */ }
}

export async function clearProductCache(): Promise<void> {
  memCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
  } catch { /* ignore */ }
}
