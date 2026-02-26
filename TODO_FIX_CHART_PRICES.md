# Fix Plan: Chart Dots, Prices, and Photos

## Information Gathered

The app uses a multi-layered data system:
1. **Mock data** (constants/mock-data-fixed.ts) - curated fallback products with placeholder prices/images
2. **Supabase storage** - scraped product data from Tweakers
3. **Tweakers Pricewatch API** (services/tweakers-pricewatch.ts) - live prices, shop offers, price history
4. **Icecat API** - product specs and images

The chart component (components/charts/price-history-chart.tsx) receives data from either:
- `product.priceHistory` (curated mock data)
- `tweakersPriceHistory.prices` (live Tweakers data)

## Issues Identified

### 1. Chart has "way too much dots"
- Price history from Tweakers can contain 100+ data points
- The chart renders every single point without downsampling
- `propsForDots: { r: '3' }` shows all points

### 2. Prices not accurate
- Tweakers API may fail or match products incorrectly
- Fallback mock data has placeholder/incorrect prices
- No fallback to real scraped data

### 3. Photos not accurate
- Tweakers images may be missing or low quality
- Icecat matching may fail
- Fallback to placehold.co generic images

## Plan

### Fix 1: Chart Downsampling
**File:** `components/charts/price-history-chart.tsx`

Add intelligent downsampling:
- If <= 10 points: show all
- If 10-30 points: show every 2nd point
- If 30-60 points: show every 3rd point  
- If 60-100 points: show every 5th point
- If > 100 points: show every 10th point

Also add sampling visualization option and reduce dot size for dense data.

### Fix 2: Improve Price Fetching
**File:** `services/tweakers-pricewatch.ts`

- Add longer cache TTL for price history (2 hours instead of 30 min)
- Add retry logic with exponential backoff
- Add fallback to historical average if live fetch fails

### Fix 3: Improve Image Sources
**Files:** `services/icecat-api.ts`, `hooks/use-product-image.ts`

- Add more image source fallbacks (Google Images API, etc.)
- Add image quality validation (reject too small images)
- Add persistent caching for validated images

### Fix 4: Better Fallback Data
**File:** `constants/mock-data-fixed.ts`

- Verify all prices are accurate for popular products
- Add real product images URLs where possible
- Add note that these are fallback only

## Dependent Files to Edit
1. `components/charts/price-history-chart.tsx` - Chart downsampling
2. `services/tweakers-pricewatch.ts` - Better caching
3. `services/icecat-api.ts` - Better image handling
4. `hooks/use-product-image.ts` - Better image hook

## Followup Steps
1. Test chart with products that have 100+ price points
2. Verify prices match Tweakers website
3. Check image quality for top 20 products

