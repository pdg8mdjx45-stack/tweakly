/**
 * Icecat Open Catalog API — free product specs and images.
 *
 * Icecat provides product datasheets for 500+ sponsoring brands (Samsung, LG,
 * Sony, Apple, ASUS, etc.) via their Open Catalog.
 *
 * Requirements:
 * - Free account at icecat.biz/registration
 * - Attribution: display "Specs Icecat" on product pages
 *
 * API: 1 product per request, queried by GTIN (EAN) or Brand+ProductCode.
 * Results are cached in AsyncStorage to avoid redundant calls.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Config ──────────────────────────────────────────────────────────────────
// To use Icecat, register at icecat.biz and replace these values.
// The demo account 'openIcecat-live' provides limited access.
const ICECAT_USERNAME = 'openIcecat-live';
const ICECAT_BASE = 'https://live.icecat.biz/api/';

const CACHE_PREFIX = 'icecat_';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days (specs don't change often)

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IcecatSpec {
  group: string;
  name: string;
  value: string;
  unit?: string;
}

export interface IcecatProduct {
  title: string;
  brand: string;
  category: string;
  shortDescription: string;
  longDescription: string;
  imageUrl: string;
  gallery: string[];
  specs: IcecatSpec[];
  specsFlat: Record<string, string>;
}

interface CacheEntry {
  data: IcecatProduct | null;
  timestamp: number;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

async function getCached(key: string): Promise<IcecatProduct | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_DURATION) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function setCache(key: string, data: IcecatProduct | null): Promise<void> {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Silently fail — cache is optional
  }
}

// ─── API ─────────────────────────────────────────────────────────────────────

function parseIcecatResponse(json: Record<string, unknown>): IcecatProduct | null {
  const data = json?.data as Record<string, unknown> | undefined;
  if (!data) return null;

  const generalInfo = data.GeneralInfo as Record<string, unknown> | undefined;
  if (!generalInfo) return null;

  const title = (generalInfo.Title as string) || '';
  const brand = ((generalInfo.Brand as string) ||
    (generalInfo.BrandInfo as Record<string, unknown>)?.BrandName as string) || '';
  const category = ((generalInfo.Category as Record<string, unknown>)?.Name as string) || '';

  const description = generalInfo.Description as Record<string, unknown> | undefined;
  const shortDescription = (description?.ShortSummaryDescription as string) || '';
  const longDescription = (description?.LongSummaryDescription as string) || '';

  // Images
  const imageData = data.Image as Record<string, unknown> | undefined;
  const imageUrl = (imageData?.HighPic as string) || (imageData?.Pic500x500 as string) || '';

  const galleryData = data.Gallery as Array<Record<string, unknown>> | undefined;
  const gallery = (galleryData || [])
    .map(g => (g.HighImg as string) || (g.LowImg as string) || '')
    .filter(Boolean);

  // Specs
  const featureGroups = data.FeaturesGroups as Array<Record<string, unknown>> | undefined;
  const specs: IcecatSpec[] = [];
  const specsFlat: Record<string, string> = {};

  if (featureGroups) {
    for (const group of featureGroups) {
      const groupName = ((group.FeatureGroup as Record<string, unknown>)?.Name as string) || '';
      const features = group.Features as Array<Record<string, unknown>> | undefined;
      if (!features) continue;

      for (const feature of features) {
        const name = (feature.Name as string) || '';
        const value = (feature.Value as string) || '';
        const measure = (feature.Measure as Record<string, unknown>);
        const unit = (measure?.Sign as string) || '';

        if (name && value && value !== 'N/A') {
          specs.push({ group: groupName, name, value, unit });
          specsFlat[name] = unit ? `${value} ${unit}` : value;
        }
      }
    }
  }

  if (!title && specs.length === 0) return null;

  return { title, brand, category, shortDescription, longDescription, imageUrl, gallery, specs, specsFlat };
}

/**
 * Fetch product data from Icecat by EAN/GTIN code.
 */
export async function fetchIcecatByEAN(ean: string): Promise<IcecatProduct | null> {
  if (!ean) return null;

  const cached = await getCached(`ean_${ean}`);
  if (cached) return cached;

  try {
    const url = `${ICECAT_BASE}?UserName=${ICECAT_USERNAME}&Language=nl&GTIN=${ean}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    const product = parseIcecatResponse(json);
    await setCache(`ean_${ean}`, product);
    return product;
  } catch {
    return null;
  }
}

/**
 * Fetch product data from Icecat by brand and product code.
 */
export async function fetchIcecatByBrandCode(brand: string, productCode: string): Promise<IcecatProduct | null> {
  if (!brand || !productCode) return null;

  const cacheKey = `bp_${brand}_${productCode}`;
  const cached = await getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `${ICECAT_BASE}?UserName=${ICECAT_USERNAME}&Language=nl&Brand=${encodeURIComponent(brand)}&ProductCode=${encodeURIComponent(productCode)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const json = await res.json();
    const product = parseIcecatResponse(json);
    await setCache(cacheKey, product);
    return product;
  } catch {
    return null;
  }
}
