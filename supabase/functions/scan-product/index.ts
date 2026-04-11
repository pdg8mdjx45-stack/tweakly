/**
 * Supabase Edge Function: scan-product
 *
 * Receives a product URL, extracts product data via JSON-LD structured data,
 * builds affiliate link, fetches promo codes, detects category, extracts specs,
 * finds shop links, runs content moderation, persists to Supabase, and returns
 * everything to the app in one response.
 *
 * Legal basis: JSON-LD (application/ld+json) is structured data shops publish
 * intentionally for Google Shopping. One fetch per user action — not bulk crawling.
 *
 * Deploy: supabase functions deploy scan-product
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoCode {
  code: string;
  discount: string;
  expiresAt: string | null;
  source: 'page' | 'aggregator';
}

interface ShopLink {
  name: string;
  price: number | null;
  url: string;
}

interface ScanResponse {
  affiliateUrl: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  shopDisplayName: string;
  shopSlug: string;
  promoCodes: PromoCode[];
  category: string | null;
  specs: Record<string, string> | null;
  shopLinks: ShopLink[];
}

// ─── Category detection ───────────────────────────────────────────────────────

// Maps category slug (matching CATEGORY_META in mock-data.ts) to keyword patterns
const CATEGORY_RULES: Array<{ category: string; patterns: RegExp }> = [
  { category: 'Smartphones',          patterns: /\b(smartphone|iphone|galaxy\s*s\d|pixel\s*\d|telefoon|mobiel|gsm|android\s*phone)\b/i },
  { category: 'Tablets',              patterns: /\b(tablet|ipad|galaxy\s*tab|surface\s*pro|fire\s*hd)\b/i },
  { category: 'Laptops',              patterns: /\b(laptop|notebook|macbook|chromebook|ultrabook)\b/i },
  { category: 'Desktops',             patterns: /\b(desktop|pc\s*tower|all-in-one|imac|mini\s*pc)\b/i },
  { category: 'Monitoren',            patterns: /\b(monitor|beeldscherm|display\s*\d+"|curved\s*monitor)\b/i },
  { category: 'Televisies',           patterns: /\b(tv|televisie|oled|qled|nanocell|smart\s*tv|\d+"\s*tv)\b/i },
  { category: 'Audio',                patterns: /\b(hoofdtelefoon|earbuds|airpods|headphone|koptelefoon|oordopjes|soundbar|speaker)\b/i },
  { category: 'Gameconsoles',         patterns: /\b(playstation|xbox|nintendo|ps5|ps4|switch|game\s*console)\b/i },
  { category: 'Gaming',               patterns: /\b(gaming|gamer|esports|razer|steelseries|corsair\s*k\d)\b/i },
  { category: 'Grafische kaarten',    patterns: /\b(rtx|gtx|radeon|rx\s*\d{4}|gpu|grafische\s*kaart|videocard)\b/i },
  { category: 'Processors',           patterns: /\b(processor|cpu|ryzen|core\s*i\d|intel|amd\s*\d+\w+x)\b/i },
  { category: 'Geheugen',             patterns: /\b(ram|ddr\d|geheugen\s*\d+gb|dimm|so-dimm)\b/i },
  { category: 'Opslag (SSD)',         patterns: /\b(ssd|nvme|m\.2|solid\s*state)\b/i },
  { category: 'Opslag (HDD)',         patterns: /\b(hdd|harde\s*schijf|hard\s*drive|seagate|western\s*digital)\b/i },
  { category: 'Wearables',            patterns: /\b(smartwatch|apple\s*watch|fitbit|garmin|galaxy\s*watch|wearable)\b/i },
  { category: 'Fotografie',           patterns: /\b(camera|dslr|mirrorless|lens|fototoestel|gopro|drone)\b/i },
  { category: 'Toetsenborden',        patterns: /\b(toetsenbord|keyboard|mechanisch\s*toetsenbord|mechanical\s*keyboard)\b/i },
  { category: 'Muizen',               patterns: /\b(muis|mouse|gaming\s*mouse|trackpad|trackball)\b/i },
  { category: 'Luidsprekers',         patterns: /\b(luidspreker|bluetooth\s*speaker|portable\s*speaker|sonos|jbl|bose)\b/i },
  { category: 'Voedingen',            patterns: /\b(psu|voeding|power\s*supply|\d+w\s*psu|\d+\s*watt\s*voeding)\b/i },
  { category: 'Moederborden',         patterns: /\b(moederbord|motherboard|mainboard|atx|matx|itx)\b/i },
  { category: 'Computerbehuizingen',  patterns: /\b(behuizing|pc\s*case|tower\s*case|midi\s*tower)\b/i },
  { category: 'Netwerk',              patterns: /\b(router|mesh\s*wifi|switch\s*\d+\s*port|access\s*point|netwerk)\b/i },
  { category: 'Webcams',              patterns: /\b(webcam|web\s*camera|logitech\s*c\d)\b/i },
  { category: 'Printers',             patterns: /\b(printer|scanner|all-in-one\s*printer|inktjet|laser\s*printer)\b/i },
  { category: 'Sneakers',             patterns: /\b(sneakers|nike|adidas|jordan|yeezy|vans|converse)\b/i },
  { category: 'Sportkleding',         patterns: /\b(sportkleding|sportbroek|sportjas|trainingsbroek|hardloopshirt)\b/i },
  { category: 'Fitness',              patterns: /\b(dumbbell|halter|fitness|barbell|kettlebell|yogamat)\b/i },
  { category: 'Keuken',               patterns: /\b(keuken|airfryer|blender|koffiezetapparaat|magnetron|oven|mixer)\b/i },
  { category: 'Huishoudelijk',        patterns: /\b(stofzuiger|wasmachine|droger|vaatwasser|koelkast|vriezer)\b/i },
  { category: 'Verlichting',          patterns: /\b(lamp|verlichting|philips\s*hue|smart\s*bulb|led\s*strip)\b/i },
  { category: 'Speelgoed',            patterns: /\b(speelgoed|lego|playmobil|puzzel|knex|toy)\b/i },
];

function detectCategory(name: string, brand: string | null): string | null {
  const text = `${name} ${brand ?? ''}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.test(text)) return rule.category;
  }
  return null;
}

// ─── Specs extraction ─────────────────────────────────────────────────────────

function extractSpecsFromJsonLd(html: string): Record<string, string> | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const candidates = Array.isArray(json) ? json : [json];
      for (const obj of candidates) {
        const items = obj['@graph'] ? [obj, ...obj['@graph']] : [obj];
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          if (item['@type'] !== 'Product' && item['@type'] !== 'IndividualProduct') continue;
          if (!item.additionalProperty) continue;

          const props = Array.isArray(item.additionalProperty)
            ? item.additionalProperty
            : [item.additionalProperty];

          const specs: Record<string, string> = {};
          for (const prop of props) {
            if (prop?.name && prop?.value != null) {
              specs[String(prop.name).trim()] = String(prop.value).trim();
            }
          }
          if (Object.keys(specs).length > 0) return specs;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractSpecsFromMicrodata(html: string): Record<string, string> | null {
  // itemprop="name" paired with itemprop="value" in spec tables
  const specs: Record<string, string> = {};
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;

  while ((row = rowRegex.exec(html)) !== null) {
    const cells = row[1].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
    if (!cells || cells.length < 2) continue;
    const key = cells[0].replace(/<[^>]+>/g, '').trim();
    const val = cells[1].replace(/<[^>]+>/g, '').trim();
    if (key && val && key.length < 60 && val.length < 200) {
      specs[key] = val;
      if (Object.keys(specs).length >= 12) break;
    }
  }

  return Object.keys(specs).length > 0 ? specs : null;
}

function extractSpecs(html: string): Record<string, string> | null {
  return extractSpecsFromJsonLd(html) ?? extractSpecsFromMicrodata(html);
}

// ─── Shop links extraction ────────────────────────────────────────────────────

// Extract competing shop links from JSON-LD offers or known patterns
function extractShopLinksFromJsonLd(html: string, currentShopName: string, currentUrl: string, currentPrice: number | null): ShopLink[] {
  const links: ShopLink[] = [{ name: currentShopName, price: currentPrice, url: currentUrl }];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const candidates = Array.isArray(json) ? json : [json];
      for (const obj of candidates) {
        const items = obj['@graph'] ? [obj, ...obj['@graph']] : [obj];
        for (const item of items) {
          if (!item || item['@type'] !== 'Product') continue;
          const offers = Array.isArray(item.offers) ? item.offers : (item.offers ? [item.offers] : []);
          for (const offer of offers) {
            if (!offer?.url || offer.url === currentUrl) continue;
            const sellerName = offer.seller?.name ?? offer.offeredBy?.name ?? null;
            if (!sellerName) continue;
            const price = offer.price != null ? parseFloat(String(offer.price).replace(',', '.')) : null;
            links.push({ name: String(sellerName), price: isNaN(price!) ? null : price, url: String(offer.url) });
            if (links.length >= 5) return links;
          }
        }
      }
    } catch {
      continue;
    }
  }
  return links;
}

// ─── Shop URL parser ──────────────────────────────────────────────────────────

const AMAZON_TAG = 'tweakly08-20';

interface ShopRule {
  slug: string;
  displayName: string;
  hostPatterns: RegExp[];
  extractProductId: (url: URL) => string;
  buildAffiliateUrl: (canonical: string, productId: string) => string;
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
    buildAffiliateUrl(canonical, productId) {
      if (productId) return `https://www.amazon.nl/dp/${productId}?tag=${AMAZON_TAG}`;
      try {
        const u = new URL(canonical);
        u.searchParams.set('tag', AMAZON_TAG);
        return u.toString();
      } catch {
        return canonical;
      }
    },
  },
  {
    slug: 'bol-com',
    displayName: 'Bol.com',
    hostPatterns: [/bol\.com$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      return /^\d+$/.test(last) ? last : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'coolblue',
    displayName: 'Coolblue',
    hostPatterns: [/coolblue\.(nl|be)$/],
    extractProductId(url) {
      const m = url.pathname.match(/[_-](\d{5,})(?:\.html)?$/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'mediamarkt',
    displayName: 'MediaMarkt',
    hostPatterns: [/mediamarkt\.nl$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/(\d{5,})(?:\.html)?$/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'alternate',
    displayName: 'Alternate',
    hostPatterns: [/alternate\.nl$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/(\d{5,})(?:\.html)?$/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'zalando-lounge',
    displayName: 'Zalando Lounge',
    hostPatterns: [/lounge\.zalando\.(nl|be)$/],
    extractProductId(url) {
      const m = url.pathname.match(/-([A-Z0-9]{6,})\.html$/i);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'zalando',
    displayName: 'Zalando',
    hostPatterns: [/zalando\.(nl|be)$/],
    extractProductId(url) {
      const m = url.pathname.match(/-([A-Z0-9]{6,})\.html$/i);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'wehkamp',
    displayName: 'Wehkamp',
    hostPatterns: [/wehkamp\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
];

interface ParsedUrl {
  shopSlug: string;
  shopDisplayName: string;
  productId: string;
  canonicalUrl: string;
  affiliateUrl: string;
}

function parseShopUrl(rawUrl: string): ParsedUrl | null {
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { return null; }

  const canonical = `${url.origin}${url.pathname}`;

  for (const rule of SHOP_RULES) {
    if (rule.hostPatterns.some(p => p.test(url.hostname))) {
      const productId = rule.extractProductId(url);
      return {
        shopSlug: rule.slug,
        shopDisplayName: rule.displayName,
        productId,
        canonicalUrl: canonical,
        affiliateUrl: rule.buildAffiliateUrl(canonical, productId),
      };
    }
  }

  return {
    shopSlug: 'unknown',
    shopDisplayName: url.hostname.replace(/^www\./, ''),
    productId: '',
    canonicalUrl: canonical,
    affiliateUrl: canonical,
  };
}

// ─── JSON-LD product extraction ───────────────────────────────────────────────

interface ProductData {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  price: number | null;
  specs: Record<string, string> | null;
  shopLinks: ShopLink[];
}

function extractMeta(html: string, property: string): string {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]*)"`, 'i'))
    ?? html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${property}"`, 'i'));
  return m?.[1]?.trim() ?? '';
}

function parsePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).replace(',', '.');
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function extractFromJsonLd(html: string): Omit<ProductData, 'specs' | 'shopLinks'> | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const candidates = Array.isArray(json) ? json : [json];

      for (const obj of candidates) {
        const items = obj['@graph'] ? [obj, ...obj['@graph']] : [obj];

        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const type = item['@type'];
          if (type !== 'Product' && type !== 'IndividualProduct') continue;

          const name = item.name?.trim();
          if (!name) continue;

          const brand = item.brand?.name ?? item.brand ?? null;
          const image = Array.isArray(item.image) ? item.image[0] : item.image;
          const imageUrl = typeof image === 'string' ? image : image?.url ?? null;

          const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          const price = parsePrice(offers?.price ?? offers?.lowPrice ?? item.price);

          return {
            name: String(name),
            brand: brand ? String(brand).trim() : null,
            imageUrl: imageUrl ? String(imageUrl) : null,
            price,
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractFromOgTags(html: string): Omit<ProductData, 'specs' | 'shopLinks'> | null {
  const name = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title');
  if (!name) return null;

  const imageUrl = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || null;
  const priceStr = extractMeta(html, 'product:price:amount') || extractMeta(html, 'og:price:amount');
  const price = priceStr ? parsePrice(priceStr) : null;

  return { name, brand: null, imageUrl: imageUrl || null, price };
}

// ─── Per-shop price fallbacks ─────────────────────────────────────────────────

function extractPriceFromHtml(html: string, shopSlug: string): number | null {
  if (shopSlug === 'bol-com') {
    const m = html.match(/\\"Money\\",\\"([0-9]+[.,][0-9]{2})\\",\\"currencyCode\\",\\"EUR\\"/);
    if (m) return parsePrice(m[1]);
    const m2 = html.match(/\\"Money\\",\\"([0-9]+[.,][0-9]{2})\\"/);
    if (m2) return parsePrice(m2[1]);
  }

  if (shopSlug === 'mediamarkt') {
    const m = html.match(/"finalPrice"\s*:\s*\{\s*"value"\s*:\s*(\d+(?:[.,]\d+)?)/);
    if (m) return parsePrice(m[1]);
    const m2 = html.match(/data-price="(\d+(?:[.,]\d+)?)"/);
    if (m2) return parsePrice(m2[1]);
    const m3 = html.match(/"price"\s*:\s*"(\d+(?:[.,]\d{2})?)".*?"priceCurrency"\s*:\s*"EUR"/s);
    if (m3) return parsePrice(m3[1]);
  }

  if (shopSlug === 'alternate') {
    const m = html.match(/itemprop="price"[^>]+content="(\d+(?:[.,]\d+)?)"/);
    if (m) return parsePrice(m[1]);
    const m2 = html.match(/class="[^"]*price[^"]*"[^>]*>\s*[€]?\s*(\d+[,.]?\d{0,2})/i);
    if (m2) return parsePrice(m2[1]);
  }

  if (shopSlug === 'coolblue') {
    const m = html.match(/data-price="(\d+(?:[.,]\d+)?)"/);
    if (m) return parsePrice(m[1]);
    const m2 = html.match(/"price"\s*:\s*(\d+(?:\.\d+)?)\s*,\s*"priceCurrency"\s*:\s*"EUR"/);
    if (m2) return parsePrice(m2[1]);
  }

  const generic = html.match(/itemprop="price"[^>]+content="(\d+(?:[.,]\d+)?)"/);
  if (generic) return parsePrice(generic[1]);

  return null;
}

// ─── Bol.com API extraction ───────────────────────────────────────────────────

async function fetchBolComProduct(productId: string): Promise<Omit<ProductData, 'specs' | 'shopLinks'> | null> {
  if (!productId) return null;
  try {
    const res = await fetch(
      `https://api.bol.com/catalog/v4/products/${productId}?country=NL&language=nl`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Tweakly/1.0)',
        },
        signal: AbortSignal.timeout(10_000),
      }
    );
    console.log('[bol-api] productId:', productId, 'status:', res.status);
    if (!res.ok) return null;

    const json = await res.json();
    const title = json.title ?? json.specsTag ?? null;
    if (!title) return null;

    const brand = json.brand ?? null;
    const image = Array.isArray(json.images) && json.images.length > 0
      ? (json.images[0]?.url ?? null)
      : null;

    let price: number | null = null;
    const rawPrice = json.summary?.price?.salePrice
      ?? json.summary?.price?.regularPrice
      ?? json.offerData?.offers?.[0]?.price?.salePrice
      ?? json.offerData?.offers?.[0]?.price?.regularPrice
      ?? null;
    if (rawPrice != null) price = parsePrice(rawPrice);

    return { name: String(title), brand: brand ? String(brand) : null, imageUrl: image, price };
  } catch (e) {
    console.warn('[bol-api] error:', e);
    return null;
  }
}

async function fetchProductData(
  productUrl: string,
  shopSlug: string,
  shopDisplayName: string,
  productId?: string
): Promise<ProductData | null> {
  let base: Omit<ProductData, 'specs' | 'shopLinks'> | null = null;
  let html = '';

  if (shopSlug === 'bol-com') {
    const bolResult = await fetchBolComProduct(productId ?? '');
    if (bolResult) base = bolResult;
  }

  if (!base) {
    try {
      const res = await fetch(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(15_000),
      });

      console.log('[fetch]', productUrl, 'status:', res.status);
      if (!res.ok) return null;
      html = await res.text();

      const fromJsonLd = extractFromJsonLd(html);
      base = fromJsonLd ?? extractFromOgTags(html);

      if (base && base.price === null) {
        const fallbackPrice = extractPriceFromHtml(html, shopSlug);
        if (fallbackPrice !== null) base = { ...base, price: fallbackPrice };
      }
    } catch {
      return null;
    }
  }

  if (!base) return null;

  const specs = html ? extractSpecs(html) : null;
  const shopLinks = html
    ? extractShopLinksFromJsonLd(html, shopDisplayName, productUrl, base.price)
    : [{ name: shopDisplayName, price: base.price, url: productUrl }];

  return { ...base, specs, shopLinks };
}

// ─── Content moderation ───────────────────────────────────────────────────────

async function isBlocked(
  supabaseAdmin: ReturnType<typeof createClient>,
  name: string,
  category: string | null
): Promise<boolean> {
  const { data: keywords } = await supabaseAdmin
    .from('blocked_keywords')
    .select('keyword');

  if (!keywords || keywords.length === 0) return false;

  const text = `${name} ${category ?? ''}`.toLowerCase();
  return keywords.some((row: { keyword: string }) => text.includes(row.keyword.toLowerCase()));
}

// ─── Promo code fetching ──────────────────────────────────────────────────────

const SHOP_SEARCH_TERMS: Record<string, string> = {
  'amazon-nl': 'amazon',
  'bol-com': 'bol.com',
  'coolblue': 'coolblue',
  'mediamarkt': 'mediamarkt',
  'alternate': 'alternate',
  'zalando': 'zalando',
  'zalando-lounge': 'zalando-lounge',
  'wehkamp': 'wehkamp',
};

function cleanCode(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

function looksLikeCode(str: string): boolean {
  return /^[A-Z0-9\-_]{3,25}$/.test(str) && /[A-Z]/.test(str);
}

function extractText(html: string, regex: RegExp): string {
  return html.match(regex)?.[1]?.replace(/<[^>]+>/g, '').trim() ?? '';
}

async function fetchKortingscode(shopTerm: string): Promise<PromoCode[]> {
  const results: PromoCode[] = [];
  try {
    const slug = shopTerm.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
    const res = await fetch(`https://www.kortingscode.nl/${encodeURIComponent(slug)}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Tweakly/1.0)',
        'Accept-Language': 'nl-NL,nl;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return results;
    const html = await res.text();

    const couponBlockRegex = /class="[^"]*coupon[^"]*"[^>]*>([\s\S]*?)(?=class="[^"]*coupon[^"]*"|<\/ul>|<\/section>)/gi;
    let block: RegExpExecArray | null;

    while ((block = couponBlockRegex.exec(html)) !== null && results.length < 6) {
      const content = block[1];
      const codeAttr = content.match(/data-coupon-code="([^"]+)"/)?.[1]
        ?? content.match(/data-code="([^"]+)"/)?.[1]
        ?? extractText(content, /class="[^"]*(?:coupon-code|code-box|code)[^"]*"[^>]*>([^<]+)</i);

      if (!codeAttr) continue;
      const code = cleanCode(codeAttr);
      if (!looksLikeCode(code)) continue;

      const discount = extractText(content, /class="[^"]*(?:coupon-title|title|description)[^"]*"[^>]*>([^<]+)</i)
        || 'Kortingscode';

      const expiryRaw = (content.match(/data-expires="([^"]+)"/)?.[1]
        ?? extractText(content, /<time[^>]*>([^<]+)<\/time>/i))
        || null;

      results.push({ code, discount: discount.slice(0, 80), expiresAt: expiryRaw, source: 'aggregator' });
    }
  } catch {
    // Silently skip
  }
  return results;
}

async function fetchActiecode(shopTerm: string): Promise<PromoCode[]> {
  const results: PromoCode[] = [];
  try {
    const slug = shopTerm.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
    const res = await fetch(`https://www.actiecode.nl/${encodeURIComponent(slug)}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Tweakly/1.0)',
        'Accept-Language': 'nl-NL,nl;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return results;
    const html = await res.text();

    const codeRegex = /data-code="([^"]+)"/g;
    const titleRegex = /class="[^"]*(?:title|coupon-title)[^"]*"[^>]*>([^<]+)</gi;

    const codes: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = codeRegex.exec(html)) !== null && codes.length < 6) {
      const code = cleanCode(m[1]);
      if (looksLikeCode(code)) codes.push(code);
    }

    const titles: string[] = [];
    while ((m = titleRegex.exec(html)) !== null && titles.length < 6) {
      const t = m[1].trim();
      if (t) titles.push(t);
    }

    for (let i = 0; i < codes.length; i++) {
      results.push({
        code: codes[i],
        discount: (titles[i] ?? 'Kortingscode').slice(0, 80),
        expiresAt: null,
        source: 'aggregator',
      });
    }
  } catch {
    // Silently skip
  }
  return results;
}

async function getPromoCodes(shopSlug: string): Promise<PromoCode[]> {
  const shopTerm = SHOP_SEARCH_TERMS[shopSlug];
  if (!shopTerm) return [];

  const [fromKortingscode, fromActiecode] = await Promise.allSettled([
    fetchKortingscode(shopTerm),
    fetchActiecode(shopTerm),
  ]);

  const combined: PromoCode[] = [
    ...(fromKortingscode.status === 'fulfilled' ? fromKortingscode.value : []),
    ...(fromActiecode.status === 'fulfilled' ? fromActiecode.value : []),
  ];

  const seen = new Set<string>();
  return combined.filter(p => {
    if (seen.has(p.code)) return false;
    seen.add(p.code);
    return true;
  });
}

// ─── Supabase persistence ─────────────────────────────────────────────────────

async function upsertProduct(
  supabase: ReturnType<typeof createClient>,
  data: {
    shop_slug: string;
    shop_product_id: string;
    name: string;
    brand: string | null;
    image_url: string | null;
    current_price: number;
    affiliate_url: string;
    original_url: string;
    user_id: string;
    category: string | null;
    specs: Record<string, string> | null;
    shop_links: ShopLink[] | null;
  }
): Promise<string | null> {
  const { data: row, error } = await supabase
    .from('scanned_products')
    .upsert(
      { ...data, updated_at: new Date().toISOString() },
      { onConflict: 'shop_slug,shop_product_id', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (error) {
    console.warn('upsertProduct error:', error.message);
    return null;
  }
  return row?.id ?? null;
}

async function addPricePoint(
  supabase: ReturnType<typeof createClient>,
  productId: string,
  price: number
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: last } = await supabase
    .from('scanned_price_history')
    .select('price, checked_at')
    .eq('scanned_product_id', productId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last) {
    const lastDate = (last.checked_at as string).slice(0, 10);
    if (lastDate === today && Number(last.price) === price) return;
  }

  await supabase.from('scanned_price_history').insert({
    scanned_product_id: productId,
    price,
    checked_at: new Date().toISOString(),
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) {
    return new Response(JSON.stringify({ error: 'invalid_url' }), { status: 400 });
  }

  const parsed = parseShopUrl(rawUrl);
  if (!parsed) {
    return new Response(JSON.stringify({ error: 'invalid_url' }), { status: 400 });
  }

  const productData = await fetchProductData(rawUrl, parsed.shopSlug, parsed.shopDisplayName, parsed.productId);
  console.log('[scan-product] shopSlug:', parsed.shopSlug, 'name:', productData?.name, 'price:', productData?.price);
  if (!productData?.name) {
    return new Response(JSON.stringify({ error: 'product_not_found' }), { status: 422 });
  }

  // Detect category
  const category = detectCategory(productData.name, productData.brand);

  // Content moderation
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const blocked = await isBlocked(supabaseAdmin, productData.name, category);
  if (blocked) {
    return new Response(JSON.stringify({ error: 'blocked_content' }), { status: 403 });
  }

  const promoCodes = await getPromoCodes(parsed.shopSlug).catch(() => [] as PromoCode[]);

  const price = productData.price ?? 0;
  const shopProductId = parsed.productId
    || productData.name.toLowerCase().replace(/\s+/g, '-').slice(0, 60)
    || Date.now().toString();

  const productId = await upsertProduct(supabaseAdmin, {
    shop_slug: parsed.shopSlug,
    shop_product_id: shopProductId,
    name: productData.name,
    brand: productData.brand,
    image_url: productData.imageUrl,
    current_price: price,
    affiliate_url: parsed.affiliateUrl,
    original_url: parsed.canonicalUrl,
    user_id: user.id,
    category,
    specs: productData.specs,
    shop_links: productData.shopLinks.length > 0 ? productData.shopLinks : null,
  });

  if (productId && price > 0) {
    await addPricePoint(supabaseAdmin, productId, price);
  }

  const response: ScanResponse = {
    affiliateUrl: parsed.affiliateUrl,
    name: productData.name,
    brand: productData.brand,
    imageUrl: productData.imageUrl,
    price: productData.price,
    shopDisplayName: parsed.shopDisplayName,
    shopSlug: parsed.shopSlug,
    promoCodes,
    category,
    specs: productData.specs,
    shopLinks: productData.shopLinks,
  };

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
