# Link Scanner — Real Data Design

**Date:** 2026-04-05  
**Status:** Approved

## Summary

Replace the UI-only mockup in `app/link-scanner.tsx` with a fully functional product link scanner. The user pastes any shop URL, Tweakly extracts the product from that page, builds an affiliate link, saves the product + first price point to Supabase, and lets the user set a price alert.

---

## Architecture

### New files

**`services/url-parser.ts`**  
Detects shop from URL hostname. Extracts:
- `shopSlug` — matches a slug in `constants/affiliate-shops.ts`
- `productId` — shop-specific: ASIN for Amazon, numeric ID for Bol.com/Coolblue/MediaMarkt, slug for others
- `productName` — from URL path slug (cleaned, de-hyphenated)
- `canonicalUrl` — normalized product URL

Supported shops and ID extraction patterns:

| Shop | Hostname | Product ID extraction |
|------|----------|-----------------------|
| Amazon.nl | amazon.nl, amazon.de, amazon.com | `/dp/{ASIN}` or `/gp/product/{ASIN}` |
| Bol.com | bol.com | `/p/{slug}/{id}` — last numeric segment |
| Coolblue | coolblue.nl | `/p/{id}` — numeric suffix in last segment |
| MediaMarkt | mediamarkt.nl | `/product/{id}` — numeric segment |
| Alternate | alternate.nl | `/product/{id}` |
| Zalando | zalando.nl | last path segment before query |
| Wehkamp | wehkamp.nl | last path segment |
| Unknown shops | any | last meaningful path segment as name, no productId |

Falls back gracefully for unknown shops: uses the URL hostname as shop name, last path segment as product name, no productId.

**`services/scanned-products.ts`**  
Manages scanned products in Supabase.

```ts
interface ScannedProduct {
  id: string;               // uuid
  shop_slug: string;        // e.g. 'amazon-nl'
  shop_product_id: string;  // ASIN, bol ID, etc.
  name: string;
  brand: string | null;
  image_url: string | null;
  current_price: number;
  affiliate_url: string;    // affiliate link or fallback original URL
  original_url: string;     // the URL the user pasted
  created_at: string;
  updated_at: string;
}

interface ScannedPricePoint {
  id: string;
  scanned_product_id: string;
  price: number;
  checked_at: string;
}
```

Functions:
- `upsertScannedProduct(data)` — insert or update by `(shop_slug, shop_product_id)` unique key. Updates `current_price` and `updated_at` on conflict.
- `addPricePoint(scannedProductId, price)` — appends a row to `scanned_price_history`. Deduplicates: if the last point's price equals the new price AND it was recorded today, skip.
- `getScannedProduct(shopSlug, shopProductId)` — fetch product + all price history points ordered by `checked_at`.
- `getAllScannedProducts()` — for future "Mijn gescande producten" list.

### Updated files

**`constants/affiliate-shops.ts`**  
Add missing shops with `active: false`:
- `zalando` — no affiliate program currently
- `wehkamp` — no affiliate program currently
- `bol-com` — upgrade to `active: true` when approved (buildAffiliateUrl via Daisycon partner link)

**`app/link-scanner.tsx`**  
Replace mock `handleScan` with real pipeline. Keep all existing UI components and styles — only the data layer changes.

---

## Data Flow

```
User pastes URL → taps "Scan link"
  ↓
parseShopUrl(url)
  → { shopSlug, productId, productName, canonicalUrl }
  ↓
fetchProductMeta(url)
  → fetch page, read og:title / og:image / og:price meta tags
  → { name, imageUrl, price }   (falls back to slug name if CORS blocked)
  ↓
buildAffiliateUrl(shopSlug, productId, originalUrl)
  → affiliate URL if active, else original URL
  ↓
upsertScannedProduct(...)
addPricePoint(id, price)
  ↓
Render results
```

**CORS handling:** React Native's `fetch` does not have CORS restrictions (it runs natively, not in a browser). Meta tag fetching will work for all shops on device. On Expo web/simulator it may fail — fall back to slug-derived name silently.

---

## Supabase Schema (2 new tables)

```sql
-- Table: scanned_products
create table scanned_products (
  id uuid primary key default gen_random_uuid(),
  shop_slug text not null,
  shop_product_id text not null,
  name text not null,
  brand text,
  image_url text,
  current_price numeric(10,2) not null,
  affiliate_url text not null,
  original_url text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (shop_slug, shop_product_id)
);

-- Table: scanned_price_history
create table scanned_price_history (
  id uuid primary key default gen_random_uuid(),
  scanned_product_id uuid references scanned_products(id) on delete cascade,
  price numeric(10,2) not null,
  checked_at timestamptz default now()
);

-- Index for fast history lookups
create index on scanned_price_history (scanned_product_id, checked_at);
```

---

## UI Sections (post-scan)

1. **Product card** — uses existing `ProductCard` component. Constructed `Product` object from scraped data. Missing fields default to: `rating: 0`, `reviewCount: 0`, `specs: {}`, `badge: undefined`, `lowestPrice: current_price`.

2. **Prijshistorie** — `MiniChart` (already in link-scanner.tsx) fed with `scanned_price_history` rows mapped to `{ date: string, price: number }`. First scan shows single point labeled "Vandaag". Chart grows over time as user re-scans.

3. **Beste aanbieding** — green gradient CTA button (existing style). Shows shop name + price. `onPress` opens `affiliate_url` via `Linking.openURL`.

4. **Prijsalert instellen** — existing alert row UI. Tapping "Instellen" reveals an inline `TextInput` for target price + confirm button. On confirm: calls `addAlert()` from `alerts-store.ts` with the scanned product's ID and current price.

5. **Affiliate disclaimer** — existing small text.

### Error states

- **URL not recognized:** "We herkennen deze link niet. Probeer een link van Bol.com, Amazon, Coolblue of een andere winkel."
- **Product not found (meta fetch failed + no slug):** "Product niet gevonden. Controleer de link en probeer opnieuw."
- **Network error:** "Geen verbinding. Controleer je internet en probeer opnieuw."

All errors show a retry button that resets state and re-focuses the input.

---

## Affiliate URL Logic

```
if shop.affiliate.active:
  → shop.affiliate.buildAffiliateUrl(originalUrl, productId)
else:
  → originalUrl  (direct to shop, no affiliate tag)
```

When a new affiliate approval comes in: set `active: true` in `affiliate-shops.ts` and add `buildAffiliateUrl`. All previously scanned products keep their stored `affiliate_url` — future re-scans will pick up the new affiliate link.

---

## Out of Scope

- Bulk scanning / barcode scanning
- Price comparison across multiple shops for the same scanned product
- Background price re-checking (separate feature)
- "Mijn gescande producten" list screen (separate feature)
