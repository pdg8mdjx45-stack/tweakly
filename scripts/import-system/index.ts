/**
 * Tweakly Import System
 *
 * Compleet feed import systeem voor prijsvergelijking.
 *
 * Bestanden:
 *   types.ts              — Type definities (RawShopProduct, ShopFeedConfig, etc.)
 *   feed-parser.ts        — XML/JSON/CSV feed parser
 *   product-matcher.ts    — Product matching (EAN → MPN → fuzzy)
 *   feed-importer.ts      — Import orchestratie (download → parse → match → upsert)
 *   shop-feeds.ts         — Feed configuraties per webshop
 *   upload-products-v2.ts — Upload bestaande data naar genormaliseerd schema
 *   daily-snapshot.ts     — Dagelijkse prijshistorie snapshot
 *   run-import.ts         — CLI tool
 */

export { parseFeed } from './feed-parser';
export { FeedImporter, printStats } from './feed-importer';
export { ProductMatcher } from './product-matcher';
export { ALL_SHOP_FEEDS, getShopFeed, getAvailableShops } from './shop-feeds';
export type {
  RawShopProduct,
  ShopFeedConfig,
  FieldMapping,
  MatchResult,
  ImportStats,
} from './types';
