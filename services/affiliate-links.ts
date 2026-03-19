/**
 * Affiliate Link Utilities
 *
 * Pure hulpfuncties voor het bouwen van affiliate URLs en het
 * bepalen van de goedkoopste aanbieder.
 */

import { getShopByName, type AffiliateShop } from '@/constants/affiliate-shops';
import type { ShopLink } from '@/constants/mock-data';

/**
 * Bouw de uitgaande URL voor een shop link.
 * - Als de shop een actief affiliate programma heeft → wrap de URL.
 * - Anders → geef de originele URL terug.
 * - Gooit nooit een fout.
 */
export function buildOutboundUrl(shopLink: ShopLink, asin?: string): string {
  const shop = getShopByName(shopLink.name);
  if (shop?.affiliate.active) {
    return shop.affiliate.buildAffiliateUrl(shopLink.url, asin);
  }
  return shopLink.url;
}

/**
 * Geef de goedkoopste ShopLink terug.
 * Bij gelijke prijs: shops met actief affiliate programma gaan voor.
 */
export function getCheapestShop(shops: ShopLink[]): ShopLink | undefined {
  if (!shops.length) return undefined;
  return [...shops].sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price;
    // Zelfde prijs: affiliate-shop heeft voorkeur
    const aAffiliate = hasAffiliateLink(a);
    const bAffiliate = hasAffiliateLink(b);
    if (aAffiliate && !bAffiliate) return -1;
    if (!aAffiliate && bAffiliate) return 1;
    return 0;
  })[0];
}

/**
 * Geef alle shops gesorteerd op prijs (laagste eerst).
 * Bij gelijke prijs: affiliate-shops komen eerst.
 */
export function sortShopsByPrice(shops: ShopLink[]): ShopLink[] {
  return [...shops].sort((a, b) => {
    if (a.price !== b.price) return a.price - b.price;
    const aAffiliate = hasAffiliateLink(a);
    const bAffiliate = hasAffiliateLink(b);
    if (aAffiliate && !bAffiliate) return -1;
    if (!aAffiliate && bAffiliate) return 1;
    return 0;
  });
}

/**
 * Geef de AffiliateShop metadata voor een ShopLink.
 * Handig in de UI voor brandColor, logoBackground, etc.
 */
export function getShopMeta(shopLink: ShopLink): AffiliateShop | undefined {
  return getShopByName(shopLink.name);
}

/**
 * Geeft true als deze shop link een affiliate tag zal krijgen.
 */
export function hasAffiliateLink(shopLink: ShopLink): boolean {
  const shop = getShopByName(shopLink.name);
  return shop?.affiliate.active === true;
}
