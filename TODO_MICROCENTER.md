# Microcenter Scraper Implementation Notes

## Status: Created ✓ | Testing: Blocked by Anti-Bot Protection (403)

### What Was Created

1. **Script**: `scripts/scraper-microcenter.ts`
   - Full-featured scraper following the same pattern as Tweakers scraper
   - Supports 18 tech product categories
   - Handles cookies, session management, and error recovery
   - Generates specs based on product names/prices
   - Outputs to `data/products-microcenter.json`

2. **Package Script**: Added `scrape-microcenter` to package.json

### The Problem

Microcenter.com actively blocks automated scraping:
- Returns HTTP 403 Forbidden
- Uses Cloudflare/bot detection services
- Requires human-like browser behavior

### Possible Solutions

1. **Use a headless browser** (Puppeteer/Playwright) - More realistic browser simulation
2. **Use proxy rotation** - Distribute requests across IPs
3. **Use their official API** - Check if Microcenter has a product API
4. **Third-party data providers** - Services like:
   - PriceAPI
   - ProxyCrawl
   - ScrapingBee
   - BrightData

### Current Code Structure

```typescript
// Categories supported:
- Processors
- Grafische kaarten (Video Cards)
- Moerborden (Motherboards)
- Geheugen (Memory)
- Opslag (SSD/HDD)
- Voedingen (Power Supplies)
- Computerbehuizingen (Cases)
- CPU-koelers
- Laptops
- Desktops
- Monitoren
- Toetsenborden (Keyboards)
- Muizen (Mice)
- Webcams
- Headphones
- Netwerk (Networking)
- Storage Media
```

### To Test Later

When you have a way to bypass anti-bot protection:

```bash
# Run the scraper
npm run scrape-microcenter

# Or with debug mode
npm run scrape-microcenter -- --debug
```

