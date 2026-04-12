# Universal Link Scanner

**Date:** 2026-04-12  
**Status:** Approved  

## Goal

Make the link scanner work for any webshop — Zalando, Nike, H&M, ASOS, Decathlon, Zara, and any future shop — not just the handful that were hardcoded before.

## Problem

The `scan-product` edge function fetches raw HTML and extracts product data via JSON-LD and OG tags. This fails for modern SPA/React-based shops (Zalando, Nike, etc.) because their product data is rendered client-side via JavaScript. The raw HTML contains almost nothing.

**Key insight:** Even SPA shops embed their full product data as a JSON blob in a `<script>` tag for SEO — either in `__NEXT_DATA__` (Next.js, used by most modern shops) or in a shop-specific global like `window.__data__`. This data is available in the raw HTML, we just weren't looking for it.

## Solution: 4-Layer Extraction Pipeline

Replace the current 2-layer approach (JSON-LD → OG tags) with a 4-layer pipeline. First non-null result wins for base product data.

```
Layer 1: Shop-specific embedded JSON  ← new, highest specificity
Layer 2: Generic __NEXT_DATA__        ← new, catches most modern shops
Layer 3: JSON-LD structured data      ← existing
Layer 4: OG meta tags                 ← existing
```

Specs and shop links extraction is unchanged (runs after base data is found).

---

## Layer 1 — Shop-specific extractors

Function: `extractFromShopScript(html, shopSlug)`

Each entry targets known JSON patterns for that shop:

| Shop | Script pattern | Key paths |
|------|---------------|-----------|
| `zalando` / `zalando-lounge` | `__NEXT_DATA__` | `props.pageProps.article.displayName`, `brand.name`, `displayPrice`, `media[0].path` |
| `nike` | `__NEXT_DATA__` | `props.pageProps.initialState` → `Wall.products[0]` or `productDetail` |
| `hm` | `__NEXT_DATA__` | `props.pageProps.product` → `name`, `whitePrice.price`, `images[0].url` |
| `asos` | `__NEXT_DATA__` | `props.initialData.product` |
| `decathlon` | `__NEXT_DATA__` | `props.pageProps.product` |
| `zara` / `zara-home` | `__NEXT_DATA__` | `props.pageProps.product` |
| `about-you` | `__NEXT_DATA__` | `props.pageProps.product` → `name`, `brand.name`, `priceRange.min`, `images[0]` |
| `shein` | `window.gbProductDetailInfo` or `__NEXT_DATA__` | `detail.goods_name`, `detail.retailPrice.amount`, `detail.goods_imgs.main_image.origin_image` |
| `ikea` | `window.__IKEA_REDUX_STATE__` or JSON-LD | `catalog.product.name`, `pricing.price`, `images[0]` — IKEA also publishes good JSON-LD so Layer 3 is strong fallback |
| `adidas` | `__NEXT_DATA__` | `props.pageProps.componentProps.product` → `name`, `brand`, `price.salesPrice.value`, `image.src` |
| `puma` | `__NEXT_DATA__` | `props.pageProps.product` → `name`, `price.formattedValue`, `images[0]` |
| `new-balance` / `vans` / `converse` | `__NEXT_DATA__` | `props.pageProps.product` generic paths |
| `omoda` | `__NEXT_DATA__` | `props.pageProps.product` or `props.pageProps.initialData` |
| `douglas` / `ici-paris` | `__NEXT_DATA__` | `props.pageProps.product` → `name`, `brand`, `price.value`, `images[0].url` |
| `hema` | `__NEXT_DATA__` | `props.pageProps.product` |
| `kruidvat` | `__NEXT_DATA__` | `props.pageProps.product` or `props.pageProps.productDetails` |

---

## Layer 2 — Generic `__NEXT_DATA__` extractor

Function: `extractFromNextData(html)`

Parses `<script id="__NEXT_DATA__">` and probes common object paths:

```
props.pageProps.product
props.pageProps.model
props.pageProps.initialData.product
props.pageProps.data.product
props.pageProps.article
props.pageProps.productsById.*  (first value)
```

For each candidate, looks for fields named: `name`/`title`/`displayName`, `price`/`currentPrice`/`salePrice`, `brand`/`brandName`, `image`/`images[0]`/`imageUrl`.

This single function catches the majority of modern shops without shop-specific code.

---

## New shops in `SHOP_RULES`

All new shops use `buildAffiliateUrl: canonical → canonical` (no affiliate program yet).  
Promo code search terms added for all new shops in `SHOP_SEARCH_TERMS`.

### Fashion & clothing
| Shop | Slug | Host pattern | Product ID extraction |
|------|------|-------------|----------------------|
| Nike | `nike` | `nike\.com` | `/t/*/` → last path segment |
| H&M | `hm` | `hm\.com` | `/productpage\.(\d+)\.html` |
| ASOS | `asos` | `asos\.com` | `/prd/(\d+)` |
| Zara | `zara` | `zara\.com` | last numeric path segment |
| About You | `about-you` | `aboutyou\.nl` | last numeric path segment |
| Shein | `shein` | `shein\.com` | `/-p-(\d+)\.html` |
| Mango | `mango` | `mango\.com` | last path segment (slug-id) |
| Pull&Bear | `pull-bear` | `pullandbear\.com` | last numeric path segment |
| Uniqlo | `uniqlo` | `uniqlo\.com` | `/products/(\w+)` |

### Sports & shoes
| Shop | Slug | Host pattern | Product ID extraction |
|------|------|-------------|----------------------|
| Decathlon | `decathlon` | `decathlon\.nl` | last numeric path segment |
| Intersport | `intersport` | `intersport\.nl` | last numeric path segment |
| JD Sports | `jd-sports` | `jdsports\.nl` | last numeric path segment |
| Foot Locker | `foot-locker` | `footlocker\.nl` | last numeric path segment |
| Schuurman Schoenen | `schuurman` | `schuurman\.nl` | last numeric path segment |
| Nelson | `nelson` | `nelson\.nl` | last numeric path segment |
| Omoda | `omoda` | `omoda\.nl` | last path segment (slug) |
| Van Haren | `van-haren` | `vanharen\.nl` | last numeric path segment |
| Scapino | `scapino` | `scapino\.nl` | last numeric path segment |
| Torfs | `torfs` | `torfs\.be` | last numeric path segment |
| Sacha | `sacha` | `sacha\.nl` | last numeric path segment |
| Adidas | `adidas` | `adidas\.nl` | `/([A-Z0-9]{6})\.html` (product code) |
| Puma | `puma` | `puma\.com` | `/pd/[^/]+/(\d+)` |
| New Balance | `new-balance` | `newbalance\.nl` | last path segment |
| Vans | `vans` | `vans\.nl` | last path segment |
| Converse | `converse` | `converse\.nl` | last path segment |

### Electronics & home improvement
| Shop | Slug | Host pattern | Product ID extraction |
|------|------|-------------|----------------------|
| Praxis | `praxis` | `praxis\.nl` | last numeric path segment |
| Krefel | `krefel` | `krefel\.be` | last numeric path segment |
| BCC | `bcc` | `bcc\.nl` | last numeric path segment |
| Fnac | `fnac` | `fnac\.be` | last numeric path segment |

### General & department stores
| Shop | Slug | Host pattern | Product ID extraction |
|------|------|-------------|----------------------|
| HEMA | `hema` | `hema\.nl` | last path segment |
| Blokker | `blokker` | `blokker\.nl` | last numeric path segment |
| Action | `action` | `action\.com` | last numeric path segment |
| Lidl | `lidl` | `lidl\.nl` | last numeric path segment |
| Kruidvat | `kruidvat` | `kruidvat\.nl` | last numeric path segment |

### Beauty & fragrance
| Shop | Slug | Host pattern | Product ID extraction |
|------|------|-------------|----------------------|
| ICI Paris XL | `ici-paris` | `iciparisxl\.nl` | last numeric path segment |
| Douglas | `douglas` | `douglas\.nl` | last numeric path segment |
| Etos | `etos` | `etos\.nl` | last numeric path segment |
| Parfumerie Douglas | — | covered by `douglas` above | — |

### Furniture & home
| Shop | Slug | Host pattern | Product ID extraction |
|------|------|-------------|----------------------|
| IKEA | `ikea` | `ikea\.com` | `/p/.*-(\d+)` |
| Zara Home | `zara-home` | `zarahome\.com` | last numeric path segment |

---

## `parseShopUrl` fallback improvement

Unknown shops (no rule match) currently return `shopSlug: 'unknown'`. This is kept, but the `shopDisplayName` is always set from the hostname (already done). The key improvement: unknown shops now go through Layer 2 (`__NEXT_DATA__`) and Layer 3 (JSON-LD) and can succeed — they don't short-circuit.

---

## UI change in `link-scanner.tsx`

Update the `invalid_url` error message from:
> "We herkennen deze link niet. Probeer een link van Bol.com, Amazon, Coolblue of een andere winkel."

To:
> "We konden dit product niet uitlezen. Probeer een directe productpagina van een webshop."

This reflects reality: we now try any URL, and the failure is about not finding product data, not about not recognizing the shop.

---

## Files changed

- `supabase/functions/scan-product/index.ts` — all extraction logic, SHOP_RULES, SHOP_SEARCH_TERMS
- `app/link-scanner.tsx` — error message copy update

## Out of scope

- Headless browser rendering (Browserless, Playwright) — costs money
- Undocumented shop APIs — ToS risk, maintenance burden
- Affiliate link building for new shops — requires separate approval process
