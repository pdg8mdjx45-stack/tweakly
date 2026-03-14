/**
 * Shop Feed Configuraties
 *
 * Configuraties voor officiële affiliate/partner datafeeds van Nederlandse webshops.
 *
 * ⚠️  BELANGRIJK — LEGALITEIT:
 * - Alle feeds hier zijn OFFICIËLE datafeeds aangeboden door shops voor affiliates/partners
 * - Geen scraping, geen reverse engineering
 * - Je hebt een affiliate/partner account nodig bij elke shop
 * - Vul je eigen API keys/tokens in via environment variables
 * - Respecteer de voorwaarden van elk partnerprogramma
 *
 * HOE FEEDS TE VERKRIJGEN:
 * - Bol.com:     Partner programma → https://partner.bol.com (affiliate datafeed)
 * - Coolblue:    Affiliate programma via Daisycon of TradeTracker
 * - Alternate:   Affiliate programma via TradeDoubler
 * - Amazon.nl:   Amazon Associates programma → Product Advertising API
 * - MediaMarkt:  Affiliate programma via Awin
 * - Megekko:     Direct contact voor datafeed
 * - Azerty:      Affiliate programma via TradeTracker
 */

import type { ShopFeedConfig } from './types';

// ─── Environment variable helpers ───────────────────────────────────────────

function envOrPlaceholder(key: string, placeholder: string): string {
  return process.env[key] || placeholder;
}

// ─── Feed Configuraties ─────────────────────────────────────────────────────

/**
 * Bol.com Partner Feed (XML)
 *
 * Verkrijgbaar via het Bol.com Partner Platform.
 * Bevat productnaam, EAN, prijs, voorraad, afbeeldingen.
 *
 * Aanmelden: https://partner.bol.com
 * Documentatie: https://partner.bol.com/click/affiliate-datafeed/
 */
export const bolComFeed: ShopFeedConfig = {
  shopSlug: 'bol-com',
  type: 'xml',
  url: envOrPlaceholder(
    'BOL_FEED_URL',
    'https://PLACEHOLDER.bol.com/affiliate-feed.xml',
  ),
  headers: {
    'Authorization': `Bearer ${envOrPlaceholder('BOL_API_KEY', '')}`,
  },
  fieldMapping: {
    ean: 'ean',
    name: 'title',
    brand: 'brand',
    category: 'category',
    price: 'price',
    url: 'url',
    inStock: 'availability',
    shipping: 'shippingCost',
    imageUrl: 'imageUrl',
    description: 'description',
  },
  categoryFilter: [
    'computer', 'tablet', 'telefoon', 'smartphone', 'laptop', 'monitor',
    'televisie', 'audio', 'gaming', 'netwerk', 'opslag', 'printer',
    'camera', 'wearable', 'smartwatch',
  ],
};

/**
 * Coolblue Affiliate Feed (via Daisycon/TradeTracker)
 *
 * Coolblue biedt datafeeds via affiliate netwerken.
 * Bevat alle producten met EAN, prijs, en voorraadstatus.
 *
 * Aanmelden: https://www.daisycon.com of https://www.tradetracker.com
 */
export const coolblueFeed: ShopFeedConfig = {
  shopSlug: 'coolblue',
  type: 'xml',
  url: envOrPlaceholder(
    'COOLBLUE_FEED_URL',
    'https://PLACEHOLDER.daisycon.io/coolblue-feed.xml',
  ),
  fieldMapping: {
    ean: 'ean',
    mpn: 'mpn',
    name: 'name',
    brand: 'brand',
    category: 'category_path',
    price: 'price',
    url: 'link',
    inStock: 'in_stock',
    shipping: 'shipping_cost',
    imageUrl: 'image_link',
    description: 'description',
  },
  categoryFilter: [
    'computer', 'telefoon', 'tablet', 'laptop', 'monitor',
    'televisie', 'audio', 'gaming', 'netwerk', 'opslag',
  ],
};

/**
 * Alternate.nl Affiliate Feed (via TradeDoubler)
 *
 * Alternate biedt PC-componenten, laptops, monitors, etc.
 *
 * Aanmelden: https://www.tradedoubler.com
 */
export const alternateFeed: ShopFeedConfig = {
  shopSlug: 'alternate',
  type: 'xml',
  url: envOrPlaceholder(
    'ALTERNATE_FEED_URL',
    'https://PLACEHOLDER.tradedoubler.com/alternate-feed.xml',
  ),
  fieldMapping: {
    ean: 'TDProductId',  // Alternate uses EAN as product ID
    mpn: 'mpn',
    name: 'name',
    brand: 'brand',
    category: 'productCategory',
    price: 'price',
    url: 'productUrl',
    inStock: 'inStock',
    shipping: 'shippingCost',
    imageUrl: 'imageUrl',
  },
};

/**
 * Amazon.nl Product Advertising API (JSON)
 *
 * Amazon biedt de PA-API voor partners.
 * Vereist een Associates account.
 *
 * Aanmelden: https://affiliate-program.amazon.nl
 * Documentatie: https://webservices.amazon.com/paapi5/documentation/
 *
 * LET OP: Amazon PA-API heeft strikte rate limits:
 * - 1 request per seconde standaard
 * - Meer na voldoende sales
 */
export const amazonFeed: ShopFeedConfig = {
  shopSlug: 'amazon-nl',
  type: 'json',
  url: envOrPlaceholder(
    'AMAZON_FEED_URL',
    'https://PLACEHOLDER.amazon.nl/paapi5/searchitems',
  ),
  headers: {
    'X-Amz-Access-Key': envOrPlaceholder('AMAZON_ACCESS_KEY', ''),
    'X-Amz-Secret-Key': envOrPlaceholder('AMAZON_SECRET_KEY', ''),
    'X-Amz-Partner-Tag': envOrPlaceholder('AMAZON_PARTNER_TAG', ''),
  },
  fieldMapping: {
    ean: 'ItemInfo.ExternalIds.EANs.DisplayValues.0',
    name: 'ItemInfo.Title.DisplayValue',
    brand: 'ItemInfo.ByLineInfo.Brand.DisplayValue',
    category: 'ItemInfo.Classifications.Binding.DisplayValue',
    price: 'Offers.Listings.0.Price.Amount',
    url: 'DetailPageURL',
    inStock: 'Offers.Listings.0.Availability.Type',
    imageUrl: 'Images.Primary.Large.URL',
  },
};

/**
 * MediaMarkt Affiliate Feed (via Awin)
 *
 * MediaMarkt biedt datafeeds via het Awin affiliate netwerk.
 *
 * Aanmelden: https://www.awin.com
 */
export const mediamarktFeed: ShopFeedConfig = {
  shopSlug: 'mediamarkt',
  type: 'csv',
  url: envOrPlaceholder(
    'MEDIAMARKT_FEED_URL',
    'https://PLACEHOLDER.awin.com/mediamarkt-productfeed.csv',
  ),
  fieldMapping: {
    ean: 'ean',
    mpn: 'manufacturer_number',
    name: 'product_name',
    brand: 'brand_name',
    category: 'merchant_category',
    price: 'search_price',
    url: 'aw_deep_link',
    inStock: 'in_stock',
    shipping: 'delivery_cost',
    imageUrl: 'aw_image_url',
    description: 'description',
  },
  categoryFilter: [
    'computer', 'telefoon', 'tablet', 'tv', 'audio',
    'gaming', 'foto', 'netwerk', 'wearables',
  ],
};

/**
 * Megekko Direct Feed (JSON)
 *
 * Megekko is gespecialiseerd in PC-componenten.
 * Feed beschikbaar na direct contact.
 */
export const megekkoFeed: ShopFeedConfig = {
  shopSlug: 'megekko',
  type: 'json',
  url: envOrPlaceholder(
    'MEGEKKO_FEED_URL',
    'https://PLACEHOLDER.megekko.nl/api/products.json',
  ),
  headers: {
    'X-API-Key': envOrPlaceholder('MEGEKKO_API_KEY', ''),
  },
  fieldMapping: {
    ean: 'ean',
    mpn: 'sku',
    name: 'title',
    brand: 'manufacturer',
    category: 'category',
    price: 'price_incl',
    url: 'url',
    inStock: 'in_stock',
    shipping: 'shipping_cost',
    imageUrl: 'image',
  },
};

/**
 * Azerty Affiliate Feed (via TradeTracker)
 *
 * Azerty is gespecialiseerd in PC-componenten en randapparatuur.
 */
export const azertyFeed: ShopFeedConfig = {
  shopSlug: 'azerty',
  type: 'xml',
  url: envOrPlaceholder(
    'AZERTY_FEED_URL',
    'https://PLACEHOLDER.tradetracker.net/azerty-feed.xml',
  ),
  fieldMapping: {
    ean: 'EAN',
    mpn: 'SKU',
    name: 'name',
    brand: 'brand',
    category: 'category',
    price: 'price',
    url: 'URL',
    inStock: 'inStock',
    imageUrl: 'imageURL',
  },
};

// ─── All feeds ──────────────────────────────────────────────────────────────

/** Alle geconfigureerde shop feeds */
export const ALL_SHOP_FEEDS: ShopFeedConfig[] = [
  bolComFeed,
  coolblueFeed,
  alternateFeed,
  amazonFeed,
  mediamarktFeed,
  megekkoFeed,
  azertyFeed,
];

/** Zoek feed config op shop slug */
export function getShopFeed(slug: string): ShopFeedConfig | undefined {
  return ALL_SHOP_FEEDS.find(f => f.shopSlug === slug);
}

/** Lijst van beschikbare shop slugs */
export function getAvailableShops(): string[] {
  return ALL_SHOP_FEEDS.map(f => f.shopSlug);
}
