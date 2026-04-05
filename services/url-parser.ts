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
      const m = url.pathname.match(/^\/([^/]+)\/dp\//);
      return m ? slugToName(m[1]) : '';
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
    extractProductName(url) {
      const segments = url.pathname.split('/').filter(Boolean);
      const nameIdx = segments.findIndex(s => s === 'p') + 1;
      return nameIdx > 0 && segments[nameIdx] ? slugToName(segments[nameIdx]) : '';
    },
  },
  {
    slug: 'coolblue',
    displayName: 'Coolblue',
    hostPatterns: [/coolblue\.nl$/],
    extractProductId(url) {
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
  // zalando-lounge MUST precede zalando — the zalando pattern also matches lounge.zalando.nl
  {
    slug: 'zalando-lounge',
    displayName: 'Zalando Lounge',
    hostPatterns: [/lounge\.zalando\.(nl|be)$/],
    extractProductId(url) {
      const m = url.pathname.match(/-([A-Z0-9]{6,})\.html$/i);
      return m ? m[1] : '';
    },
    extractProductName(url) {
      const raw = url.pathname.split('/').filter(Boolean).pop() ?? '';
      return slugToName(raw.replace(/\.html$/, '').replace(/-[A-Z0-9]{6,}$/i, ''));
    },
  },
  {
    slug: 'zalando',
    displayName: 'Zalando',
    hostPatterns: [/zalando\.(nl|be)$/],
    extractProductId(url) {
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
