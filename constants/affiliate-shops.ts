/**
 * Affiliate Shop Database
 *
 * Centrale registratie van alle shops in de app.
 * Bevat affiliate configuratie per shop.
 *
 * Status:
 *  ✅ Amazon Associates (tweakly08-20) — ACTIEF
 *  ⏳ Coolblue via Daisycon          — wacht op goedkeuring
 *  ⏳ Alternate via TradeDoubler      — wacht op goedkeuring
 *  ⏳ MediaMarkt via Awin             — wacht op goedkeuring
 *  ❌ Bol.com                         — nog niet aangevraagd
 *  ❌ Apple Store                     — geen affiliate programma
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
    affiliate: {
      active: false,
      reason: 'Nog niet aangevraagd',
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
    affiliate: {
      active: false,
      reason: 'Geen affiliate programma beschikbaar',
    },
  },
];

/** Zoek shop op displayName (case-insensitief) — voor gebruik vanuit ShopLink.name */
export function getShopByName(name: string): AffiliateShop | undefined {
  const lower = name.toLowerCase();
  return AFFILIATE_SHOPS.find(s =>
    s.displayName.toLowerCase() === lower ||
    s.logoAbbr.toLowerCase() === lower
  );
}

/** Zoek shop op slug — voor gebruik vanuit shop-feeds integratie */
export function getShopBySlug(slug: string): AffiliateShop | undefined {
  return AFFILIATE_SHOPS.find(s => s.slug === slug);
}
