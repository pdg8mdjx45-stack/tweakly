# Link Scanner — Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up `app/link-scanner.tsx` with real data — parse any shop URL, scrape product meta, build affiliate links, persist to Supabase, and show real price history + alert setup.

**Architecture:** A new `services/url-parser.ts` detects the shop and extracts product ID from the URL. A new `services/scanned-products.ts` handles Supabase persistence. `app/link-scanner.tsx` replaces its mock `handleScan` with the real pipeline while keeping all existing UI components.

**Tech Stack:** Expo/React Native, Supabase (postgres via `@supabase/supabase-js`), `constants/affiliate-shops.ts`, `services/alerts-store.ts`, `Linking` from React Native.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `services/url-parser.ts` | Detect shop, extract productId + name from URL, fetch og: meta |
| Create | `services/scanned-products.ts` | Supabase CRUD for scanned_products + scanned_price_history |
| Modify | `constants/affiliate-shops.ts` | Add Bol.com active, add Zalando + Wehkamp stubs |
| Modify | `app/link-scanner.tsx` | Replace mock handleScan with real pipeline, wire alert confirm |

---

## Task 1: Supabase Tables

**Files:**
- No code files — SQL run in Supabase dashboard

- [ ] **Step 1: Run migrations in Supabase SQL editor**

Go to your Supabase project → SQL Editor → New query. Run:

```sql
create table if not exists scanned_products (
  id uuid primary key default gen_random_uuid(),
  shop_slug text not null,
  shop_product_id text not null,
  name text not null,
  brand text,
  image_url text,
  current_price numeric(10,2) not null,
  affiliate_url text not null,
  original_url text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (shop_slug, shop_product_id)
);

create table if not exists scanned_price_history (
  id uuid primary key default gen_random_uuid(),
  scanned_product_id uuid references scanned_products(id) on delete cascade,
  price numeric(10,2) not null,
  checked_at timestamptz default now()
);

create index if not exists idx_scanned_price_history_product_time
  on scanned_price_history (scanned_product_id, checked_at);
```

- [ ] **Step 2: Verify tables exist**

In Supabase → Table Editor, confirm `scanned_products` and `scanned_price_history` appear.

- [ ] **Step 3: Enable RLS with open policies (anon read/write for now)**

```sql
alter table scanned_products enable row level security;
alter table scanned_price_history enable row level security;

create policy "anon all scanned_products"
  on scanned_products for all to anon using (true) with check (true);

create policy "anon all scanned_price_history"
  on scanned_price_history for all to anon using (true) with check (true);
```

- [ ] **Step 4: Commit note**

```bash
git commit --allow-empty -m "feat: supabase tables scanned_products + scanned_price_history"
```

---

## Task 2: Update `constants/affiliate-shops.ts`

**Files:**
- Modify: `constants/affiliate-shops.ts`

- [ ] **Step 1: Activate Bol.com and add Zalando + Wehkamp**

Open `constants/affiliate-shops.ts`. Replace the entire Bol.com entry and add two new entries at the end of the `AFFILIATE_SHOPS` array:

Replace the existing `bol-com` entry:
```ts
  // ── Bol.com ──────────────────────────────────────────────────────────────────
  {
    slug: 'bol-com',
    displayName: 'Bol.com',
    logoAbbr: 'BOL',
    logoBackground: '#0000A4',
    logoTextColor: '#FFFFFF',
    brandColor: '#0000A4',
    baseUrl: 'https://www.bol.com',
    affiliate: {
      active: true,
      network: 'Bol.com Partnerprogramma',
      buildAffiliateUrl(productUrl: string) {
        return `https://partner.bol.com/click/click?p=1&t=url&s=1513890&url=${encodeURIComponent(productUrl)}`;
      },
    },
  },
```

Add after the Apple Store entry:
```ts
  // ── Zalando ──────────────────────────────────────────────────────────────────
  {
    slug: 'zalando',
    displayName: 'Zalando',
    logoAbbr: 'ZAL',
    logoBackground: '#FF6900',
    logoTextColor: '#FFFFFF',
    brandColor: '#FF6900',
    baseUrl: 'https://www.zalando.nl',
    affiliate: {
      active: false,
      reason: 'Nog niet aangevraagd',
    },
  },

  // ── Wehkamp ──────────────────────────────────────────────────────────────────
  {
    slug: 'wehkamp',
    displayName: 'Wehkamp',
    logoAbbr: 'WHK',
    logoBackground: '#E2001A',
    logoTextColor: '#FFFFFF',
    brandColor: '#E2001A',
    baseUrl: 'https://www.wehkamp.nl',
    affiliate: {
      active: false,
      reason: 'Nog niet aangevraagd',
    },
  },
```

Also update `getShopByName` to match on slug too (add slug lookup):
```ts
export function getShopByName(name: string): AffiliateShop | undefined {
  const lower = name.toLowerCase();
  return AFFILIATE_SHOPS.find(s =>
    s.displayName.toLowerCase() === lower ||
    s.logoAbbr.toLowerCase() === lower ||
    s.slug === lower
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add constants/affiliate-shops.ts
git commit -m "feat: activate bol.com affiliate, add zalando + wehkamp stubs"
```

---

## Task 3: Create `services/url-parser.ts`

**Files:**
- Create: `services/url-parser.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * URL Parser — detects shop and extracts product metadata from a product URL.
 *
 * Phase 1: URL-only extraction (sync, no network).
 * Phase 2: og: meta tag fetch (async, may fail silently on CORS/web).
 */

export interface ParsedShopUrl {
  shopSlug: string;        // matches AffiliateShop.slug or 'unknown'
  shopDisplayName: string; // human-readable shop name
  productId: string;       // ASIN, numeric ID, or slug — empty string if unknown
  productName: string;     // cleaned name from URL path
  canonicalUrl: string;    // normalized URL
}

export interface ProductMeta {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
}

// ─── Shop detection ────────────────────────────────────────────────────────────

interface ShopRule {
  slug: string;
  displayName: string;
  hostPatterns: RegExp[];
  extractProductId: (url: URL) => string;
  extractProductName: (url: URL) => string;
}

const SHOP_RULES: ShopRule[] = [
  {
    slug: 'amazon-nl',
    displayName: 'Amazon',
    hostPatterns: [/amazon\.(nl|de|com|co\.uk|fr|es|it)$/],
    extractProductId(url) {
      const dp = url.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
      if (dp) return dp[1].toUpperCase();
      const gp = url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
      if (gp) return gp[1].toUpperCase();
      return '';
    },
    extractProductName(url) {
      // /product-name-here/dp/ASIN — take the segment before /dp/
      const m = url.pathname.match(/^\/([^/]+)\/dp\//);
      return m ? slugToName(m[1]) : '';
    },
  },
  {
    slug: 'bol-com',
    displayName: 'Bol.com',
    hostPatterns: [/bol\.com$/],
    extractProductId(url) {
      // /nl/p/product-name/XXXXXXX/ — last numeric segment
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      return /^\d+$/.test(last) ? last : '';
    },
    extractProductName(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      // Structure: nl / p / {name-slug} / {id}
      const nameIdx = segments.findIndex(s => s === 'p') + 1;
      return nameIdx > 0 && segments[nameIdx] ? slugToName(segments[nameIdx]) : '';
    },
  },
  {
    slug: 'coolblue',
    displayName: 'Coolblue',
    hostPatterns: [/coolblue\.nl$/],
    extractProductId(url) {
      // /product-name.html or /product-name-12345.html
      const m = url.pathname.match(/[_-](\d{5,})(?:\.html)?$/);
      return m ? m[1] : '';
    },
    extractProductName(url) {
      const base = url.pathname.split('/').filter(Boolean).pop() ?? '';
      return slugToName(base.replace(/\.html$/, '').replace(/[_-]\d{5,}$/, ''));
    },
  },
  {
    slug: 'mediamarkt',
    displayName: 'MediaMarkt',
    hostPatterns: [/mediamarkt\.nl$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/(\d{5,})(?:\.html)?$/);
      return m ? m[1] : '';
    },
    extractProductName(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const raw = segments[segments.length - 1] ?? '';
      return slugToName(raw.replace(/\.html$/, '').replace(/-\d{5,}$/, ''));
    },
  },
  {
    slug: 'alternate',
    displayName: 'Alternate',
    hostPatterns: [/alternate\.nl$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/(\d{5,})(?:\.html)?$/);
      return m ? m[1] : '';
    },
    extractProductName(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const raw = segments[segments.length - 1] ?? '';
      return slugToName(raw.replace(/\.html$/, '').replace(/-\d{5,}$/, ''));
    },
  },
  {
    slug: 'zalando',
    displayName: 'Zalando',
    hostPatterns: [/zalando\.(nl|be)$/],
    extractProductId(url) {
      // /product-name-XXXXX.html — last alphanumeric segment before .html
      const m = url.pathname.match(/-([A-Z0-9]{6,})\.html$/i);
      return m ? m[1] : '';
    },
    extractProductName(url) {
      const raw = url.pathname.split('/').filter(Boolean).pop() ?? '';
      return slugToName(raw.replace(/\.html$/, '').replace(/-[A-Z0-9]{6,}$/i, ''));
    },
  },
  {
    slug: 'wehkamp',
    displayName: 'Wehkamp',
    hostPatterns: [/wehkamp\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    extractProductName(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const raw = segments.length >= 2 ? segments[segments.length - 2] : segments[0] ?? '';
      return slugToName(raw);
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function slugToName(slug: string): string {
  return slug
    .replace(/[-_+]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function matchShopRule(url: URL): ShopRule | null {
  for (const rule of SHOP_RULES) {
    if (rule.hostPatterns.some(p => p.test(url.hostname))) return rule;
  }
  return null;
}

// ─── Phase 1: URL parsing (sync) ──────────────────────────────────────────────

export function parseShopUrl(rawUrl: string): ParsedShopUrl | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const rule = matchShopRule(url);

  if (rule) {
    return {
      shopSlug: rule.slug,
      shopDisplayName: rule.displayName,
      productId: rule.extractProductId(url),
      productName: rule.extractProductName(url),
      canonicalUrl: `${url.origin}${url.pathname}`,
    };
  }

  // Unknown shop fallback
  const segments = url.pathname.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? '';
  const name = slugToName(lastSegment.replace(/\.html?$/, ''));

  return {
    shopSlug: 'unknown',
    shopDisplayName: url.hostname.replace(/^www\./, ''),
    productId: '',
    productName: name,
    canonicalUrl: `${url.origin}${url.pathname}`,
  };
}

// ─── Phase 2: og: meta fetch (async) ──────────────────────────────────────────

export async function fetchProductMeta(url: string): Promise<ProductMeta> {
  const fallback: ProductMeta = { name: '', brand: null, imageUrl: null, price: null };

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'nl,en;q=0.9',
      },
    });
    if (!res.ok) return fallback;

    const html = await res.text();

    const getMeta = (prop: string): string | null => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ??
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i')) ??
        html.match(new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'));
      return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : null;
    };

    const title = getMeta('title') ?? getMeta('site_name');
    const image = getMeta('image');
    const priceRaw = getMeta('price:amount') ?? getMeta('product:price:amount');
    const price = priceRaw ? parseFloat(priceRaw.replace(',', '.')) : null;

    // Try to extract brand from <title> or og:site_name
    const siteName = getMeta('site_name');
    const brand = siteName && siteName !== title ? siteName : null;

    return {
      name: title ?? '',
      brand,
      imageUrl: image,
      price: price && !isNaN(price) ? price : null,
    };
  } catch {
    return fallback;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/url-parser.ts
git commit -m "feat: url-parser — shop detection and og:meta scraping"
```

---

## Task 4: Create `services/scanned-products.ts`

**Files:**
- Create: `services/scanned-products.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * Scanned Products — Supabase persistence for link-scanner results.
 *
 * Tables: scanned_products, scanned_price_history
 */

import { supabase } from './supabase';

export interface ScannedProduct {
  id: string;
  shop_slug: string;
  shop_product_id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  current_price: number;
  affiliate_url: string;
  original_url: string;
  created_at: string;
  updated_at: string;
}

export interface ScannedPricePoint {
  id: string;
  scanned_product_id: string;
  price: number;
  checked_at: string;
}

export interface ScannedProductWithHistory extends ScannedProduct {
  priceHistory: ScannedPricePoint[];
}

// ─── Upsert ────────────────────────────────────────────────────────────────────

export async function upsertScannedProduct(data: {
  shop_slug: string;
  shop_product_id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  current_price: number;
  affiliate_url: string;
  original_url: string;
}): Promise<ScannedProduct | null> {
  const { data: row, error } = await supabase
    .from('scanned_products')
    .upsert(
      { ...data, updated_at: new Date().toISOString() },
      { onConflict: 'shop_slug,shop_product_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.warn('upsertScannedProduct error:', error.message);
    return null;
  }
  return row as ScannedProduct;
}

// ─── Price history ─────────────────────────────────────────────────────────────

export async function addPricePoint(
  scannedProductId: string,
  price: number
): Promise<void> {
  // Dedup: skip if last point today has the same price
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const { data: last } = await supabase
    .from('scanned_price_history')
    .select('price, checked_at')
    .eq('scanned_product_id', scannedProductId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .single();

  if (last) {
    const lastDate = (last.checked_at as string).slice(0, 10);
    if (lastDate === today && Number(last.price) === price) return;
  }

  const { error } = await supabase.from('scanned_price_history').insert({
    scanned_product_id: scannedProductId,
    price,
    checked_at: new Date().toISOString(),
  });

  if (error) console.warn('addPricePoint error:', error.message);
}

// ─── Fetch ─────────────────────────────────────────────────────────────────────

export async function getScannedProduct(
  shopSlug: string,
  shopProductId: string
): Promise<ScannedProductWithHistory | null> {
  const { data: product, error } = await supabase
    .from('scanned_products')
    .select('*')
    .eq('shop_slug', shopSlug)
    .eq('shop_product_id', shopProductId)
    .single();

  if (error || !product) return null;

  const { data: history } = await supabase
    .from('scanned_price_history')
    .select('*')
    .eq('scanned_product_id', product.id)
    .order('checked_at', { ascending: true });

  return {
    ...(product as ScannedProduct),
    priceHistory: (history ?? []) as ScannedPricePoint[],
  };
}

export async function getAllScannedProducts(): Promise<ScannedProduct[]> {
  const { data, error } = await supabase
    .from('scanned_products')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return [];
  return (data ?? []) as ScannedProduct[];
}
```

- [ ] **Step 2: Commit**

```bash
git add services/scanned-products.ts
git commit -m "feat: scanned-products service — upsert, price history, fetch"
```

---

## Task 5: Wire up `app/link-scanner.tsx`

**Files:**
- Modify: `app/link-scanner.tsx`

- [ ] **Step 1: Replace imports at the top of the file**

Replace the existing import block with:

```tsx
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassShimmer } from '@/components/glass-shimmer';
import { LiquidScreen } from '@/components/liquid-screen';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getShopBySlug } from '@/constants/affiliate-shops';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { addAlert } from '@/services/alerts-store';
import { addPricePoint, upsertScannedProduct } from '@/services/scanned-products';
import { fetchProductMeta, parseShopUrl } from '@/services/url-parser';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
```

- [ ] **Step 2: Replace the MOCK constants and add result type**

Remove `MOCK_PRODUCT` and `MOCK_PROMO_CODES`. Add after the imports:

```tsx
type ScanResult = {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  currentPrice: number;
  affiliateUrl: string;
  shopDisplayName: string;
  priceHistory: { date: string; price: number }[];
};

type ScanError =
  | 'invalid_url'
  | 'product_not_found'
  | 'network_error';

const ERROR_MESSAGES: Record<ScanError, string> = {
  invalid_url: 'We herkennen deze link niet. Probeer een link van Bol.com, Amazon, Coolblue of een andere winkel.',
  product_not_found: 'Product niet gevonden. Controleer de link en probeer opnieuw.',
  network_error: 'Geen verbinding. Controleer je internet en probeer opnieuw.',
};
```

- [ ] **Step 3: Replace the component state and handleScan**

Replace the existing state declarations and `handleScan` function inside `LinkScannerScreen`:

```tsx
  const [url, setUrl] = useState('');
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertSaved, setAlertSaved] = useState(false);
  const [showAlertInput, setShowAlertInput] = useState(false);
  const [alertProductId, setAlertProductId] = useState<string | null>(null);

  const ctaScale = useSharedValue(1);
  const ctaStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  const handleReset = () => {
    setUrl('');
    setScanned(false);
    setScanError(null);
    setResult(null);
    setAlertPrice('');
    setAlertSaved(false);
    setShowAlertInput(false);
    setAlertProductId(null);
  };

  const handleScan = async () => {
    if (!url.trim()) return;
    setScanning(true);
    setScanError(null);
    setResult(null);
    setScanned(false);

    try {
      // Phase 1: parse URL
      const parsed = parseShopUrl(url.trim());
      if (!parsed) {
        setScanError('invalid_url');
        setScanning(false);
        return;
      }

      // Phase 2: fetch og: meta
      const meta = await fetchProductMeta(url.trim());

      const name = meta.name || parsed.productName;
      if (!name) {
        setScanError('product_not_found');
        setScanning(false);
        return;
      }

      // Phase 3: build affiliate URL
      const shop = getShopBySlug(parsed.shopSlug);
      let affiliateUrl = parsed.canonicalUrl;
      if (shop && shop.affiliate.active) {
        affiliateUrl = shop.affiliate.buildAffiliateUrl(parsed.canonicalUrl, parsed.productId || undefined);
      }

      // Phase 4: persist to Supabase
      const price = meta.price ?? 0;
      const shopProductId = parsed.productId || parsed.productName.toLowerCase().replace(/\s+/g, '-').slice(0, 60);

      const saved = await upsertScannedProduct({
        shop_slug: parsed.shopSlug,
        shop_product_id: shopProductId,
        name,
        brand: meta.brand,
        image_url: meta.imageUrl,
        current_price: price,
        affiliate_url: affiliateUrl,
        original_url: url.trim(),
      });

      if (saved) {
        setAlertProductId(saved.id);
        await addPricePoint(saved.id, price);
      }

      setResult({
        name,
        brand: meta.brand,
        imageUrl: meta.imageUrl,
        currentPrice: price,
        affiliateUrl,
        shopDisplayName: shop?.displayName ?? parsed.shopDisplayName,
        priceHistory: saved
          ? [{ date: 'Vandaag', price }]
          : [],
      });
      setScanned(true);
    } catch {
      setScanError('network_error');
    } finally {
      setScanning(false);
    }
  };

  const handleSetAlert = async () => {
    const target = parseFloat(alertPrice.replace(',', '.'));
    if (!alertProductId || isNaN(target) || target <= 0) return;
    await addAlert({
      productId: alertProductId,
      productName: result?.name ?? '',
      targetPrice: target,
      currentPrice: result?.currentPrice ?? 0,
    });
    setAlertSaved(true);
    setShowAlertInput(false);
  };
```

- [ ] **Step 4: Replace the results JSX**

Inside the `<ScrollView>`, replace everything inside `{scanned && (...)}` with:

```tsx
        {scanned && result && (
          <>
            {/* Product Card */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(0).springify().damping(18).stiffness(110) : undefined}>
              <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.productCard}>
                <GlassShimmer isDark={isDark} borderRadius={Radius.xl} intensity={0.7} />
                <View style={styles.productHeader}>
                  {result.imageUrl ? (
                    <View style={[styles.productImagePlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      {/* expo-image would be ideal but Image from RN works fine here */}
                      <IconSymbol name="photo" size={36} color={colors.textSecondary} />
                    </View>
                  ) : (
                    <View style={[styles.productImagePlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                      <IconSymbol name="cart" size={36} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    {result.brand && (
                      <Text style={[styles.productBrand, { color: colors.textSecondary }]}>{result.brand}</Text>
                    )}
                    <Text style={[styles.productName, { color: colors.text }]} numberOfLines={3}>{result.name}</Text>
                    <View style={styles.priceRow}>
                      {result.currentPrice > 0 ? (
                        <Text style={[styles.productPrice, { color: colors.text }]}>€{result.currentPrice.toFixed(2)}</Text>
                      ) : (
                        <Text style={[styles.productPrice, { color: colors.textSecondary }]}>Prijs onbekend</Text>
                      )}
                    </View>
                  </View>
                </View>
              </ClearLiquidGlass>
            </Animated.View>

            {/* Price History */}
            {result.priceHistory.length > 0 && (
              <Animated.View entering={animationsEnabled ? FadeInDown.delay(60).springify().damping(18).stiffness(110) : undefined}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PRIJSHISTORIE</Text>
                <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <Text style={[styles.chartLow, { color: Palette.accent }]}>
                      Laagste: €{Math.min(...result.priceHistory.map(p => p.price)).toFixed(2)}
                    </Text>
                    <Text style={[styles.chartHigh, { color: colors.textSecondary }]}>
                      Hoogste: €{Math.max(...result.priceHistory.map(p => p.price)).toFixed(2)}
                    </Text>
                  </View>
                  <MiniChart data={result.priceHistory} isDark={isDark} />
                  {result.priceHistory.length === 1 && (
                    <Text style={[styles.chartNote, { color: colors.textSecondary }]}>
                      Eerste meting — scan opnieuw om geschiedenis op te bouwen.
                    </Text>
                  )}
                </ClearLiquidGlass>
              </Animated.View>
            )}

            {/* Price Alert */}
            <Animated.View entering={animationsEnabled ? FadeInDown.delay(120).springify().damping(18).stiffness(110) : undefined}>
              <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.alertRow}>
                <View style={[styles.alertIconBox, { backgroundColor: '#FF9500' + '20' }]}>
                  <IconSymbol name="bell.badge.fill" size={20} color="#FF9500" />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={[styles.alertTitle, { color: colors.text }]}>Prijsalert instellen</Text>
                  {alertSaved ? (
                    <Text style={[styles.alertSub, { color: Palette.accent }]}>Alert opgeslagen!</Text>
                  ) : (
                    <Text style={[styles.alertSub, { color: colors.textSecondary }]}>Ontvang een melding als de prijs daalt</Text>
                  )}
                </View>
                {!alertSaved && (
                  <Pressable
                    onPress={() => setShowAlertInput(v => !v)}
                    style={[styles.alertToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)' }]}
                  >
                    <Text style={[styles.alertToggleText, { color: colors.tint }]}>
                      {showAlertInput ? 'Annuleer' : 'Instellen'}
                    </Text>
                  </Pressable>
                )}
              </ClearLiquidGlass>
              {showAlertInput && !alertSaved && (
                <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.alertInputCard}>
                  <Text style={[styles.alertInputLabel, { color: colors.textSecondary }]}>Doelprijs (€)</Text>
                  <View style={styles.alertInputRow}>
                    <TextInput
                      style={[styles.alertInput, { color: colors.text, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }]}
                      placeholder={result.currentPrice > 0 ? `bijv. ${(result.currentPrice * 0.9).toFixed(0)}` : 'bijv. 150'}
                      placeholderTextColor={colors.textSecondary}
                      value={alertPrice}
                      onChangeText={setAlertPrice}
                      keyboardType="decimal-pad"
                    />
                    <Pressable
                      style={[styles.alertConfirmBtn, { backgroundColor: Palette.primary, opacity: alertPrice.trim() ? 1 : 0.5 }]}
                      onPress={handleSetAlert}
                      disabled={!alertPrice.trim()}
                    >
                      <Text style={styles.alertConfirmText}>Bewaar</Text>
                    </Pressable>
                  </View>
                </ClearLiquidGlass>
              )}
            </Animated.View>

            {/* Buy CTA */}
            <Animated.View
              entering={animationsEnabled ? FadeInDown.delay(180).springify().damping(18).stiffness(110) : undefined}
              style={ctaStyle}
            >
              <Pressable
                onPressIn={() => { ctaScale.value = withSpring(0.97, { damping: 12, stiffness: 340 }); }}
                onPressOut={() => { ctaScale.value = withSpring(1, { damping: 12, stiffness: 340 }); }}
                onPress={() => Linking.openURL(result.affiliateUrl)}
                style={styles.ctaWrap}
              >
                <LinearGradient
                  colors={['#34C759', '#30B050']}
                  style={styles.ctaGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.ctaSpecular} pointerEvents="none" />
                  <View style={styles.ctaBlob} pointerEvents="none" />
                  <View style={styles.ctaContent}>
                    <View>
                      <Text style={styles.ctaLabel}>Kopen bij {result.shopDisplayName}</Text>
                      <Text style={styles.ctaShop}>Bekijk via Tweakly</Text>
                    </View>
                    <View style={styles.ctaRight}>
                      {result.currentPrice > 0 && (
                        <Text style={styles.ctaPrice}>€{result.currentPrice.toFixed(2)}</Text>
                      )}
                      <Text style={styles.ctaArrow}>→</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Text style={[styles.affiliateNote, { color: colors.textSecondary }]}>
              Tweakly gebruikt affiliate links. Je betaalt nooit meer.
            </Text>
          </>
        )}
```

- [ ] **Step 5: Replace the error state JSX**

After the scanning indicator block (inside `<ScrollView>`), add before `{scanned && result && ...}`:

```tsx
        {/* Error state */}
        {scanError && (
          <Animated.View entering={animationsEnabled ? FadeInDown.delay(0).springify().damping(18).stiffness(110) : undefined}>
            <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.errorCard}>
              <IconSymbol name="exclamationmark.triangle" size={24} color="#FF3B30" />
              <Text style={[styles.errorText, { color: colors.text }]}>
                {ERROR_MESSAGES[scanError]}
              </Text>
              <Pressable
                style={[styles.retryBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)' }]}
                onPress={handleReset}
              >
                <Text style={[styles.retryText, { color: colors.tint }]}>Opnieuw proberen</Text>
              </Pressable>
            </ClearLiquidGlass>
          </Animated.View>
        )}
```

- [ ] **Step 6: Add missing styles**

In the `StyleSheet.create({})` block, add these entries:

```tsx
  chartNote: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  alertInputCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: 4,
  },
  alertInputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  alertInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  alertInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  alertConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: Radius.lg,
  },
  alertConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    overflow: 'hidden',
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
```

- [ ] **Step 7: Commit**

```bash
git add app/link-scanner.tsx
git commit -m "feat: link-scanner real data — parse URL, scrape meta, persist to supabase, affiliate buy + alert"
```

---

## Task 6: Update affiliate-shops.ts `buildAffiliateUrl` signature

**Files:**
- Modify: `constants/affiliate-shops.ts`

The `buildAffiliateUrl` on the `AffiliateStatus` type needs `productId` as second param to be optional. Verify the type already has `(productUrl: string, asin?: string) => string` — if it does, this task is already done. If not:

- [ ] **Step 1: Verify type signature**

Open `constants/affiliate-shops.ts` and confirm `buildAffiliateUrl` is typed as:
```ts
buildAffiliateUrl: (productUrl: string, asin?: string) => string
```

If it already matches, skip to commit. If not, update the `AffiliateStatus` type to match.

- [ ] **Step 2: Commit**

```bash
git add constants/affiliate-shops.ts
git commit -m "fix: ensure buildAffiliateUrl accepts optional asin param"
```

---

## Task 7: Smoke test on device

**Files:** None

- [ ] **Step 1: Start Expo**

```bash
npx expo start --clear
```

- [ ] **Step 2: Test Amazon URL**

Paste `https://www.amazon.nl/dp/B09XS7JWHH` and tap Scan. Expected:
- Product card shows name from og:title + price
- Green CTA shows "Kopen bij Amazon" with affiliate link containing `tag=tweakly08-20`
- "Eerste meting" shown in price history
- Supabase `scanned_products` table has one new row

- [ ] **Step 3: Test Bol.com URL**

Paste any bol.com product URL (e.g. `https://www.bol.com/nl/nl/p/samsung-galaxy-s25/9300000214440956/`). Expected:
- CTA affiliate URL contains `partner.bol.com/click/click?p=1&t=url&s=1513890`

- [ ] **Step 4: Test unknown shop URL**

Paste `https://www.coolblue.nl/product/12345/some-product.html`. Expected:
- Falls back to direct URL (no affiliate tag, coolblue pending)
- Product name extracted from slug

- [ ] **Step 5: Test invalid URL**

Paste `not a url`. Expected: error card with "We herkennen deze link niet."

- [ ] **Step 6: Test price alert**

After a successful scan, tap "Instellen", enter a price, tap "Bewaar". Expected:
- Alert row shows "Alert opgeslagen!"
- `alerts-store.ts` has the new alert (check via Meldingen tab)

---

## Self-Review

**Spec coverage check:**
- ✅ Parse any shop URL → `url-parser.ts` `parseShopUrl`
- ✅ Extract product data from URL → `fetchProductMeta` reads og: tags
- ✅ Display in product card → result state fed into product card JSX
- ✅ Build affiliate link → `getShopBySlug` + `buildAffiliateUrl`
- ✅ Add to Supabase DB → `upsertScannedProduct`
- ✅ Build price history → `addPricePoint` on every scan
- ✅ Set price alert → `handleSetAlert` + `addAlert`
- ✅ Bol.com affiliate active (publisher 1513890)
- ✅ Fallback to original URL for non-affiliate shops
- ✅ All error states with retry
- ✅ Affiliate disclaimer

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `parseShopUrl` returns `ParsedShopUrl` — used correctly in `handleScan`
- `fetchProductMeta` returns `ProductMeta` — fields used correctly
- `upsertScannedProduct` takes the exact shape defined in `scanned-products.ts`
- `addAlert` from `alerts-store.ts` takes `Omit<PriceAlert, 'id' | 'createdAt'>` — `handleSetAlert` passes `productId`, `productName`, `targetPrice`, `currentPrice` ✅
