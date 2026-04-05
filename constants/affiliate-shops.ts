/**
 * Affiliate Shop Database
 *
 * Centrale registratie van alle shops in de app.
 * Bevat affiliate configuratie per shop.
 *
 * Status:
 *  ✅ Amazon Associates (tweakly08-20)          — ACTIEF
 *  ✅ Bol.com Partnerprogramma (pub 1513890)    — ACTIEF
 *  ⏳ Coolblue via Daisycon                    — wacht op goedkeuring
 *  ⏳ Alternate via TradeDoubler               — wacht op goedkeuring
 *  ⏳ MediaMarkt via Awin                      — wacht op goedkeuring
 *  ❌ Apple Store                              — geen affiliate programma
 *  ❌ Zalando                                  — nog niet aangevraagd
 *  ❌ Wehkamp                                  — nog niet aangevraagd
 *  ❌ Zalando Lounge                           — nog niet aangevraagd
 */

export type AffiliateStatus =
  | { active: true; network: string; buildAffiliateUrl: (productUrl: string, asin?: string) => string }
  | { active: false; reason: string };

export type AffiliateShop = {
  /** Matches slug uit shop-feeds.ts en ShopLink.logo afkorting */
  slug: string;
  /** Weergavenaam in de UI */
  displayName: string;
  /** 2-3 tekens fallback logo */
  logoAbbr: string;
  /** Achtergrondkleur voor het logo blokje */
  logoBackground: string;
  /** Tekstkleur op het logo blokje */
  logoTextColor: string;
  /** Primaire merkkleur voor CTA knoppen */
  brandColor: string;
  /** Basis URL van de shop */
  baseUrl: string;
  /** Hoofdcategorie-IDs die deze shop dekt. ['all'] = wildcard (alle categorieën) */
  mainCategories: string[];
  /** Affiliate configuratie */
  affiliate: AffiliateStatus;
};

const AMAZON_TAG = 'tweakly08-20';

export const AFFILIATE_SHOPS: AffiliateShop[] = [
  // ── Amazon NL ───────────────────────────────────────────────────────────────
  {
    slug: 'amazon-nl',
    displayName: 'Amazon',
    logoAbbr: 'AMZ',
    logoBackground: '#FF9900',
    logoTextColor: '#000000',
    brandColor: '#FF9900',
    baseUrl: 'https://www.amazon.nl',
    mainCategories: ['all'],
    affiliate: {
      active: true,
      network: 'Amazon Associates',
      buildAffiliateUrl(productUrl, asin) {
        // ASIN bekend → schone dp/ link
        if (asin) {
          return `https://www.amazon.nl/dp/${asin}?tag=${AMAZON_TAG}`;
        }
        // Bestaande URL → tag toevoegen/overschrijven
        try {
          const u = new URL(productUrl);
          u.searchParams.set('tag', AMAZON_TAG);
          return u.toString();
        } catch {
          return productUrl;
        }
      },
    },
  },

  // ── Coolblue ─────────────────────────────────────────────────────────────────
  {
    slug: 'coolblue',
    displayName: 'Coolblue',
    logoAbbr: 'CB',
    logoBackground: '#0090E3',
    logoTextColor: '#FFFFFF',
    brandColor: '#0090E3',
    baseUrl: 'https://www.coolblue.nl',
    mainCategories: ['elektronica'],
    affiliate: {
      active: false,
      reason: 'Daisycon goedkeuring in behandeling',
    },
  },

  // ── Bol.com ──────────────────────────────────────────────────────────────────
  {
    slug: 'bol-com',
    displayName: 'Bol.com',
    logoAbbr: 'BOL',
    logoBackground: '#0000A4',
    logoTextColor: '#FFFFFF',
    brandColor: '#0000A4',
    baseUrl: 'https://www.bol.com',
    mainCategories: ['all'],
    affiliate: {
      active: true,
      network: 'Bol.com Partnerprogramma',
      buildAffiliateUrl(productUrl: string) {
        return `https://partner.bol.com/click/click?p=1&t=url&s=1513890&url=${encodeURIComponent(productUrl)}`;
      },
    },
  },

  // ── Alternate ────────────────────────────────────────────────────────────────
  {
    slug: 'alternate',
    displayName: 'Alternate',
    logoAbbr: 'ALT',
    logoBackground: '#E3000F',
    logoTextColor: '#FFFFFF',
    brandColor: '#E3000F',
    baseUrl: 'https://www.alternate.nl',
    mainCategories: ['elektronica'],
    affiliate: {
      active: false,
      reason: 'TradeDoubler goedkeuring in behandeling',
    },
  },

  // ── MediaMarkt ───────────────────────────────────────────────────────────────
  {
    slug: 'mediamarkt',
    displayName: 'MediaMarkt',
    logoAbbr: 'MM',
    logoBackground: '#CC0000',
    logoTextColor: '#FFFFFF',
    brandColor: '#CC0000',
    baseUrl: 'https://www.mediamarkt.nl',
    mainCategories: ['elektronica'],
    affiliate: {
      active: false,
      reason: 'Awin goedkeuring in behandeling',
    },
  },

  // ── Apple Store ──────────────────────────────────────────────────────────────
  {
    slug: 'apple-store',
    displayName: 'Apple Store',
    logoAbbr: 'APL',
    logoBackground: '#1D1D1F',
    logoTextColor: '#FFFFFF',
    brandColor: '#1D1D1F',
    baseUrl: 'https://www.apple.com/nl',
    mainCategories: ['elektronica'],
    affiliate: {
      active: false,
      reason: 'Geen affiliate programma beschikbaar',
    },
  },

  // ── Zalando ──────────────────────────────────────────────────────────────────
  {
    slug: 'zalando',
    displayName: 'Zalando',
    logoAbbr: 'ZAL',
    logoBackground: '#FF6900',
    logoTextColor: '#FFFFFF',
    brandColor: '#FF6900',
    baseUrl: 'https://www.zalando.nl',
    mainCategories: ['kleding', 'schoenen'],
    affiliate: {
      active: false,
      reason: 'Nog niet aangevraagd',
    },
  },

  // ── Wehkamp ───────────────────────────────────────────────────────────────────
  {
    slug: 'wehkamp',
    displayName: 'Wehkamp',
    logoAbbr: 'WHK',
    logoBackground: '#E2001A',
    logoTextColor: '#FFFFFF',
    brandColor: '#E2001A',
    baseUrl: 'https://www.wehkamp.nl',
    mainCategories: ['kleding', 'schoenen', 'wonen', 'beauty'],
    affiliate: {
      active: false,
      reason: 'Nog niet aangevraagd',
    },
  },

  // ── Zalando Lounge ────────────────────────────────────────────────────────────
  {
    slug: 'zalando-lounge',
    displayName: 'Zalando Lounge',
    logoAbbr: 'ZL',
    logoBackground: '#FF6900',
    logoTextColor: '#FFFFFF',
    brandColor: '#FF6900',
    baseUrl: 'https://www.zalando-lounge.nl',
    mainCategories: ['kleding', 'schoenen'],
    affiliate: {
      active: false,
      reason: 'Awin goedkeuring vereist — 6% commissie beschikbaar',
    },
  },
];

/** Zoek shop op displayName, logoAbbr of slug (case-insensitief) — voor gebruik vanuit ShopLink.name */
export function getShopByName(name: string): AffiliateShop | undefined {
  const lower = name.toLowerCase();
  return AFFILIATE_SHOPS.find(s =>
    s.displayName.toLowerCase() === lower ||
    s.logoAbbr.toLowerCase() === lower ||
    s.slug === lower
  );
}

/** Zoek shop op slug — voor gebruik vanuit shop-feeds integratie */
export function getShopBySlug(slug: string): AffiliateShop | undefined {
  return AFFILIATE_SHOPS.find(s => s.slug === slug);
}

/** Geeft alle shops terug die een bepaalde hoofdcategorie ondersteunen */
export function getShopsForCategory(mainCategoryId: string): AffiliateShop[] {
  return AFFILIATE_SHOPS.filter(
    shop =>
      shop.mainCategories.includes('all') ||
      shop.mainCategories.includes(mainCategoryId)
  );
}
