/**
 * Tweakers.net Pricewatch API client.
 *
 * Uses reverse-engineered endpoints to fetch:
 * - Product search results (no auth)
 * - Price history charts (no auth)
 * - Product info with JSON-LD (session cookie)
 * - Shop offers with real prices and clickout URLs (session cookie)
 *
 * Based on: https://github.com/hatemosphere/tweakers-pricewatch
 */

const BASE = 'https://tweakers.net';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TweakersPricePoint {
  date: string;
  minPrice: number;
  avgPrice: number;
}

export interface TweakersPriceHistory {
  productId: number;
  prices: TweakersPricePoint[];
  lowestEver: number | null;
  lowestEverDate: string | null;
  lastPrice: number | null;
}

export interface TweakersProductInfo {
  productId: number;
  name: string;
  brand: string;
  imageUrl: string | null;
  lowPrice: number | null;
  highPrice: number | null;
  offerCount: number;
  url: string;
  gtin: string[];
}

export interface TweakersShopOffer {
  shopName: string;
  shopId: number;
  price: number;
  productPrice: number;
  shippingCost: number;
  url: string; // clickout URL (redirect to actual shop page)
}

export interface TweakersSearchResult {
  productId: number;
  name: string;
  url: string;
  price: number | null;
}

// ─── Cookie/session management ───────────────────────────────────────────────

let _sessionCookie: string | null = null;
let _sessionInitPromise: Promise<void> | null = null;

async function initSession(): Promise<void> {
  if (_sessionCookie) return;
  if (_sessionInitPromise) return _sessionInitPromise;

  _sessionInitPromise = (async () => {
    try {
      // Follow the DPG Media consent redirect to get session cookies
      const resp = await fetch(`${BASE}/`, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl,en;q=0.9',
        },
        redirect: 'follow',
      });
      // Extract Set-Cookie from response (React Native supports this)
      const cookieHeader = resp.headers.get('set-cookie');
      if (cookieHeader) {
        _sessionCookie = cookieHeader;
      }
      // Even without cookies, the session is now "warmed up" in the HTTP client
      await resp.text(); // consume body
    } catch {
      // Session init failed — endpoints that need cookies will fail gracefully
    }
    _sessionInitPromise = null;
  })();

  return _sessionInitPromise;
}

function makeHeaders(accept = 'text/html'): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: accept,
    'Accept-Language': 'nl,en;q=0.9',
  };
  if (_sessionCookie) {
    headers['Cookie'] = _sessionCookie;
  }
  return headers;
}

// ─── Search (no auth needed) ─────────────────────────────────────────────────

export async function searchTweakers(query: string): Promise<TweakersSearchResult[]> {
  try {
    const resp = await fetch(
      `${BASE}/ajax/zoeken/pricewatch/?keyword=${encodeURIComponent(query)}`,
      {
        headers: makeHeaders('application/json'),
        timeout: 15000,
      } as RequestInit,
    );
    if (!resp.ok) return [];
    const data = await resp.json();

    const results: TweakersSearchResult[] = [];
    const seenIds = new Set<number>();

    // "articles" contains productedition items
    for (const item of data.articles ?? []) {
      const pid = extractProductId(item.link ?? '');
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        results.push({
          productId: pid,
          name: item.name ?? '',
          url: item.link ?? '',
          price: null,
        });
      }
    }

    // "entities" may contain additional products with prices
    for (const item of data.entities ?? []) {
      if (item.type !== 'product') continue;
      const pid = extractProductId(item.link ?? '');
      if (pid && !seenIds.has(pid)) {
        seenIds.add(pid);
        const price = parseMinPriceHtml(item.minPrice ?? '');
        results.push({
          productId: pid,
          name: item.name ?? '',
          url: item.link ?? '',
          price,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ─── Price History (no auth needed) ──────────────────────────────────────────

export async function fetchTweakersPriceHistory(
  productId: number,
  country = 'nl',
): Promise<TweakersPriceHistory | null> {
  try {
    const resp = await fetch(
      `${BASE}/ajax/price_chart/${productId}/${country}/`,
      {
        headers: {
          ...makeHeaders('application/json'),
          'X-Requested-With': 'XMLHttpRequest',
          Referer: `${BASE}/pricewatch/${productId}/`,
        },
        timeout: 15000,
      } as RequestInit,
    );
    if (!resp.ok) return null;
    const data = await resp.json();

    if (!data.success) return null;

    const prices: TweakersPricePoint[] = [];
    for (const row of data.dataset?.source ?? []) {
      if (Array.isArray(row) && row.length >= 3) {
        prices.push({
          date: row[0],
          minPrice: row[1],
          avgPrice: row[2],
        });
      }
    }

    // Extract "lowest ever" from markers
    let lowestEver: number | null = null;
    for (const markerGroup of data.markers ?? []) {
      if (!Array.isArray(markerGroup)) continue;
      for (const marker of markerGroup) {
        if (marker?.yAxis != null) {
          const val = Number(marker.yAxis);
          if (lowestEver === null || val < lowestEver) {
            lowestEver = val;
          }
        }
      }
    }

    let lowestEverDate: string | null = null;
    if (lowestEver !== null) {
      const match = prices.find(p => p.minPrice === lowestEver);
      if (match) lowestEverDate = match.date;
    }

    return {
      productId,
      prices,
      lowestEver,
      lowestEverDate,
      lastPrice: prices.length > 0 ? prices[prices.length - 1].minPrice : null,
    };
  } catch {
    return null;
  }
}

// ─── Product Info + Shop Offers (needs session) ─────────────────────────────

export async function fetchTweakersProductDetails(
  productId: number,
): Promise<{ info: TweakersProductInfo; offers: TweakersShopOffer[] } | null> {
  await initSession();

  try {
    const resp = await fetch(`${BASE}/pricewatch/${productId}/`, {
      headers: makeHeaders('text/html'),
      redirect: 'follow',
      timeout: 15000,
    } as RequestInit);
    if (!resp.ok) return null;
    const html = await resp.text();

    const info = parseProductInfo(productId, html);
    const offers = parseShopOffers(html);

    return { info, offers };
  } catch {
    return null;
  }
}

// ─── Search and get full details ─────────────────────────────────────────────

export async function findTweakersProduct(
  productName: string,
): Promise<{
  info: TweakersProductInfo;
  offers: TweakersShopOffer[];
  priceHistory: TweakersPriceHistory | null;
} | null> {
  const results = await searchTweakers(productName);
  if (results.length === 0) return null;

  const best = results[0];
  const [details, priceHistory] = await Promise.all([
    fetchTweakersProductDetails(best.productId),
    fetchTweakersPriceHistory(best.productId),
  ]);

  if (!details) return null;

  return {
    info: details.info,
    offers: details.offers,
    priceHistory,
  };
}

// ─── HTML Parsing helpers ────────────────────────────────────────────────────

function extractProductId(link: string): number | null {
  const m = link.match(/\/pricewatch\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function parseDutchPrice(s: string): number {
  s = s.trim().replace(/-$/, '').replace(/,$/, '');
  s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseMinPriceHtml(html: string): number | null {
  const m = html.match(/€\s*([\d.,]+(?:-)?)/);
  return m ? parseDutchPrice(m[1]) : null;
}

function htmlDecode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&apos;/g, "'");
}

function stripHtml(s: string): string {
  return htmlDecode(s.replace(/<[^>]+>/g, '')).trim();
}

function parseProductInfo(productId: number, html: string): TweakersProductInfo {
  const defaultInfo: TweakersProductInfo = {
    productId,
    name: '',
    brand: '',
    imageUrl: null,
    lowPrice: null,
    highPrice: null,
    offerCount: 0,
    url: `${BASE}/pricewatch/${productId}/`,
    gtin: [],
  };

  // Try JSON-LD first
  const ldMatch = html.match(
    /<script\s+type="application\/ld\+json">\s*(\{[\s\S]*?\})\s*<\/script>/,
  );
  if (ldMatch) {
    try {
      const ldRoot = JSON.parse(ldMatch[1]);
      let productLd: Record<string, unknown> | null = null;

      // Find Product in @graph
      if (Array.isArray(ldRoot['@graph'])) {
        for (const item of ldRoot['@graph']) {
          if (item['@type'] === 'Product') {
            productLd = item;
            break;
          }
        }
      }
      // Or direct Product
      if (!productLd && ldRoot['@type'] === 'Product') {
        productLd = ldRoot;
      }

      if (productLd) {
        const offers = (productLd.offers ?? {}) as Record<string, unknown>;
        const images = productLd.image;
        const brand = productLd.brand as Record<string, string> | undefined;
        const gtin13 = productLd.gtin13;

        return {
          productId,
          name: (productLd.name as string) ?? '',
          brand: brand?.name ?? '',
          imageUrl: Array.isArray(images) ? images[0] : typeof images === 'string' ? images : null,
          lowPrice: offers.lowPrice != null ? Number(offers.lowPrice) : null,
          highPrice: offers.highPrice != null ? Number(offers.highPrice) : null,
          offerCount: Number(offers.offerCount ?? 0),
          url: (productLd.url as string) ?? `${BASE}/pricewatch/${productId}/`,
          gtin: Array.isArray(gtin13) ? gtin13 : [],
        };
      }
    } catch {
      // JSON-LD parse failed, try fallback
    }
  }

  // Fallback: data-product attribute
  const dpMatch = html.match(/data-product="([^"]*)"/);
  if (dpMatch) {
    try {
      const dp = JSON.parse(htmlDecode(dpMatch[1]));
      return {
        ...defaultInfo,
        name: dp.name ?? '',
        url: dp.url ?? defaultInfo.url,
        imageUrl: dp.img ?? null,
      };
    } catch {
      // fallback failed
    }
  }

  return defaultInfo;
}

function parseShopOffers(html: string): TweakersShopOffer[] {
  const offers: TweakersShopOffer[] = [];

  // Match <li data-shop-id="...">...</li> blocks
  // The HTML is served as a single line, so [\s\S] is needed.
  const shopPattern = /<li\s+data-shop-id="(\d+)"[^>]*>([\s\S]*?)<\/li>/g;
  let match;

  while ((match = shopPattern.exec(html)) !== null) {
    const shopId = parseInt(match[1], 10);
    const block = match[2];

    // Shop name — try multiple selectors
    const nameMatch =
      block.match(/class="shop-name"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/) ??
      block.match(/class="[^"]*shop-name[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div|td)>/) ??
      block.match(/data-shop-name="([^"]*)"/);
    const shopName = nameMatch ? stripHtml(nameMatch[1]) : '';

    // Prices from tooltip (most accurate)
    let productPrice = 0;
    let shippingCost = 0;
    let totalPrice = 0;

    const tooltipMatch = block.match(/data-tooltip-html="([^"]*)"/);
    if (tooltipMatch) {
      const tooltip = htmlDecode(tooltipMatch[1]);
      const prodM = tooltip.match(/Productprijs<\/dt>\s*<dd>€\s*([\d.,]+(?:-)?)/);
      const shipM = tooltip.match(/Pakketpost[^<]*<\/dt>\s*<dd>€\s*([\d.,]+(?:-)?)/);
      // «Totaal» can appear as plain dt or with a nested <b>
      const totalM = tooltip.match(/Totaal[^<]*<\/(?:b>\s*)?<\/dt>\s*<dd>€\s*([\d.,]+(?:-)?)/) ??
                     tooltip.match(/Totaal[^<]*<\/dt>\s*<dd>€\s*([\d.,]+(?:-)?)/); 
      if (prodM) productPrice = parseDutchPrice(prodM[1]);
      if (shipM) shippingCost = parseDutchPrice(shipM[1]);
      if (totalM) totalPrice = parseDutchPrice(totalM[1]);
      // If tooltip gave us product+shipping but no explicit total, compute it
      if (totalPrice === 0 && productPrice > 0) {
        totalPrice = productPrice + shippingCost;
      }
    }

    // Fallback: displayed price in the block
    if (totalPrice === 0) {
      const priceM =
        block.match(/class="shop-price"[^>]*>[\s\S]*?€\s*([\d.,]+(?:-)?)/) ??
        block.match(/€\s*([\d.,]+(?:-)?)/);
      if (priceM) {
        totalPrice = parseDutchPrice(priceM[1]);
        productPrice = totalPrice;
      }
    }

    if (totalPrice === 0) continue;

    // Clickout URL — try multiple patterns
    let url = '';
    const urlMatch =
      block.match(/href="([^"]*\/clickout[^"]*)"/) ??
      block.match(/href="([^"]*\/pricewatch\/[^"]*\/shop[^"]*)"/) ??
      block.match(/href="([^"]*tweakers\.net[^"]*)"/) ??
      block.match(/<a[^>]+href="([^"]*)"[^>]*class="[^"]*shop[^"]*"/) ??
      block.match(/href="(\/[^"]+)"/);
    if (urlMatch) {
      url = htmlDecode(urlMatch[1]);
      if (url.startsWith('/')) url = BASE + url;
    }

    if (!shopName && !url) continue; // Skip empty rows

    offers.push({
      shopName,
      shopId,
      price: totalPrice,
      productPrice,
      shippingCost,
      url,
    });
  }

  return offers;
}

// ─── Cache layer ─────────────────────────────────────────────────────────────

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const cache = new Map<string, CachedData<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Cached version of findTweakersProduct.
 * Caches results for 30 minutes to avoid hammering Tweakers.
 */
export async function findTweakersProductCached(
  productName: string,
): Promise<{
  info: TweakersProductInfo;
  offers: TweakersShopOffer[];
  priceHistory: TweakersPriceHistory | null;
} | null> {
  const key = `tw_${productName.toLowerCase().trim()}`;
  const cached = getCached<Awaited<ReturnType<typeof findTweakersProduct>>>(key);
  if (cached) return cached;

  const result = await findTweakersProduct(productName);
  if (result) setCache(key, result);
  return result;
}
