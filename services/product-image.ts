/**
 * Product Image Service
 * Fetches real product photos from Wikipedia's free REST API.
 * No API key required. Results are cached in AsyncStorage for 7 days.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@tweakly:img:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** In-memory cache so we do not hit AsyncStorage on every render */
const memCache = new Map<string, string | null>();

function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

function buildNameCandidates(productName: string): string[] {
  const normalized = normalizeName(productName);
  if (!normalized) return [];

  const noYear = normalized.replace(/\b(19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
  const noParens = noYear.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  const noVariants = noParens
    .replace(/\b(Pro|Plus|Max|Ultra|Lite|SE)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const firstWords = normalized.split(' ').slice(0, 3).join(' ');

  const candidates = [normalized, noYear, noParens, noVariants, firstWords]
    .map((value) => normalizeName(value))
    .filter((value) => value.length >= 3);

  return Array.from(new Set(candidates));
}

async function fetchWikipediaSummaryImage(title: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Tweakly/1.0 (github.com/tweakly)' },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.thumbnail?.source ?? data?.originalimage?.source ?? null;
}

/**
 * Fetch a real product image from Wikipedia.
 * Returns the image URL string, or null if not found.
 */
export async function getWikipediaImageUrl(productName: string): Promise<string | null> {
  const normalizedName = normalizeName(productName);
  if (!normalizedName) return null;

  // 1. Memory cache
  if (memCache.has(normalizedName)) {
    return memCache.get(normalizedName) ?? null;
  }

  // 2. AsyncStorage cache
  const cacheKey = CACHE_PREFIX + normalizedName.toLowerCase();
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) {
      const { url, ts } = JSON.parse(raw) as { url: string | null; ts: number };
      if (Date.now() - ts < CACHE_TTL_MS) {
        memCache.set(normalizedName, url);
        return url;
      }
    }
  } catch {
    // AsyncStorage read failed - continue to fetch.
  }

  // 3. Wikipedia REST API (free, no key needed)
  let imageUrl: string | null = null;
  try {
    const candidates = buildNameCandidates(normalizedName);
    for (const candidate of candidates) {
      imageUrl = await fetchWikipediaSummaryImage(candidate);
      if (imageUrl) break;
    }
  } catch {
    // Network error - fall through to cache write.
  }

  // 4. Cache result (including misses) so we do not retry on every render
  memCache.set(normalizedName, imageUrl);
  AsyncStorage.setItem(cacheKey, JSON.stringify({ url: imageUrl, ts: Date.now() })).catch(() => {});
  return imageUrl;
}

/** Clear all cached image URLs (useful for dev/testing) */
export async function clearImageCache(): Promise<void> {
  memCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const imageKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(imageKeys);
  } catch {}
}
