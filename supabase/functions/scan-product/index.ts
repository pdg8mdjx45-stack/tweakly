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
const ZENROWS_API_KEY = Deno.env.get('ZENROWS_API_KEY') ?? '';
const FETCH_PROXY_URL = 'https://tracr-fetch-proxy.alexander-ballet8111.workers.dev/fetch';

// Shops that need ZenRows proxy (block Supabase datacenter IPs).
const ZENROWS_SHOPS = new Set([
  'bol-com', 'zalando', 'zalando-lounge', 'decathlon', 'kruidvat', 'etos',
  'wehkamp', 'hm', 'zara', 'nike', 'adidas', 'asos', 'amazon-nl',
  'coolblue', 'mediamarkt', 'alternate', 'bcc', 'fnac', 'krefel',
  'blokker', 'hema', 'action', 'lidl', 'douglas', 'ici-paris',
  'ikea', 'praxis', 'intersport', 'jd-sports', 'foot-locker',
  'omoda', 'van-haren', 'scapino', 'schuurman', 'nelson', 'sacha', 'torfs',
  'puma', 'new-balance', 'vans', 'converse', 'mango', 'pull-bear', 'uniqlo', 'zara-home',
  'about-you', 'shein',
]);
const ZENROWS_JS_RENDER = new Set([
  'bol-com', 'zalando', 'zalando-lounge', 'wehkamp', 'hm', 'zara',
  'nike', 'adidas', 'asos', 'amazon-nl', 'coolblue', 'mediamarkt',
  'alternate', 'about-you', 'shein', 'zara-home',
]);

// Shops that need residential proxies to bypass datacenter IP blocks.
const RESIDENTIAL_PROXY_SHOPS = new Set([
  'bol-com', 'zalando', 'zalando-lounge', 'amazon-nl', 'coolblue',
  'mediamarkt', 'alternate', 'wehkamp', 'nike', 'adidas', 'asos',
]);

// Shops that need a custom User-Agent forwarded to ZenRows (currently unused — premium_proxy handles Bol)
const ZENROWS_CUSTOM_UA: Record<string, string> = {};

async function fetchViaZenRows(
  url: string,
  jsRender: boolean,
  premiumProxy = false,
  antibot = false,
  shopSlug?: string,
): Promise<Response> {
  const params = new URLSearchParams({ url, apikey: ZENROWS_API_KEY });
  if (jsRender) params.set('js_render', 'true');
  if (premiumProxy) params.set('premium_proxy', 'true');
  if (antibot) params.set('antibot', 'true');
  // Forward a custom User-Agent for shops that whitelist specific bots
  const customUa = shopSlug ? ZENROWS_CUSTOM_UA[shopSlug] : undefined;
  if (customUa) {
    params.set('custom_headers', 'true');
    const timeoutMs = antibot ? 90_000 : 45_000;
    return fetch(`https://api.zenrows.com/v1/?${params}`, {
      headers: { 'User-Agent': customUa },
      signal: AbortSignal.timeout(timeoutMs),
    });
  }
  // antibot requests can take up to 90s; non-antibot 45s
  const timeoutMs = antibot ? 90_000 : 45_000;
  return fetch(`https://api.zenrows.com/v1/?${params}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
}

const DIRECT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

// Shop-specific User-Agent overrides that bypass bot detection
const SHOP_USER_AGENTS: Record<string, string> = {
  'bol-com': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

// Shops that route through the Cloudflare Worker proxy (bypasses datacenter IP blocks for free)
const FETCH_PROXY_SHOPS = new Set(['bol-com']);

async function tryFetchProxy(url: string): Promise<{ html: string } | null> {
  try {
    const res = await fetch(FETCH_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn('[fetch-proxy] non-ok:', res.status, err.slice(0, 200));
      return null;
    }
    const data = await res.json() as { html?: string; status?: number; error?: string };
    if (data.error || !data.html) {
      console.warn('[fetch-proxy] error:', data.error);
      return null;
    }
    console.log('[fetch-proxy] ok, htmlLen:', data.html.length);
    return { html: data.html };
  } catch (e) {
    console.warn('[fetch-proxy] failed:', (e as Error).message);
    return null;
  }
}

async function tryDirect(url: string, shopSlug?: string): Promise<{ html: string } | null> {
  const ua = shopSlug ? (SHOP_USER_AGENTS[shopSlug] ?? DIRECT_HEADERS['User-Agent']) : DIRECT_HEADERS['User-Agent'];
  try {
    const res = await fetch(url, {
      headers: { ...DIRECT_HEADERS, 'User-Agent': ua },
      signal: AbortSignal.timeout(20_000),
    });
    console.log('[direct]', url.slice(0, 80), 'status:', res.status);
    if (res.ok) return { html: await res.text() };
  } catch (e) {
    console.warn('[direct] failed:', (e as Error).message);
  }
  return null;
}

async function tryZenRows(url: string, jsRender: boolean, premiumProxy = false, antibot = false, shopSlug?: string): Promise<{ html: string } | null> {
  if (!ZENROWS_API_KEY) return null;
  try {
    const res = await fetchViaZenRows(url, jsRender, premiumProxy, antibot, shopSlug);
    const zrStatus = res.headers.get('zr-status') ?? res.headers.get('x-zr-status') ?? 'unknown';
    console.log('[zenrows js=' + jsRender + ']', url.slice(0, 80), 'http:', res.status, 'zr-status:', zrStatus);
    // Log response headers for diagnosis
    const hdrs: Record<string,string> = {};
    res.headers.forEach((v,k) => { hdrs[k] = v; });
    console.log('[zenrows headers]', JSON.stringify(hdrs).slice(0, 300));
    if (res.ok) {
      // zr-content-encoding: gzip is informational (what origin sent); ZenRows decodes before forwarding.
      // Only decompress if the actual transfer Content-Encoding header says gzip.
      let html: string;
      const transferEncoding = res.headers.get('content-encoding') ?? '';
      if (transferEncoding.includes('gzip') && res.body) {
        try {
          const decompressed = res.body.pipeThrough(new DecompressionStream('gzip'));
          html = await new Response(decompressed).text();
        } catch {
          html = await res.text();
        }
      } else {
        html = await res.text();
      }
      console.log('[zenrows html-length]', html.length, 'preview:', html.slice(0,200).replace(/\s+/g,' '));
      // Detect bot challenge pages
      // Only flag as challenge if it looks like a bot-protection gate (short + no product content)
      // Note: /.well-known/sbsd/ appears on real Bol pages too — not a reliable indicator
      const isChallenge = html.includes('Just a moment') ||
        html.includes('cf-browser-verification') ||
        (html.length < 5000 && (
          html.includes('<title>Challenge Page</title>') ||
          html.includes('sec-if-cpt-container')
        ));
      if (isChallenge) {
        console.warn('[zenrows] got challenge page, html length:', html.length);
        return null;
      }
      return { html };
    }
    // Read error body
    const errBody = await res.text().catch(() => '');
    console.warn('[zenrows] non-ok status', res.status, errBody.slice(0, 200));
  } catch (e) {
    console.warn('[zenrows] failed:', (e as Error).message);
  }
  return null;
}

async function fetchWithFallback(url: string, shopSlug: string): Promise<{ html: string } | null> {
  // Try Cloudflare Worker proxy first for shops that need it (free, fast, bypasses datacenter blocks)
  if (FETCH_PROXY_SHOPS.has(shopSlug)) {
    const proxy = await tryFetchProxy(url);
    if (proxy) return proxy;
  }

  const useZenRows = ZENROWS_API_KEY && ZENROWS_SHOPS.has(shopSlug);
  const jsRender = ZENROWS_JS_RENDER.has(shopSlug);
  const needsResidential = RESIDENTIAL_PROXY_SHOPS.has(shopSlug);

  if (useZenRows) {
    if (needsResidential) {
      // Level 1: antibot + JS render + residential (slow ~60-90s for Bol's Cloudflare protection)
      const zr = await tryZenRows(url, true, true, true, shopSlug);
      if (zr) return zr;
      // Level 2: residential + JS render (no antibot)
      const zr2 = await tryZenRows(url, jsRender, true, false, shopSlug);
      if (zr2) return zr2;
      // Level 3: residential without JS render
      const zr3 = await tryZenRows(url, false, true, false, shopSlug);
      if (zr3) return zr3;
    } else {
      // Standard ZenRows (datacenter proxy)
      const zr = await tryZenRows(url, jsRender, false, false, shopSlug);
      if (zr) return zr;
      if (jsRender) {
        const zr2 = await tryZenRows(url, false, false, false, shopSlug);
        if (zr2) return zr2;
      }
    }
  }

  // Direct fetch — for Bol use _/ URL with Googlebot UA to bypass Cloudflare
  let directUrl = url;
  if (shopSlug === 'bol-com') {
    try {
      const u = new URL(url);
      u.pathname = u.pathname.replace(
        /^(\/(?:nl\/)?(?:nl\/)?)p\/[^/]+\/([\d]+)\/?$/,
        '$1p/_/$2/'
      );
      directUrl = u.toString();
    } catch { /* use original */ }
  }
  const direct = await tryDirect(directUrl, shopSlug);
  if (direct) return direct;

  // Last resort: ZenRows for any unrecognised shop
  if (ZENROWS_API_KEY && !useZenRows) {
    const zr = await tryZenRows(url, false, false);
    if (zr) return zr;
  }

  return null;
}

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
  productId: string | null;
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
  colorVariants: ColorVariant[];
  scannedColor: string;
  scannedStorage: string;
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

// --- Product identity matching ------------------------------------------------

const IDENTITY_STOPWORDS = new Set([
  'de', 'het', 'een', 'and', 'with', 'voor', 'van', 'met', 'zonder', 'los', 'toestel',
  'smartphone', 'telefoon', 'mobile', 'phone', 'gsm', 'simvrij', 'unlocked', 'nieuw',
  'new', 'inch', 'wifi', 'cellular', 'bluetooth', 'refurbished', 'renewed', 'model',
  'serie', 'series', 'gen', 'generation', 'editie', 'edition', 'versie', 'version',
  'gbps', 'hz', 'mah', 'mp', 'dual', 'nano', 'esim', '5g', '4g',
]);

const VARIANT_MARKERS = new Set([
  'pro', 'plus', 'max', 'ultra', 'mini', 'se', 'fe', 'air', 'xl', 'fold', 'flip',
]);

const FAMILY_TOKENS = new Set([
  'iphone', 'ipad', 'macbook', 'airpods', 'watch', 'galaxy', 'pixel', 'xperia',
  'playstation', 'xbox', 'switch', 'surface', 'thinkpad', 'zenbook', 'vivobook',
  'legion', 'ideapad', 'rog', 'tuf', 'rtx', 'gtx', 'radeon', 'ryzen', 'inspiron',
  'xps', 'latitude', 'pavilion', 'spectre', 'envy', 'aspire', 'predator',
]);

const COLOR_ALIASES: Record<string, string> = {
  zwart: 'black',
  black: 'black',
  wit: 'white',
  white: 'white',
  blauw: 'blue',
  blue: 'blue',
  groen: 'green',
  green: 'green',
  grijs: 'gray',
  grey: 'gray',
  gray: 'gray',
  zilver: 'silver',
  silver: 'silver',
  goud: 'gold',
  gold: 'gold',
  roze: 'pink',
  pink: 'pink',
  paars: 'purple',
  purple: 'purple',
  rood: 'red',
  red: 'red',
  titanium: 'titanium',
  naturel: 'natural',
  natural: 'natural',
  desert: 'desert',
};

const BRAND_PATTERNS: Array<{ pattern: RegExp; brand: string }> = [
  { pattern: /\biphone\b|\bipad\b|\bmacbook\b|\bairpods\b|\bapple watch\b/i, brand: 'apple' },
  { pattern: /\bgalaxy\b|\btab s\d+\b|\bwatch\d*\b/i, brand: 'samsung' },
  { pattern: /\bpixel\b/i, brand: 'google' },
  { pattern: /\bxperia\b|\bplaystation\b/i, brand: 'sony' },
  { pattern: /\bthinkpad\b|\blegion\b|\bideapad\b|\byoga\b/i, brand: 'lenovo' },
  { pattern: /\bzenbook\b|\bvivobook\b|\brog\b|\btuf\b/i, brand: 'asus' },
  { pattern: /\bxps\b|\blatitude\b|\binspiron\b|\balienware\b/i, brand: 'dell' },
  { pattern: /\bpavilion\b|\bomen\b|\bspectre\b|\benvy\b/i, brand: 'hp' },
  { pattern: /\bryzen\b|\bradeon\b/i, brand: 'amd' },
  { pattern: /\bcore\s*i\d\b|\bcore ultra\b/i, brand: 'intel' },
  { pattern: /\brtx\b|\bgtx\b|\bgeforce\b/i, brand: 'nvidia' },
];

interface IdentityInput {
  name: string;
  brand: string | null;
  category: string | null;
  specs: Record<string, string> | null;
}

interface ProductIdentity {
  brand: string;
  category: string;
  normalizedName: string;
  storage: string;
  color: string;
  signatureTokens: string[];
  modelTokens: string[];
  variantMarkers: string[];
  identityKey: string;
}

interface ColorVariant {
  color: string;
  storage: string;
  imageUrl: string | null;
  affiliateUrl: string;
  shopLinks: ShopLink[];
}

interface ScannedProductRow {
  id: string;
  shop_slug: string;
  shop_product_id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  current_price: number;
  affiliate_url: string;
  original_url: string;
  user_id: string | null;
  category: string | null;
  specs: Record<string, string> | null;
  shop_links: ShopLink[] | null;
  color_variants: ColorVariant[] | null;
}

interface PersistedProduct {
  id: string;
  current_price: number;
  shop_links: ShopLink[] | null;
  color_variants: ColorVariant[] | null;
}

function normalizeIdentityText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/\b(\d+)\s*(gb|tb)\b/gi, '$1$2')
    .replace(/[^\w\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBrandName(brand: string | null, name: string): string {
  const normalized = normalizeIdentityText(brand ?? '');
  if (normalized) return normalized;

  for (const rule of BRAND_PATTERNS) {
    if (rule.pattern.test(name)) return rule.brand;
  }

  const firstToken = normalizeIdentityText(name).split(' ')[0] ?? '';
  return firstToken;
}

function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens.filter(Boolean))];
}

function extractStorage(value: string, specs: Record<string, string> | null): string {
  const specCandidates = [
    specs?.Opslag,
    specs?.Storage,
    specs?.Geheugen,
    specs?.Capacity,
  ].filter((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0);

  for (const candidate of [value, ...specCandidates]) {
    const match = candidate.match(/\b(\d+(?:\.\d+)?)\s*(tb|gb)\b/i);
    if (match) return `${match[1]}${match[2].toLowerCase()}`;
  }
  return '';
}

function extractColor(value: string, specs: Record<string, string> | null): string {
  const text = normalizeIdentityText(`${value} ${specs?.Kleur ?? ''} ${specs?.Color ?? ''}`);
  const tokens = new Set(text.split(' '));
  for (const [raw, canonical] of Object.entries(COLOR_ALIASES)) {
    if (tokens.has(raw)) return canonical;
  }
  return '';
}

function extractVariantMarkers(value: string): string[] {
  return uniqueTokens(
    normalizeIdentityText(value)
      .split(' ')
      .filter(token => VARIANT_MARKERS.has(token)),
  ).sort();
}

function extractModelTokens(tokens: string[]): string[] {
  const modelTokens = tokens.filter(token => /\d/.test(token) || FAMILY_TOKENS.has(token) || VARIANT_MARKERS.has(token));
  return uniqueTokens(modelTokens).sort();
}

function buildProductIdentity(input: IdentityInput): ProductIdentity {
  const normalizedName = normalizeIdentityText(input.name);
  const brand = normalizeBrandName(input.brand, input.name);
  const category = normalizeIdentityText(input.category ?? '');
  const storage = extractStorage(input.name, input.specs);
  const color = extractColor(input.name, input.specs);

  const signatureTokens = uniqueTokens(
    normalizedName
      .split(' ')
      .filter(token => token.length > 1)
      .filter(token => !IDENTITY_STOPWORDS.has(token))
      .filter(token => token !== brand)
      .filter(token => COLOR_ALIASES[token] === undefined),
  ).sort();

  const variantMarkers = extractVariantMarkers(input.name);
  const modelTokens = extractModelTokens(signatureTokens);
  const keyParts = [brand, category, storage, ...modelTokens].filter(Boolean);

  return {
    brand,
    category,
    normalizedName,
    storage,
    color,
    signatureTokens,
    modelTokens,
    variantMarkers,
    identityKey: keyParts.join('|'),
  };
}

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const bSet = new Set(b);
  let matches = 0;
  for (const token of a) {
    if (bSet.has(token)) matches++;
  }
  return matches / Math.max(a.length, b.length);
}

function sameVariantMarkers(a: string[], b: string[]): boolean {
  if (a.length === 0 && b.length === 0) return true;
  if (a.length === 0 || b.length === 0) return false;
  return a.length === b.length && a.every((token, index) => token === b[index]);
}

function compareProductIdentity(a: ProductIdentity, b: ProductIdentity): number {
  if (a.brand && b.brand && a.brand !== b.brand) return 0;
  if (a.category && b.category && a.category !== b.category) return 0;
  // Storage and color are variant dimensions — don't veto on mismatches.
  if (!sameVariantMarkers(a.variantMarkers, b.variantMarkers)) return 0;

  const modelOverlap = overlapRatio(a.modelTokens, b.modelTokens);
  if (a.modelTokens.length > 0 && b.modelTokens.length > 0 && modelOverlap === 0) return 0;

  const tokenOverlap = overlapRatio(a.signatureTokens, b.signatureTokens);
  if (tokenOverlap < 0.45) return 0;

  let score = tokenOverlap * 0.6 + modelOverlap * 0.25;
  if (a.brand && b.brand && a.brand === b.brand) score += 0.1;
  if (a.storage && b.storage && a.storage === b.storage) score += 0.05;
  if (a.identityKey && a.identityKey === b.identityKey) score += 0.1;

  return Math.min(score, 1);
}

function normalizeShopLink(link: ShopLink): ShopLink | null {
  if (!link?.url) return null;
  const price = link.price != null && Number.isFinite(Number(link.price)) ? Number(link.price) : null;
  return {
    name: String(link.name || '').trim() || 'Onbekende shop',
    price,
    url: String(link.url).trim(),
  };
}

function normalizeUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function mergeShopLinks(existing: ShopLink[] | null, incoming: ShopLink[] | null): ShopLink[] | null {
  const merged = new Map<string, ShopLink>();

  for (const source of [...(existing ?? []), ...(incoming ?? [])]) {
    const normalized = normalizeShopLink(source);
    if (!normalized) continue;

    const key = `${normalizeIdentityText(normalized.name)}|${normalizeUrlKey(normalized.url)}`;
    const previous = merged.get(key);
    if (!previous) {
      merged.set(key, normalized);
      continue;
    }

    const bestPrice =
      previous.price == null ? normalized.price
      : normalized.price == null ? previous.price
      : Math.min(previous.price, normalized.price);

    merged.set(key, {
      name: previous.name.length >= normalized.name.length ? previous.name : normalized.name,
      price: bestPrice,
      url: previous.url.length <= normalized.url.length ? previous.url : normalized.url,
    });
  }

  const result = [...merged.values()].sort((a, b) => {
    if (a.price == null && b.price == null) return a.name.localeCompare(b.name);
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return a.price - b.price;
  });

  return result.length > 0 ? result : null;
}

function pickPrimaryOffer(
  shopLinks: ShopLink[] | null,
  fallbackUrl: string,
  fallbackPrice: number,
  fallbackName: string,
): ShopLink {
  const candidates = (shopLinks ?? []).filter(link => !!link.url);
  const priced = candidates
    .filter(link => link.price != null && link.price > 0)
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

  return priced[0] ?? candidates[0] ?? {
    name: fallbackName,
    price: fallbackPrice > 0 ? fallbackPrice : null,
    url: fallbackUrl,
  };
}

function mergeSpecs(
  existing: Record<string, string> | null,
  incoming: Record<string, string> | null,
): Record<string, string> | null {
  const merged = {
    ...(existing ?? {}),
    ...(incoming ?? {}),
  };
  return Object.keys(merged).length > 0 ? merged : null;
}

function mergeColorVariants(
  existing: ColorVariant[] | null,
  incomingColor: string,
  incomingStorage: string,
  incomingImageUrl: string | null,
  incomingAffiliateUrl: string,
  incomingShopLinks: ShopLink[],
): ColorVariant[] {
  // Key on color+storage so e.g. "black 128gb" and "black 256gb" are separate variants
  const variantKey = [incomingColor, incomingStorage].filter(Boolean).join('|') || 'default';
  const variants: Map<string, ColorVariant> = new Map(
    (existing ?? []).map(v => {
      const key = [v.color, v.storage].filter(Boolean).join('|') || 'default';
      return [key, v];
    })
  );

  const prev = variants.get(variantKey);
  if (prev) {
    variants.set(variantKey, {
      color: incomingColor,
      storage: incomingStorage,
      imageUrl: incomingImageUrl ?? prev.imageUrl,
      affiliateUrl: incomingAffiliateUrl,
      shopLinks: mergeShopLinks(prev.shopLinks, incomingShopLinks) ?? incomingShopLinks,
    });
  } else {
    variants.set(variantKey, {
      color: incomingColor,
      storage: incomingStorage,
      imageUrl: incomingImageUrl,
      affiliateUrl: incomingAffiliateUrl,
      shopLinks: incomingShopLinks,
    });
  }

  return [...variants.values()].sort((a, b) => {
    const aKey = [a.storage, a.color].filter(Boolean).join(' ');
    const bKey = [b.storage, b.color].filter(Boolean).join(' ');
    return aKey.localeCompare(bKey);
  });
}

function choosePreferredName(existingName: string, incomingName: string): string {
  const current = existingName.trim();
  const next = incomingName.trim();
  if (!current) return next;
  if (!next) return current;

  const currentTokens = buildProductIdentity({ name: current, brand: null, category: null, specs: null }).signatureTokens.length;
  const nextTokens = buildProductIdentity({ name: next, brand: null, category: null, specs: null }).signatureTokens.length;
  if (nextTokens > currentTokens) return next;
  if (nextTokens === currentTokens && next.length > current.length && next.length - current.length <= 24) return next;
  return current;
}

async function findCanonicalProductMatch(
  supabase: ReturnType<typeof createClient>,
  incoming: IdentityInput,
  excludeId?: string,
): Promise<ScannedProductRow | null> {
  const fields = 'id, shop_slug, shop_product_id, name, brand, image_url, current_price, affiliate_url, original_url, user_id, category, specs, shop_links, color_variants';
  const seen = new Map<string, ScannedProductRow>();

  const collect = async (queryBuilder: any) => {
    const { data, error } = await queryBuilder;
    if (error || !data) return;
    for (const row of data as ScannedProductRow[]) {
      if (excludeId && row.id === excludeId) continue;
      seen.set(row.id, row);
    }
  };

  const normalizedBrand = normalizeBrandName(incoming.brand, incoming.name);

  if (incoming.category && normalizedBrand) {
    await collect(
      supabase
        .from('scanned_products')
        .select(fields)
        .eq('category', incoming.category)
        .ilike('brand', normalizedBrand)
        .order('updated_at', { ascending: false })
        .limit(60),
    );
  }

  if (incoming.category) {
    await collect(
      supabase
        .from('scanned_products')
        .select(fields)
        .eq('category', incoming.category)
        .order('updated_at', { ascending: false })
        .limit(120),
    );
  }

  if (normalizedBrand) {
    await collect(
      supabase
        .from('scanned_products')
        .select(fields)
        .ilike('brand', normalizedBrand)
        .order('updated_at', { ascending: false })
        .limit(120),
    );
  }

  if (seen.size === 0) {
    await collect(
      supabase
        .from('scanned_products')
        .select(fields)
        .order('updated_at', { ascending: false })
        .limit(150),
    );
  }

  const targetIdentity = buildProductIdentity(incoming);
  let best: { row: ScannedProductRow; score: number } | null = null;

  for (const row of seen.values()) {
    const candidateIdentity = buildProductIdentity({
      name: row.name,
      brand: row.brand,
      category: row.category,
      specs: row.specs,
    });
    const score = compareProductIdentity(targetIdentity, candidateIdentity);
    if (score < 0.82) continue;
    if (!best || score > best.score) {
      best = { row, score };
    }
  }

  return best?.row ?? null;
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

const AMAZON_TAG = 'tracr08-20';

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
      // Bol.com URLs: /nl/p/<slug>/<id>/ — the numeric ID may be last or second-to-last segment
      const segments = url.pathname.split('/').filter(Boolean);
      for (let i = segments.length - 1; i >= 0; i--) {
        if (/^\d{9,}$/.test(segments[i])) return segments[i];
      }
      // Shorter numeric IDs (legacy)
      for (let i = segments.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(segments[i])) return segments[i];
      }
      return '';
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

  // ── Fashion ──────────────────────────────────────────────────────────────────
  {
    slug: 'nike',
    displayName: 'Nike',
    hostPatterns: [/nike\.com$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'hm',
    displayName: 'H&M',
    hostPatterns: [/hm\.com$/],
    extractProductId(url) {
      const m = url.pathname.match(/productpage\.(\d+)\.html/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'asos',
    displayName: 'ASOS',
    hostPatterns: [/asos\.com$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/prd\/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'zara',
    displayName: 'Zara',
    hostPatterns: [/zara\.com$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d{5,})/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'zara-home',
    displayName: 'Zara Home',
    hostPatterns: [/zarahome\.com$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d{5,})/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'about-you',
    displayName: 'About You',
    hostPatterns: [/aboutyou\.(nl|be|de|com)$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)$/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'shein',
    displayName: 'Shein',
    hostPatterns: [/shein\.(com|nl)$/],
    extractProductId(url) {
      const m = url.pathname.match(/-p-(\d+)\.html/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'mango',
    displayName: 'Mango',
    hostPatterns: [/mango\.com$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'pull-bear',
    displayName: 'Pull&Bear',
    hostPatterns: [/pullandbear\.com$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d{5,})/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'uniqlo',
    displayName: 'Uniqlo',
    hostPatterns: [/uniqlo\.com$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/products\/(\w+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },

  // ── Sports & shoes ────────────────────────────────────────────────────────────
  {
    slug: 'decathlon',
    displayName: 'Decathlon',
    hostPatterns: [/decathlon\.(nl|be)$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'intersport',
    displayName: 'Intersport',
    hostPatterns: [/intersport\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'jd-sports',
    displayName: 'JD Sports',
    hostPatterns: [/jdsports\.(nl|be)$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'foot-locker',
    displayName: 'Foot Locker',
    hostPatterns: [/footlocker\.(nl|be)$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\w{5,})/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'adidas',
    displayName: 'Adidas',
    hostPatterns: [/adidas\.(nl|com)$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/([A-Z0-9]{6})(?:\.html)?$/i);
      return m ? m[1].toUpperCase() : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'puma',
    displayName: 'Puma',
    hostPatterns: [/puma\.com$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/pd\/[^/]+\/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'new-balance',
    displayName: 'New Balance',
    hostPatterns: [/newbalance\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'vans',
    displayName: 'Vans',
    hostPatterns: [/vans\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'converse',
    displayName: 'Converse',
    hostPatterns: [/converse\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'omoda',
    displayName: 'Omoda',
    hostPatterns: [/omoda\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'van-haren',
    displayName: 'Van Haren',
    hostPatterns: [/vanharen\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'scapino',
    displayName: 'Scapino',
    hostPatterns: [/scapino\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'torfs',
    displayName: 'Torfs',
    hostPatterns: [/torfs\.be$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'sacha',
    displayName: 'Sacha',
    hostPatterns: [/sacha\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'schuurman',
    displayName: 'Schuurman Schoenen',
    hostPatterns: [/schuurman\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'nelson',
    displayName: 'Nelson',
    hostPatterns: [/nelson\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },

  // ── Electronics & home improvement ───────────────────────────────────────────
  {
    slug: 'praxis',
    displayName: 'Praxis',
    hostPatterns: [/praxis\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'krefel',
    displayName: 'Krefel',
    hostPatterns: [/krefel\.be$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'bcc',
    displayName: 'BCC',
    hostPatterns: [/bcc\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'fnac',
    displayName: 'Fnac',
    hostPatterns: [/fnac\.(be|nl)$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },

  // ── General & department stores ───────────────────────────────────────────────
  {
    slug: 'hema',
    displayName: 'HEMA',
    hostPatterns: [/hema\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'blokker',
    displayName: 'Blokker',
    hostPatterns: [/blokker\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'action',
    displayName: 'Action',
    hostPatterns: [/action\.com$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'lidl',
    displayName: 'Lidl',
    hostPatterns: [/lidl\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'kruidvat',
    displayName: 'Kruidvat',
    hostPatterns: [/kruidvat\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },

  // ── Beauty & fragrance ────────────────────────────────────────────────────────
  {
    slug: 'ici-paris',
    displayName: 'ICI PARIS XL',
    hostPatterns: [/iciparisxl\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'douglas',
    displayName: 'Douglas',
    hostPatterns: [/douglas\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },
  {
    slug: 'etos',
    displayName: 'Etos',
    hostPatterns: [/etos\.nl$/],
    extractProductId(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const last = segments[segments.length - 1];
      const m = last?.match(/(\d+)/);
      return m ? m[1] : '';
    },
    buildAffiliateUrl(canonical) { return canonical; },
  },

  // ── Furniture & home ──────────────────────────────────────────────────────────
  {
    slug: 'ikea',
    displayName: 'IKEA',
    hostPatterns: [/ikea\.com$/],
    extractProductId(url) {
      const m = url.pathname.match(/\/p\/.*-(\d{8,})/i);
      return m ? m[1] : '';
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

// ─── Search result → product URL resolver ────────────────────────────────────

/**
 * Given a shop search-results page HTML, extract the URL of the first product.
 * Returns null when the page doesn't look like a search results page or no
 * product link is found (caller falls through to the normal scraping layers).
 */
function extractFirstProductUrlFromSearch(html: string, shopSlug: string, origin: string): string | null {
  switch (shopSlug) {
    case 'bol-com': {
      // Product links: /nl/p/<slug>/<productId>/ or /nl/p/<productId>/
      const m = html.match(/href="(\/(?:nl\/)?p\/[^"]+\/\d{9,}\/?)"/);
      return m ? `https://www.bol.com${m[1]}` : null;
    }
    case 'amazon-nl': {
      // /dp/ASIN or /gp/product/ASIN
      const m = html.match(/href="(\/(?:dp|gp\/product)\/[A-Z0-9]{10}[^"]*?)"/);
      return m ? `https://www.amazon.nl${m[1].split('?')[0]}` : null;
    }
    case 'coolblue': {
      // Product links: /producten/<slug>/<id>.html
      const m = html.match(/href="(\/producten\/[^"]+\.html)"/);
      return m ? `https://www.coolblue.nl${m[1]}` : null;
    }
    case 'mediamarkt': {
      // /nl/product/<slug>/<id>.html
      const m = html.match(/href="(\/nl\/product\/[^"]+\.html)"/);
      return m ? `https://www.mediamarkt.nl${m[1]}` : null;
    }
    case 'alternate': {
      // Product links: /product/<id>/<slug>.html
      const m = html.match(/href="(\/product\/\d+\/[^"]+\.html)"/);
      return m ? `https://www.alternate.nl${m[1]}` : null;
    }
    case 'bcc': {
      const m = html.match(/href="(\/[^"]+\/p\/\d+[^"]*?)"/);
      return m ? `https://www.bcc.nl${m[1].split('?')[0]}` : null;
    }
    case 'wehkamp': {
      const m = html.match(/href="(\/p\/[^"]+\/\d+[^"]*?)"/);
      return m ? `https://www.wehkamp.nl${m[1].split('?')[0]}` : null;
    }
    case 'blokker': {
      const m = html.match(/href="(\/[^"]+\/p\/\d+[^"]*?)"/);
      return m ? `https://www.blokker.nl${m[1].split('?')[0]}` : null;
    }
    case 'hema': {
      const m = html.match(/href="(\/nl-nl\/[^"]+\/[^"]+\/\d+[^"]*?)"/);
      return m ? `https://www.hema.nl${m[1].split('?')[0]}` : null;
    }
    case 'kruidvat': {
      // Product URLs: /{product-slug}/p/{numeric-id}
      const m = html.match(/href="(\/[^"]+\/p\/\d+[^"?]*)"/);
      return m ? `https://www.kruidvat.nl${m[1]}` : null;
    }
    case 'etos': {
      // Product URLs: /producten/{slug-with-id}.html
      const m = html.match(/href="(\/producten\/[^"]+\.html)"/);
      return m ? `https://www.etos.nl${m[1].split('?')[0]}` : null;
    }
    case 'douglas': {
      // Product URLs: /nl/p/{numeric-id}
      const m = html.match(/href="(\/nl\/p\/\d+[^"?]*)"/);
      return m ? `https://www.douglas.nl${m[1]}` : null;
    }
    case 'ici-paris': {
      // Product URLs: /{category}/{slug}/p/{numeric-id} or similar
      const m = html.match(/href="(\/[^"]+\/p\/\d+[^"?]*)"/);
      return m ? `https://www.iciparisxl.nl${m[1]}` : null;
    }
    case 'decathlon': {
      const m = html.match(/href="(\/[^"]+\/p\/[^"]+)"/);
      return m ? `https://www.decathlon.nl${m[1].split('?')[0]}` : null;
    }
    default:
      return null;
  }
}

/** Returns true when the URL looks like a search/listing page rather than a product page */
function isSearchUrl(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  const search = url.search.toLowerCase();
  return (
    path.includes('/search') ||
    path.includes('/zoeken') ||
    path.includes('/s/') ||
    search.includes('searchtext=') ||
    search.includes('query=') ||
    search.includes('q=') ||
    search.includes('k=') ||
    search.includes('text=')
  );
}

// ─── Layer 1: Shop-specific embedded JSON extractors ─────────────────────────

/** Safely walk a nested object by dot-path, e.g. "props.pageProps.product" */
function dig(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur == null || typeof cur !== 'object') return undefined;
    return (cur as Record<string, unknown>)[key];
  }, obj);
}

/** Pick the first truthy value from multiple paths */
function pickPath(obj: unknown, ...paths: string[]): unknown {
  for (const p of paths) {
    const v = dig(obj, p);
    if (v != null && v !== '') return v;
  }
  return undefined;
}

function safeParseJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}

/** Parse the __NEXT_DATA__ script block and return its JSON */
function parseNextData(html: string): unknown {
  const m = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  return safeParseJson(m[1]);
}

type BaseProduct = Omit<ProductData, 'specs' | 'shopLinks'>;

/** Coerce a raw value to a price number or null */
function toPrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : raw;
  return parsePrice(raw);
}

/** Build a BaseProduct from loose key candidates on a plain object */
function resolveProductFields(obj: unknown): BaseProduct | null {
  if (!obj || typeof obj !== 'object') return null;
  const o = obj as Record<string, unknown>;

  const name = String(
    o['name'] ?? o['title'] ?? o['displayName'] ?? o['productName'] ?? o['product_name'] ?? ''
  ).trim();
  if (!name) return null;

  const brand = o['brand']
    ? (typeof o['brand'] === 'object'
        ? String((o['brand'] as Record<string, unknown>)['name'] ?? '')
        : String(o['brand']))
    : null;

  const rawPrice =
    o['price'] ?? o['currentPrice'] ?? o['salePrice'] ?? o['finalPrice'] ??
    (o['pricing'] as Record<string, unknown> | undefined)?.['price'] ??
    (o['priceRange'] as Record<string, unknown> | undefined)?.['min'] ??
    (o['price_range'] as Record<string, unknown> | undefined)?.['minimum_price'] ??
    null;
  const price = toPrice(rawPrice);

  const rawImage =
    o['image'] ?? o['imageUrl'] ?? o['image_url'] ?? o['thumbnail'] ??
    (Array.isArray(o['images']) ? (o['images'] as unknown[])[0] : undefined) ??
    null;
  const imageUrl = typeof rawImage === 'string'
    ? rawImage
    : (rawImage && typeof rawImage === 'object'
        ? String((rawImage as Record<string, unknown>)['url'] ?? (rawImage as Record<string, unknown>)['src'] ?? '')
        : null);

  return {
    name,
    brand: brand?.trim() || null,
    imageUrl: imageUrl?.trim() || null,
    price,
  };
}

function extractFromShopScript(html: string, shopSlug: string, productId?: string): BaseProduct | null {
  const nd = parseNextData(html);

  switch (shopSlug) {
    case 'bol-com': {
      const result = extractBolComFromHtml(html, productId);
      if (result) return result;
      break;
    }

    case 'zalando':
    case 'zalando-lounge': {
      if (nd) {
        const article = dig(nd, 'props.pageProps.article') as Record<string, unknown> | null;
        if (article) {
          const name = String(article['displayName'] ?? article['name'] ?? '').trim();
          if (name) {
            const brand = (article['brand'] as Record<string, unknown> | undefined)?.['name'];
            const displayPrice = article['displayPrice'] as Record<string, unknown> | undefined;
            const rawPrice = displayPrice?.['originalPrice'] ?? displayPrice?.['price'] ?? article['price'];
            const price = toPrice(rawPrice);
            const media = article['media'] as Record<string, unknown>[] | undefined;
            const imgPath = media?.[0]?.['path'] as string | undefined;
            const imageUrl = imgPath
              ? (imgPath.startsWith('http') ? imgPath : `https://img01.ztat.net/article/${imgPath}`)
              : null;
            return { name, brand: brand ? String(brand) : null, imageUrl: imageUrl ?? null, price };
          }
        }
      }
      break;
    }

    case 'nike': {
      if (nd) {
        const state = dig(nd, 'props.pageProps.initialState') as Record<string, unknown> | null;
        if (state) {
          const wall = dig(state, 'Wall.products') as unknown[] | undefined;
          const prod = (wall?.[0] ?? dig(state, 'productDetail.product')) as Record<string, unknown> | undefined;
          if (prod) {
            const name = String(prod['title'] ?? prod['fullTitle'] ?? prod['name'] ?? '').trim();
            if (name) {
              const price = toPrice((prod['price'] as Record<string, unknown> | undefined)?.['currentPrice'] ?? prod['price']);
              const nodes = prod['nodes'] as Record<string, unknown>[] | undefined;
              const imageUrl = String(nodes?.[0]?.['properties']?.['squarishURL'] ?? prod['image'] ?? '').trim() || null;
              return { name, brand: 'Nike', imageUrl, price };
            }
          }
        }
        // fallback: try generic next data paths
        const product = (dig(nd, 'props.pageProps.product') ?? dig(nd, 'props.pageProps.model')) as Record<string, unknown> | undefined;
        if (product) return resolveProductFields(product);
      }
      break;
    }

    case 'hm': {
      if (nd) {
        const product = dig(nd, 'props.pageProps.product') as Record<string, unknown> | null;
        if (product) {
          const name = String(product['name'] ?? '').trim();
          if (name) {
            const whitePrice = product['whitePrice'] as Record<string, unknown> | undefined;
            const price = toPrice(whitePrice?.['price'] ?? whitePrice?.['value'] ?? product['price']);
            const images = product['images'] as Record<string, unknown>[] | undefined;
            const imageUrl = images?.[0]?.['url'] as string | undefined ?? null;
            return { name, brand: 'H&M', imageUrl: imageUrl ?? null, price };
          }
        }
      }
      break;
    }

    case 'asos': {
      if (nd) {
        const product =
          (dig(nd, 'props.pageProps.initialData.product') ??
           dig(nd, 'props.pageProps.product')) as Record<string, unknown> | null;
        if (product) return resolveProductFields(product);
      }
      break;
    }

    case 'zara':
    case 'zara-home': {
      if (nd) {
        const product = dig(nd, 'props.pageProps.product') as Record<string, unknown> | null;
        if (product) return resolveProductFields(product);
      }
      break;
    }

    case 'about-you': {
      if (nd) {
        const product = dig(nd, 'props.pageProps.product') as Record<string, unknown> | null;
        if (product) {
          const name = String(product['name'] ?? '').trim();
          if (name) {
            const brandObj = product['brand'] as Record<string, unknown> | undefined;
            const brand = brandObj?.['name'] ? String(brandObj['name']) : null;
            const priceRange = product['priceRange'] as Record<string, unknown> | undefined;
            const price = toPrice(priceRange?.['min'] ?? product['price']);
            const images = product['images'] as unknown[] | undefined;
            const firstImg = images?.[0];
            const imageUrl = typeof firstImg === 'string'
              ? firstImg
              : (firstImg as Record<string, unknown> | undefined)?.['url'] as string | undefined ?? null;
            return { name, brand, imageUrl: imageUrl ?? null, price };
          }
        }
      }
      break;
    }

    case 'shein': {
      // Shein embeds in window.gbProductDetailInfo or __NEXT_DATA__
      const sheinMatch = html.match(/window\.gbProductDetailInfo\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>)/);
      if (sheinMatch) {
        const data = safeParseJson(sheinMatch[1]) as Record<string, unknown> | null;
        if (data) {
          const detail = data['detail'] as Record<string, unknown> | undefined ?? data;
          const name = String(detail['goods_name'] ?? detail['name'] ?? '').trim();
          if (name) {
            const retailPrice = detail['retailPrice'] as Record<string, unknown> | undefined;
            const price = toPrice(retailPrice?.['amount'] ?? retailPrice?.['price'] ?? detail['price']);
            const mainImg = (detail['goods_imgs'] as Record<string, unknown> | undefined)?.['main_image'];
            const imageUrl = typeof mainImg === 'object' && mainImg !== null
              ? String((mainImg as Record<string, unknown>)['origin_image'] ?? '')
              : typeof mainImg === 'string' ? mainImg : null;
            return { name, brand: 'Shein', imageUrl: imageUrl || null, price };
          }
        }
      }
      if (nd) {
        const product = dig(nd, 'props.pageProps.product') as Record<string, unknown> | null;
        if (product) return resolveProductFields(product);
      }
      break;
    }

    case 'adidas': {
      if (nd) {
        const product =
          (dig(nd, 'props.pageProps.componentProps.product') ??
           dig(nd, 'props.pageProps.product')) as Record<string, unknown> | null;
        if (product) {
          const name = String(product['name'] ?? '').trim();
          if (name) {
            const salesPrice = (product['price'] as Record<string, unknown> | undefined)?.['salesPrice'];
            const price = toPrice(
              typeof salesPrice === 'object' && salesPrice !== null
                ? (salesPrice as Record<string, unknown>)['value']
                : salesPrice ?? product['price']
            );
            const image = product['image'] as Record<string, unknown> | undefined;
            const imageUrl = String(image?.['src'] ?? image?.['url'] ?? product['imageUrl'] ?? '').trim() || null;
            return { name, brand: 'Adidas', imageUrl, price };
          }
        }
      }
      break;
    }

    case 'puma': {
      if (nd) {
        const product = dig(nd, 'props.pageProps.product') as Record<string, unknown> | null;
        if (product) {
          const name = String(product['name'] ?? '').trim();
          if (name) {
            const fv = product['formattedValue'] as string | undefined;
            const price = fv ? parsePrice(fv.replace(/[^\d.,]/g, '')) : toPrice(product['price']);
            const images = product['images'] as unknown[] | undefined;
            const firstImg = images?.[0];
            const imageUrl = typeof firstImg === 'string' ? firstImg
              : (firstImg as Record<string, unknown> | undefined)?.['url'] as string ?? null;
            return { name, brand: 'Puma', imageUrl: imageUrl ?? null, price };
          }
        }
      }
      break;
    }

    case 'ikea': {
      // IKEA uses a Redux state blob
      const ikeaMatch = html.match(/window\.__IKEA_REDUX_STATE__\s*=\s*(\{[\s\S]*?\});?\s*(?:window\.|<\/script>)/);
      if (ikeaMatch) {
        const state = safeParseJson(ikeaMatch[1]) as Record<string, unknown> | null;
        if (state) {
          const product =
            (dig(state, 'catalog.product') ?? dig(state, 'product.mainProduct')) as Record<string, unknown> | null;
          if (product) return resolveProductFields(product);
        }
      }
      // IKEA also has good JSON-LD, Layer 3 will catch it
      break;
    }

    case 'douglas':
    case 'ici-paris': {
      if (nd) {
        const product =
          (dig(nd, 'props.pageProps.product') ??
           dig(nd, 'props.pageProps.productDetail')) as Record<string, unknown> | null;
        if (product) return resolveProductFields(product);
      }
      break;
    }

    case 'hema':
    case 'kruidvat':
    case 'blokker':
    case 'etos': {
      if (nd) {
        const product =
          (dig(nd, 'props.pageProps.product') ??
           dig(nd, 'props.pageProps.productDetails') ??
           dig(nd, 'props.pageProps.initialData.product')) as Record<string, unknown> | null;
        if (product) return resolveProductFields(product);
      }
      break;
    }
  }

  return null;
}

// ─── Layer 2: Generic __NEXT_DATA__ extractor ─────────────────────────────────

function extractFromNextData(html: string): BaseProduct | null {
  const nd = parseNextData(html);
  if (!nd) return null;

  // Common paths used across many Next.js shops
  const PATHS = [
    'props.pageProps.product',
    'props.pageProps.model',
    'props.pageProps.article',
    'props.pageProps.initialData.product',
    'props.pageProps.data.product',
    'props.pageProps.componentProps.product',
    'props.pageProps.productDetail',
    'props.pageProps.productData',
    'props.pageProps.item',
  ];

  for (const path of PATHS) {
    const candidate = dig(nd, path);
    if (!candidate || typeof candidate !== 'object') continue;
    const result = resolveProductFields(candidate);
    if (result) return result;
  }

  // Try props.pageProps.productsById — take first value
  const byId = dig(nd, 'props.pageProps.productsById') as Record<string, unknown> | null;
  if (byId && typeof byId === 'object') {
    const first = Object.values(byId)[0];
    if (first) {
      const result = resolveProductFields(first);
      if (result) return result;
    }
  }

  return null;
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

function extractFromJsonLd(html: string, preferProductId?: string): Omit<ProductData, 'specs' | 'shopLinks'> | null {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  function extractProduct(item: Record<string, unknown>): Omit<ProductData, 'specs' | 'shopLinks'> | null {
    const name = (item.name as string | undefined)?.trim();
    if (!name) return null;
    const brand = (item.brand as Record<string, unknown> | undefined)?.['name'] ?? item.brand ?? null;
    const image = Array.isArray(item.image) ? item.image[0] : item.image;
    const imageUrl = typeof image === 'string' ? image : (image as Record<string, unknown> | undefined)?.['url'] ?? null;
    const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
    const price = parsePrice((offers as Record<string, unknown> | undefined)?.['price']
      ?? (offers as Record<string, unknown> | undefined)?.['lowPrice']
      ?? item.price);
    return { name: String(name), brand: brand ? String(brand).trim() : null, imageUrl: imageUrl ? String(imageUrl) : null, price };
  }

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const candidates = Array.isArray(json) ? json : [json];

      for (const obj of candidates) {
        const items = obj['@graph'] ? [obj, ...obj['@graph']] : [obj];

        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const type = (item as Record<string, unknown>)['@type'];

          // Handle ProductGroup (Bol.com uses this for color/size variants)
          if (type === 'ProductGroup') {
            const variants = (item as Record<string, unknown>)['hasVariant'];
            if (Array.isArray(variants) && variants.length > 0) {
              // Prefer the variant whose productID matches the URL
              const preferred = preferProductId
                ? variants.find((v: Record<string, unknown>) => String(v['productID'] ?? '') === preferProductId)
                : null;
              const variant = preferred ?? variants[0];
              const result = extractProduct(variant as Record<string, unknown>);
              if (result) return result;
            }
            // Fall through: try extracting from the ProductGroup itself
            const groupResult = extractProduct(item as Record<string, unknown>);
            if (groupResult) return groupResult;
            continue;
          }

          if (type !== 'Product' && type !== 'IndividualProduct') continue;
          const result = extractProduct(item as Record<string, unknown>);
          if (result) return result;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractFromOgTags(html: string): Omit<ProductData, 'specs' | 'shopLinks'> | null {
  let name = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title');
  if (!name) return null;
  // Strip common shop name suffixes appended by shops to og:title
  name = name.replace(/\s*[|\-–]\s*(bol\.com|bol|coolblue|mediamarkt|amazon|zalando)\s*$/i, '').trim();
  if (!name) return null;

  const imageUrl = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || null;
  const priceStr = extractMeta(html, 'product:price:amount') || extractMeta(html, 'og:price:amount');
  const price = priceStr ? parsePrice(priceStr) : null;

  return { name, brand: null, imageUrl: imageUrl || null, price };
}

// ─── Per-shop price fallbacks ─────────────────────────────────────────────────

function extractPriceFromHtml(html: string, shopSlug: string): number | null {
  if (shopSlug === 'bol-com') {
    // Try several Bol.com price patterns (inline JSON, escaped JSON, meta tags)
    const patterns = [
      /"salePrice"\s*:\s*(\d+(?:[.,]\d+)?)/,
      /"listPrice"\s*:\s*(\d+(?:[.,]\d+)?)/,
      /"price"\s*:\s*(\d+(?:[.,]\d+)?)\s*,\s*"currency"\s*:\s*"EUR"/,
      /\\"Money\\",\\"([0-9]+[.,][0-9]{2})\\",\\"currencyCode\\",\\"EUR\\"/,
      /\\"Money\\",\\"([0-9]+[.,][0-9]{2})\\"/,
      /data-price="(\d+(?:[.,]\d+)?)"/,
    ];
    for (const pat of patterns) {
      const m = html.match(pat);
      if (m) return parsePrice(m[1]);
    }
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

function extractBolComFromHtml(html: string, productId?: string): Omit<ProductData, 'specs' | 'shopLinks'> | null {
  // Bol.com embeds product data in window.__NEXT_DATA__ and in JSON-LD.
  // Try Next.js data first (most reliable).
  const nd = parseNextData(html);
  if (nd) {
    // Bol.com Next.js paths observed in the wild
    const BOL_PATHS = [
      'props.pageProps.productPage.product',
      'props.pageProps.initialData.product',
      'props.pageProps.product',
    ];
    for (const path of BOL_PATHS) {
      const product = dig(nd, path) as Record<string, unknown> | null;
      if (!product) continue;
      const name = String(product['title'] ?? product['name'] ?? '').trim();
      if (!name) continue;
      const brand = (product['brand'] as Record<string, unknown> | undefined)?.['name']
        ?? product['brand'] ?? null;
      // Price: Bol stores it as cents (integer) or a float
      const rawPrice = (product['price'] as Record<string, unknown> | undefined)?.['salePrice']
        ?? (product['price'] as Record<string, unknown> | undefined)?.['price']
        ?? product['price'] ?? null;
      const price = toPrice(rawPrice);
      const media = product['media'] as Record<string, unknown>[] | undefined;
      const imageUrl = media?.[0]?.['url'] as string | undefined
        ?? product['imageUrl'] as string | undefined
        ?? null;
      return { name, brand: brand ? String(brand).trim() : null, imageUrl: imageUrl ?? null, price };
    }
  }

  // Layer 2: Bol.com Apollo/RSC inline JSON — they embed a serialized store as
  // multiple <script type="application/json"> blocks or as __APOLLO_STATE__ /
  // __RELAY_STORE__ / window.__data__ patterns.
  const apolloMatch = html.match(/(?:window\.__(?:APOLLO_STATE|RELAY_STORE|data|bol_data)__|"ROOT_QUERY")\s*[=:]\s*(\{[\s\S]{0,200000}\})\s*[;,<]/);
  if (apolloMatch) {
    try {
      const store = JSON.parse(apolloMatch[1]);
      // Walk top-level keys looking for a product node
      for (const key of Object.keys(store)) {
        const node = store[key] as Record<string, unknown> | null;
        if (!node || typeof node !== 'object') continue;
        const name = String(node['title'] ?? node['name'] ?? '').trim();
        if (!name) continue;
        const brand = (node['brand'] as Record<string, unknown> | undefined)?.['name']
          ?? node['brandName'] ?? null;
        const rawPrice = (node['price'] as Record<string, unknown> | undefined)?.['salePrice']
          ?? node['salePrice'] ?? null;
        const price = toPrice(rawPrice);
        const imageUrl = (node['mainImage'] as Record<string, unknown> | undefined)?.['url'] as string | undefined
          ?? node['imageUrl'] as string | undefined ?? null;
        return { name, brand: brand ? String(brand).trim() : null, imageUrl: imageUrl ?? null, price };
      }
    } catch { /* ignore parse errors */ }
  }

  // Layer 3: Bol.com inline JSON blocks — newer pages embed product data as
  // <script type="application/json" data-component-name="..."> or
  // <script id="__BOL_DATA__"> etc.
  const inlineJsonRegex = /<script[^>]+(?:type=["']application\/json["']|id=["'][^"']*(?:bol|product|pdp)[^"']*["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let ijMatch: RegExpExecArray | null;
  while ((ijMatch = inlineJsonRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(ijMatch[1]);
      // Recursively search for a {title/name + price} object
      const found = findProductNode(data);
      if (found) return found;
    } catch { /* ignore */ }
  }

  // Layer 4: title from <h1 data-test="title"> or <h1 itemprop="name">
  const h1Match = html.match(/<h1[^>]*(?:data-test=["']title["']|itemprop=["']name["'])[^>]*>\s*([\s\S]*?)\s*<\/h1>/i)
    ?? html.match(/<h1[^>]*class=["'][^"']*product[^"']*title[^"']*["'][^>]*>\s*([\s\S]*?)\s*<\/h1>/i);
  if (h1Match) {
    const name = h1Match[1].replace(/<[^>]+>/g, '').trim();
    if (name && name.length > 2) {
      const priceFromJson = html.match(/"salePrice"\s*:\s*(\d+(?:[.,]\d+)?)/);
      const price = priceFromJson ? parsePrice(priceFromJson[1]) : null;
      const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      const imageUrl = ogImage ? ogImage[1] : null;
      const brandMatch = html.match(/<[^>]+itemprop=["']brand["'][^>]*>[\s\S]*?<[^>]+itemprop=["']name["'][^>]*content=["']([^"']+)["']/i)
        ?? html.match(/"brand"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/);
      const brand = brandMatch ? brandMatch[1].trim() : null;
      return { name, brand, imageUrl, price };
    }
  }

  // Fallback: extract price from inline JSON blobs Bol embeds
  // Pattern: "salePrice":12.99 or "listPrice":{"salePrice":12.99}
  const priceFromJson = html.match(/"salePrice"\s*:\s*(\d+(?:[.,]\d+)?)/);
  const bolPrice = priceFromJson ? parsePrice(priceFromJson[1]) : null;

  // Use JSON-LD for name/brand/image
  const fromJsonLd = extractFromJsonLd(html, productId);
  if (fromJsonLd) {
    return { ...fromJsonLd, price: fromJsonLd.price ?? bolPrice };
  }

  return null;
}

/**
 * Recursively search a JSON blob for an object that looks like a product
 * (has a non-empty title/name field alongside a price). Used for Bol.com
 * inline JSON blocks where the product node can be nested arbitrarily.
 */
function findProductNode(
  data: unknown,
  depth = 0
): Omit<ProductData, 'specs' | 'shopLinks'> | null {
  if (depth > 6 || !data || typeof data !== 'object') return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const r = findProductNode(item, depth + 1);
      if (r) return r;
    }
    return null;
  }
  const obj = data as Record<string, unknown>;
  const name = String(obj['title'] ?? obj['name'] ?? '').trim();
  if (name && name.length > 2) {
    const rawPrice = (obj['price'] as Record<string, unknown> | undefined)?.['salePrice']
      ?? (obj['price'] as Record<string, unknown> | undefined)?.['price']
      ?? obj['salePrice'] ?? obj['price'] ?? null;
    const price = typeof rawPrice === 'number' || typeof rawPrice === 'string' ? toPrice(rawPrice) : null;
    const brand = (obj['brand'] as Record<string, unknown> | undefined)?.['name']
      ?? obj['brandName'] ?? null;
    const imageUrl = (obj['mainImage'] as Record<string, unknown> | undefined)?.['url'] as string | undefined
      ?? obj['imageUrl'] as string | undefined ?? null;
    return { name, brand: brand ? String(brand).trim() : null, imageUrl: imageUrl ?? null, price };
  }
  for (const key of Object.keys(obj)) {
    const r = findProductNode(obj[key], depth + 1);
    if (r) return r;
  }
  return null;
}

async function fetchProductData(
  productUrl: string,
  shopSlug: string,
  shopDisplayName: string,
  productId?: string
): Promise<ProductData | null> {
  let base: Omit<ProductData, 'specs' | 'shopLinks'> | null = null;
  let html = '';

  if (!base) {
    try {
      // If this looks like a search URL, fetch the results page first and
      // extract the first product link, then scrape that instead.
      let fetchUrl = productUrl;
      try {
        const parsedFetchUrl = new URL(productUrl);
        // Bol.com: strip query params (tracking tokens cause issues)
        if (shopSlug === 'bol-com') {
          parsedFetchUrl.search = '';
          fetchUrl = parsedFetchUrl.toString();
        }
        if (isSearchUrl(parsedFetchUrl)) {
          const searchFetched = await fetchWithFallback(fetchUrl, shopSlug);
          if (!searchFetched) return null;
          const firstProductUrl = extractFirstProductUrlFromSearch(searchFetched.html, shopSlug, parsedFetchUrl.origin);
          if (firstProductUrl) {
            console.log('[search→product]', shopSlug, firstProductUrl);
            fetchUrl = firstProductUrl;
          } else {
            return null;
          }
        }
      } catch {
        // URL parse failed — proceed with original URL
      }

      const fetched = await fetchWithFallback(fetchUrl, shopSlug);
      if (!fetched) return null;
      html = fetched.html;

      console.log('[html-length]', shopSlug, html.length, 'chars');
      console.log('[html-preview]', html.slice(0, 300).replace(/\s+/g, ' '));

      // Layer 1: shop-specific embedded JSON
      base = extractFromShopScript(html, shopSlug, productId);
      console.log('[layer1]', shopSlug, base ? `OK: ${base.name}` : 'null');

      // Layer 2: generic __NEXT_DATA__
      if (!base) base = extractFromNextData(html);
      if (base) console.log('[layer2]', shopSlug, `OK: ${base.name}`);

      // Layer 3: JSON-LD structured data
      if (!base) base = extractFromJsonLd(html, productId);
      if (base) console.log('[layer3]', shopSlug, `OK: ${base.name}`);

      // Layer 4: OG meta tags
      if (!base) base = extractFromOgTags(html);
      if (base) console.log('[layer4]', shopSlug, `OK: ${base.name}`);

      if (!base) console.log('[all-layers-failed]', shopSlug, 'no product found in html');

      if (base && base.price === null) {
        const fallbackPrice = extractPriceFromHtml(html, shopSlug);
        if (fallbackPrice !== null) base = { ...base, price: fallbackPrice };
      }
    } catch (err) {
      console.error('[fetchProductData error]', shopSlug, err);
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
  // Fashion
  'nike': 'nike',
  'hm': 'h&m',
  'asos': 'asos',
  'zara': 'zara',
  'zara-home': 'zara-home',
  'about-you': 'about-you',
  'shein': 'shein',
  'mango': 'mango',
  'pull-bear': 'pull-and-bear',
  'uniqlo': 'uniqlo',
  // Sports & shoes
  'decathlon': 'decathlon',
  'intersport': 'intersport',
  'jd-sports': 'jd-sports',
  'foot-locker': 'foot-locker',
  'adidas': 'adidas',
  'puma': 'puma',
  'new-balance': 'new-balance',
  'vans': 'vans',
  'converse': 'converse',
  'omoda': 'omoda',
  'van-haren': 'van-haren',
  'scapino': 'scapino',
  'torfs': 'torfs',
  'sacha': 'sacha',
  'schuurman': 'schuurman',
  'nelson': 'nelson',
  // Electronics
  'praxis': 'praxis',
  'krefel': 'krefel',
  'bcc': 'bcc',
  'fnac': 'fnac',
  // General
  'hema': 'hema',
  'blokker': 'blokker',
  'action': 'action',
  'lidl': 'lidl',
  'kruidvat': 'kruidvat',
  // Beauty
  'ici-paris': 'ici-paris-xl',
  'douglas': 'douglas',
  'etos': 'etos',
  // Furniture
  'ikea': 'ikea',
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
        'User-Agent': 'Mozilla/5.0 (compatible; Tracr/1.0)',
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
        'User-Agent': 'Mozilla/5.0 (compatible; Tracr/1.0)',
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
    shop_display_name: string;
    name: string;
    brand: string | null;
    image_url: string | null;
    current_price: number;
    affiliate_url: string;
    original_url: string;
    user_id: string | null;
    category: string | null;
    specs: Record<string, string> | null;
    shop_links: ShopLink[] | null;
    color: string;
    storage: string;
  }
): Promise<PersistedProduct | null> {
  const now = new Date().toISOString();
  const { shop_display_name, color, storage, ...dbData } = data;
  const incomingLinks = mergeShopLinks(
    null,
    data.shop_links ?? [{
      name: shop_display_name,
      price: data.current_price > 0 ? data.current_price : null,
      url: data.original_url,
    }],
  ) ?? [];

  const directFields = 'id, shop_slug, shop_product_id, name, brand, image_url, current_price, affiliate_url, original_url, user_id, category, specs, shop_links, color_variants';
  const { data: sameShopRow } = await supabase
    .from('scanned_products')
    .select(directFields)
    .eq('shop_slug', data.shop_slug)
    .eq('shop_product_id', data.shop_product_id)
    .maybeSingle();

  const canonicalRow =
    (sameShopRow as ScannedProductRow | null)
    ?? await findCanonicalProductMatch(supabase, {
      name: data.name,
      brand: data.brand,
      category: data.category,
      specs: data.specs,
    });

  if (canonicalRow) {
    // Check if the incoming scan is a different color/storage variant
    const canonicalColor = extractColor(canonicalRow.name, canonicalRow.specs);
    const canonicalStorage = extractStorage(canonicalRow.name, canonicalRow.specs);
    const isDifferentVariant =
      (color && canonicalColor && color !== canonicalColor) ||
      (storage && canonicalStorage && storage !== canonicalStorage);

    let mergedLinks: ShopLink[] | null;
    let nextColorVariants: ColorVariant[] | null = canonicalRow.color_variants ?? null;

    if (isDifferentVariant) {
      // Store this as a variant; keep the canonical's own shop_links for the primary variant
      mergedLinks = canonicalRow.shop_links;
      nextColorVariants = mergeColorVariants(
        nextColorVariants,
        color,
        storage,
        data.image_url,
        data.affiliate_url,
        incomingLinks,
      );
    } else {
      // Same variant (or no variant info) — merge shop links normally
      mergedLinks = mergeShopLinks(canonicalRow.shop_links, incomingLinks);
      if (color || storage) {
        // Keep this variant entry up to date
        nextColorVariants = mergeColorVariants(
          nextColorVariants,
          color,
          storage,
          data.image_url,
          data.affiliate_url,
          incomingLinks,
        );
      }
    }

    const isDifferentColor = isDifferentVariant;

    const primaryOffer = isDifferentColor
      ? pickPrimaryOffer(mergedLinks, data.original_url, Number(canonicalRow.current_price), shop_display_name)
      : pickPrimaryOffer(mergedLinks, data.original_url, data.current_price, shop_display_name);

    const nextCurrentPrice =
      isDifferentColor
        ? (canonicalRow.current_price > 0 ? Number(canonicalRow.current_price) : 0)
        : (primaryOffer.price
          ?? (canonicalRow.current_price > 0 ? Number(canonicalRow.current_price) : null)
          ?? (data.current_price > 0 ? data.current_price : null)
          ?? 0);

    const nextAffiliateUrl = isDifferentColor
      ? canonicalRow.affiliate_url
      : (normalizeUrlKey(primaryOffer.url) === normalizeUrlKey(data.original_url)
          ? data.affiliate_url
          : normalizeUrlKey(primaryOffer.url) === normalizeUrlKey(canonicalRow.original_url)
            ? canonicalRow.affiliate_url
            : primaryOffer.url);

    const { data: updatedRow, error } = await supabase
      .from('scanned_products')
      .update({
        name: choosePreferredName(canonicalRow.name, data.name),
        brand: data.brand ?? canonicalRow.brand,
        image_url: isDifferentColor ? canonicalRow.image_url : (data.image_url ?? canonicalRow.image_url),
        current_price: nextCurrentPrice,
        affiliate_url: nextAffiliateUrl,
        original_url: isDifferentColor ? canonicalRow.original_url : primaryOffer.url,
        user_id: canonicalRow.user_id ?? data.user_id,
        category: data.category ?? canonicalRow.category,
        specs: mergeSpecs(canonicalRow.specs, data.specs),
        shop_links: mergedLinks,
        color_variants: nextColorVariants,
        updated_at: now,
      })
      .eq('id', canonicalRow.id)
      .select('id, current_price, shop_links, color_variants')
      .single();

    if (error) {
      console.warn('upsertProduct update error:', error.message);
      return null;
    }

    return updatedRow as PersistedProduct;
  }

  const primaryOffer = pickPrimaryOffer(
    incomingLinks,
    data.original_url,
    data.current_price,
    shop_display_name,
  );

  // First time seeing this product — seed color_variants with this variant
  const initialVariants: ColorVariant[] | null = (color || storage)
    ? mergeColorVariants(null, color, storage, data.image_url, data.affiliate_url, incomingLinks)
    : null;

  const { data: row, error } = await supabase
    .from('scanned_products')
    .upsert(
      {
        ...dbData,
        current_price: primaryOffer.price ?? data.current_price,
        affiliate_url: normalizeUrlKey(primaryOffer.url) === normalizeUrlKey(data.original_url)
          ? data.affiliate_url
          : primaryOffer.url,
        original_url: primaryOffer.url,
        shop_links: incomingLinks,
        color_variants: initialVariants,
        updated_at: now,
      },
      { onConflict: 'shop_slug,shop_product_id', ignoreDuplicates: false },
    )
    .select('id, current_price, shop_links, color_variants')
    .single();

  if (error) {
    console.warn('upsertProduct insert error:', error.message);
    return null;
  }
  return row as PersistedProduct;
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

// ─── OCR URL extraction ───────────────────────────────────────────────────────

const OCR_URL_REGEX = /https?:\/\/[^\s"'<>\]\[(){},\n\r]+/gi;
const VISION_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY');

async function extractUrlsFromImage(imageBase64: string): Promise<string[]> {
  if (!VISION_API_KEY) return [];

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        }],
      }),
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!res.ok) return [];

  const data = await res.json() as { responses: Array<{ fullTextAnnotation?: { text: string } }> };
  const text = data.responses?.[0]?.fullTextAnnotation?.text ?? '';

  return [...text.matchAll(OCR_URL_REGEX)]
    .map(m => m[0].replace(/[.,;:!?)\]>]+$/, ''))
    .filter(u => u.length > 12);
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
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    let isServiceRole = false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      isServiceRole = payload?.role === 'service_role';
    } catch {
      // Invalid JWT payload — continue unauthenticated.
    }

    if (!isServiceRole) {
      try {
        const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabaseUser.auth.getUser();
        userId = user?.id ?? null;
      } catch {
        userId = null;
      }
    }
  }

  // ── Debug route: POST /scan-product/debug — returns raw fetched HTML snippet ──
  const url = new URL(req.url);
  if (url.pathname.endsWith('/debug')) {
    let debugBody: { url?: string };
    try { debugBody = await req.json(); } catch { debugBody = {}; }
    const rawDebugUrl = debugBody.url?.trim();
    if (!rawDebugUrl) return new Response(JSON.stringify({ error: 'no url' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    const parsedDebug = parseShopUrl(rawDebugUrl);
    // Direct ZenRows test mirroring the exact tryZenRows call path (premium_proxy, js_render, no antibot)
    const fetched = parsedDebug ? await fetchWithFallback(rawDebugUrl, parsedDebug.shopSlug) : null;
    // Raw ZenRows test AFTER fetchWithFallback so they don't compete for concurrency slots
    let zenrowsTest: { status: number; body: string; headers: Record<string,string>; htmlLen: number; isChallenge: boolean } | null = null;
    if (ZENROWS_API_KEY && parsedDebug) {
      try {
        const p = new URLSearchParams({ url: rawDebugUrl, apikey: ZENROWS_API_KEY, antibot: 'true', premium_proxy: 'true', js_render: 'true' });
        const zr = await fetch(`https://api.zenrows.com/v1/?${p}`, { signal: AbortSignal.timeout(90_000) });
        const hdrs: Record<string,string> = {};
        zr.headers.forEach((v,k) => { hdrs[k] = v; });
        const body = await zr.text();
        const isChallenge = body.includes('Just a moment') || body.includes('cf-browser-verification') || (body.length < 5000 && (body.includes('<title>Challenge Page</title>') || body.includes('sec-if-cpt-container')));
        zenrowsTest = { status: zr.status, body: body.slice(0, 500), headers: hdrs, htmlLen: body.length, isChallenge };
      } catch(e) { zenrowsTest = { status: 0, body: String(e), headers: {}, htmlLen: 0, isChallenge: false }; }
    }
    const directTest = await tryDirect(rawDebugUrl);
    // Direct proxy test — call worker directly to see what Edge Function gets
    let proxyTest: { status: number; htmlLen: number; preview: string } | null = null;
    try {
      const pr = await fetch(FETCH_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: rawDebugUrl }),
        signal: AbortSignal.timeout(20_000),
      });
      const pd = await pr.json() as { html?: string; status?: number; error?: string };
      proxyTest = { status: pr.status, htmlLen: pd.html?.length ?? 0, preview: (pd.html ?? '').slice(0, 200).replace(/\s+/g, ' ') };
    } catch(e) { proxyTest = { status: 0, htmlLen: 0, preview: String(e) }; }
    const html = fetched?.html ?? '';
    return new Response(JSON.stringify({
      shopSlug: parsedDebug?.shopSlug,
      htmlLength: html.length,
      directHtmlLength: directTest?.html?.length ?? 0,
      proxyTest,
      hasNextData: html.includes('__NEXT_DATA__'),
      hasJsonLd: html.includes('application/ld+json'),
      hasProductGroup: html.includes('ProductGroup'),
      hasProduct: html.includes('"@type":"Product"') || html.includes('"@type": "Product"'),
      ogTitle: html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1] ?? null,
      directOgTitle: directTest?.html?.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1] ?? null,
      preview: html.slice(0, 300).replace(/\s+/g, ' '),
      directPreview: directTest?.html?.slice(0, 300).replace(/\s+/g, ' ') ?? null,
      zenrowsRaw: zenrowsTest,
    }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
  if (url.pathname.endsWith('/ocr')) {
    let ocrBody: { imageBase64?: string };
    try { ocrBody = await req.json(); } catch { ocrBody = {}; }
    const urls = await extractUrlsFromImage(ocrBody.imageBase64 ?? '').catch(() => []);
    return new Response(JSON.stringify({ urls }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
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
    // For Bol, give a more actionable error — their bot protection blocks server fetches
    const errCode = parsed.shopSlug === 'bol-com' ? 'shop_blocked' : 'product_not_found';
    return new Response(JSON.stringify({ error: errCode }), { status: 422 });
  }

  // Reject homepage/generic names — these happen when the product URL 404s and the shop
  // returns their homepage or a generic listing page instead.
  const GENERIC_NAME_PATTERNS = [
    /jouw snelste weg naar/i,
    /^producten$/i,
    /^home$/i,
    /online fashion/i,
    /online shop\b/i,
    /webshop/i,
    /schoenen online kopen/i,
    /adidas originals online shop/i,
  ];
  if (GENERIC_NAME_PATTERNS.some(p => p.test(productData.name))) {
    console.warn('[scan-product] rejected generic name:', productData.name);
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

  const scannedColor = extractColor(productData.name, productData.specs);
  const scannedStorage = extractStorage(productData.name, productData.specs);

  const persisted = await upsertProduct(supabaseAdmin, {
    shop_slug: parsed.shopSlug,
    shop_product_id: shopProductId,
    shop_display_name: parsed.shopDisplayName,
    name: productData.name,
    brand: productData.brand,
    image_url: productData.imageUrl,
    current_price: price,
    affiliate_url: parsed.affiliateUrl,
    original_url: parsed.canonicalUrl,
    user_id: userId,
    category,
    specs: productData.specs,
    shop_links: productData.shopLinks.length > 0 ? productData.shopLinks : null,
    color: scannedColor,
    storage: scannedStorage,
  });

  if (persisted?.id && price > 0) {
    await addPricePoint(supabaseAdmin, persisted.id, price);
  }

  const response: ScanResponse = {
    productId: persisted?.id ?? null,
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
    shopLinks: persisted?.shop_links ?? productData.shopLinks,
    colorVariants: persisted?.color_variants ?? [],
    scannedColor,
    scannedStorage,
  };

  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
