/**
 * Product types — genormaliseerd schema v2
 *
 * De DB is genormaliseerd (aparte tabellen voor brands, shops, specs, etc.)
 * maar de frontend werkt met een geflattende Product interface.
 * product-db.ts doet de conversie.
 */

// ─── Database entity types (1:1 met DB tabellen) ────────────────────────────

export interface DbBrand {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  website: string | null;
}

export interface DbCategory {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  icon: string | null;
  sort_order: number;
}

export interface DbShop {
  id: number;
  name: string;
  slug: string;
  website: string;
  logo_url: string | null;
  logo_code: string | null;
  is_active: boolean;
}

export interface DbProduct {
  id: number;
  external_id: string | null;
  name: string;
  brand_id: number;
  category_id: number;
  ean: string | null;
  mpn: string | null;
  description: string | null;
  image_url: string | null;
  preview_url: string | null;
  rating: number;
  review_count: number;
  badge: 'prijsdaling' | 'deal' | 'nieuw' | null;
  disclaimer: string | null;
  source: string;
  release_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbShopPrice {
  id: number;
  product_id: number;
  shop_id: number;
  price: number;
  currency: string;
  url: string;
  in_stock: boolean;
  shipping: number;
  verified: boolean;
  last_checked: string;
}

export interface DbPriceHistory {
  recorded_at: string;
  shop_name: string;
  shop_id: number | null;
  price: number;
}

export interface DbSpecValue {
  key_name: string;
  value: string;
  unit: string | null;
  sort_order: number;
}

// ─── product_overview view (gebruikt door de meeste queries) ─────────────────

export interface ProductOverview {
  id: number;
  external_id: string | null;
  name: string;
  brand: string;
  brand_slug: string;
  category: string;
  category_slug: string;
  category_parent_id: number | null;
  ean: string | null;
  mpn: string | null;
  image_url: string | null;
  preview_url: string | null;
  rating: number;
  review_count: number;
  badge: 'prijsdaling' | 'deal' | 'nieuw' | null;
  disclaimer: string | null;
  source: string;
  release_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_price: number;
  highest_price: number;
  shop_count: number;
  lowest_price: number;
}

// ─── Frontend types (backward-compatible met oude Product interface) ─────────

export interface ShopLink {
  name: string;
  price: number;
  url: string;
  logo: string;
  verified?: boolean;
  shipping?: number;
  inStock?: boolean;
  lastChecked?: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  type: 'kleur' | 'opslag' | 'model' | 'configuratie';
  price: number;
  shops: ShopLink[];
  imageUrl?: string;
  ean?: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  shop?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  previewUrl?: string;
  currentPrice: number;
  originalPrice: number;
  lowestPrice: number;
  rating: number;
  reviewCount: number;
  priceHistory: PriceHistoryPoint[];
  shops: ShopLink[];
  specs: Record<string, string>;
  badge?: 'prijsdaling' | 'deal' | 'nieuw';
  ean?: string;
  disclaimer?: string;
  variants?: ProductVariant[];
}

export interface CategoryWithCount {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  icon: string | null;
  sortOrder: number;
  productCount: number;
}

// ─── Conversion: ProductOverview → Product ───────────────────────────────────

export function overviewToProduct(row: ProductOverview): Product {
  return {
    id: row.external_id || String(row.id),
    name: row.name,
    brand: row.brand,
    category: row.category,
    imageUrl: row.image_url || '',
    previewUrl: row.preview_url ?? undefined,
    currentPrice: Number(row.current_price) || 0,
    originalPrice: Number(row.highest_price) || Number(row.current_price) || 0,
    lowestPrice: Number(row.lowest_price) || 0,
    rating: Number(row.rating) || 0,
    reviewCount: row.review_count || 0,
    priceHistory: [], // Loaded separately via get_price_history RPC
    shops: [],        // Loaded separately via get_shop_prices RPC
    specs: {},        // Loaded separately via get_product_specs RPC
    badge: row.badge ?? undefined,
    ean: row.ean ?? undefined,
    disclaimer: row.disclaimer ?? undefined,
  };
}
