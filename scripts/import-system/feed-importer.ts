/**
 * Feed Importer — Orchestratie van het hele import process
 *
 * Download feed → parse → match → upsert prijzen in Supabase.
 *
 * LEGAAL & ETHISCH:
 * - Gebruikt ALLEEN officiële affiliate/partner datafeeds (geen scraping)
 * - Respecteert rate limits met configureerbare delay tussen requests
 * - Identificeert zich correct via User-Agent header
 * - Shops bieden deze feeds aan voor affiliates/partners
 */

import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { parseFeed } from './feed-parser';
import { ProductMatcher } from './product-matcher';
import type { ShopFeedConfig, RawShopProduct, ImportStats, MatchResult } from './types';

const USER_AGENT = 'Tweakly/1.0 (Product Price Comparison; contact@tweakly.nl)';
const SUPABASE_URL = 'https://glnpdfbnyijdzvulzbfv.supabase.co';

// Rate limiting defaults
const DEFAULT_REQUEST_DELAY_MS = 2000; // 2 seconden tussen requests
const DEFAULT_BATCH_SIZE = 100;        // upsert in batches van 100

interface ImportOptions {
  /** Supabase service role key */
  serviceKey: string;
  /** Delay in ms tussen HTTP requests (default: 2000) */
  requestDelay?: number;
  /** Batch grootte voor DB upserts (default: 100) */
  batchSize?: number;
  /** Dry run — geen DB writes, alleen statistieken */
  dryRun?: boolean;
  /** Maak ook nieuwe producten aan bij geen match (default: false) */
  createNewProducts?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

export class FeedImporter {
  private supabase: SupabaseClient;
  private matcher: ProductMatcher;
  private options: Required<ImportOptions>;

  constructor(options: ImportOptions) {
    this.supabase = createClient(SUPABASE_URL, options.serviceKey);
    this.matcher = new ProductMatcher(this.supabase);
    this.options = {
      serviceKey: options.serviceKey,
      requestDelay: options.requestDelay ?? DEFAULT_REQUEST_DELAY_MS,
      batchSize: options.batchSize ?? DEFAULT_BATCH_SIZE,
      dryRun: options.dryRun ?? false,
      createNewProducts: options.createNewProducts ?? false,
      verbose: options.verbose ?? false,
    };
  }

  /**
   * Import een complete shop feed.
   * Dit is de hoofdfunctie — download, parse, match, upsert.
   */
  async importFeed(config: ShopFeedConfig): Promise<ImportStats> {
    const stats: ImportStats = {
      shopSlug: config.shopSlug,
      startedAt: new Date(),
      totalFeedItems: 0,
      matchedByEan: 0,
      matchedByMpn: 0,
      matchedByFuzzy: 0,
      newProducts: 0,
      pricesUpdated: 0,
      pricesInserted: 0,
      errors: 0,
      skipped: 0,
    };

    try {
      // 1. Initialiseer product matcher (laad index uit DB)
      await this.matcher.initialize();

      // 2. Zoek shop ID op
      const shopId = await this.getShopId(config.shopSlug);
      if (!shopId) {
        console.error(`Shop '${config.shopSlug}' niet gevonden in database. Voeg eerst toe aan shops tabel.`);
        stats.errors++;
        stats.finishedAt = new Date();
        return stats;
      }

      // 3. Download feed
      this.log(`Downloading feed van ${config.shopSlug}...`);
      const content = await this.downloadFeed(config);
      if (!content) {
        console.error(`Kon feed niet downloaden voor ${config.shopSlug}`);
        stats.errors++;
        stats.finishedAt = new Date();
        return stats;
      }
      this.log(`Feed gedownload: ${(content.length / 1024).toFixed(0)} KB`);

      // 4. Parse feed
      const items = parseFeed(content, config);
      stats.totalFeedItems = items.length;
      this.log(`${items.length} producten geparsed uit feed`);

      if (items.length === 0) {
        stats.finishedAt = new Date();
        return stats;
      }

      // 5. Match en upsert in batches
      const priceBatch: Array<{
        product_id: number;
        shop_id: number;
        price: number;
        url: string;
        in_stock: boolean;
        shipping: number;
        verified: boolean;
      }> = [];

      for (const item of items) {
        const match = this.matcher.match(item);

        if (match.productId) {
          // Track match methode
          switch (match.method) {
            case 'ean': stats.matchedByEan++; break;
            case 'mpn': stats.matchedByMpn++; break;
            case 'fuzzy': stats.matchedByFuzzy++; break;
          }

          priceBatch.push({
            product_id: match.productId,
            shop_id: shopId,
            price: item.price,
            url: item.url,
            in_stock: item.inStock ?? true,
            shipping: item.shipping ?? 0,
            verified: true, // Via officiële feed = verified
          });

          // Flush batch als vol
          if (priceBatch.length >= this.options.batchSize) {
            await this.upsertPrices(priceBatch, stats);
            priceBatch.length = 0;
          }
        } else if (this.options.createNewProducts && item.ean && item.brand) {
          // Optioneel: maak nieuw product aan
          const newId = await this.createProduct(item, shopId);
          if (newId) {
            stats.newProducts++;
            this.matcher.registerProduct(newId, item.ean, item.mpn, item.name, item.brand);
            priceBatch.push({
              product_id: newId,
              shop_id: shopId,
              price: item.price,
              url: item.url,
              in_stock: item.inStock ?? true,
              shipping: item.shipping ?? 0,
              verified: true,
            });
          }
        } else {
          stats.skipped++;
        }
      }

      // Flush resterende batch
      if (priceBatch.length > 0) {
        await this.upsertPrices(priceBatch, stats);
      }

    } catch (err) {
      console.error(`Import fout voor ${config.shopSlug}:`, (err as Error).message);
      stats.errors++;
    }

    stats.finishedAt = new Date();
    return stats;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /** Download feed content met rate limiting en correcte headers */
  private async downloadFeed(config: ShopFeedConfig): Promise<string | null> {
    try {
      const response = await axios.get(config.url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': config.type === 'xml'
            ? 'application/xml, text/xml'
            : config.type === 'json'
            ? 'application/json'
            : 'text/csv, text/plain',
          ...config.headers,
        },
        timeout: 60_000, // 60 seconden timeout
        maxContentLength: 100 * 1024 * 1024, // max 100 MB
        responseType: 'text',
      });

      // Rate limit: wacht na request
      await sleep(this.options.requestDelay);

      return response.data;
    } catch (err) {
      const error = err as { response?: { status: number }; message: string };
      if (error.response?.status === 429) {
        console.error(`Rate limited door ${config.shopSlug}! Wacht langer voor volgende poging.`);
      } else if (error.response?.status === 403) {
        console.error(`Toegang geweigerd voor ${config.shopSlug} feed. Controleer je API key/credentials.`);
      }
      console.error(`Download fout: ${error.message}`);
      return null;
    }
  }

  /** Zoek shop ID op basis van slug */
  private async getShopId(slug: string): Promise<number | null> {
    const { data, error } = await this.supabase
      .from('shops')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data.id;
  }

  /** Upsert prijzen in batches */
  private async upsertPrices(
    batch: Array<{
      product_id: number;
      shop_id: number;
      price: number;
      url: string;
      in_stock: boolean;
      shipping: number;
      verified: boolean;
    }>,
    stats: ImportStats,
  ): Promise<void> {
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Zou ${batch.length} prijzen upserten`);
      stats.pricesUpdated += batch.length;
      return;
    }

    const { error, count } = await this.supabase
      .from('shop_prices')
      .upsert(batch, {
        onConflict: 'product_id,shop_id',
        count: 'exact',
      });

    if (error) {
      console.error(`Upsert fout: ${error.message}`);
      stats.errors += batch.length;
    } else {
      stats.pricesUpdated += batch.length;
      this.log(`${batch.length} prijzen geupsert`);
    }
  }

  /** Maak een nieuw product aan in products_v2 */
  private async createProduct(item: RawShopProduct, shopId: number): Promise<number | null> {
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Zou nieuw product aanmaken: ${item.name}`);
      return null;
    }

    // Zoek of maak brand
    const brandId = await this.getOrCreateBrand(item.brand || 'Onbekend');
    if (!brandId) return null;

    // Zoek categorie (gebruik de eerste match, of 'Accessoires' als default)
    const categoryId = await this.findCategory(item.category);

    const { data, error } = await this.supabase
      .from('products_v2')
      .insert({
        name: item.name,
        brand_id: brandId,
        category_id: categoryId,
        ean: item.ean || null,
        mpn: item.mpn || null,
        description: item.description || null,
        image_url: item.imageUrl || null,
        source: 'feed-import',
        is_active: true,
      })
      .select('id')
      .single();

    if (error || !data) {
      this.log(`Kon product niet aanmaken: ${error?.message}`);
      return null;
    }

    return data.id;
  }

  /** Zoek brand op naam, of maak aan */
  private async getOrCreateBrand(name: string): Promise<number | null> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data } = await this.supabase
      .from('brands')
      .select('id')
      .eq('slug', slug)
      .single();

    if (data) return data.id;

    const { data: newBrand, error } = await this.supabase
      .from('brands')
      .insert({ name, slug })
      .select('id')
      .single();

    if (error) {
      console.error(`Kon brand '${name}' niet aanmaken: ${error.message}`);
      return null;
    }

    return newBrand?.id ?? null;
  }

  /** Zoek categorie op naam (fuzzy) */
  private async findCategory(categoryName?: string): Promise<number> {
    if (!categoryName) return await this.getDefaultCategoryId();

    const { data } = await this.supabase
      .from('categories')
      .select('id, name')
      .ilike('name', `%${categoryName}%`)
      .limit(1)
      .single();

    if (data) return data.id;

    return await this.getDefaultCategoryId();
  }

  private defaultCategoryId: number | null = null;
  private async getDefaultCategoryId(): Promise<number> {
    if (this.defaultCategoryId) return this.defaultCategoryId;

    const { data } = await this.supabase
      .from('categories')
      .select('id')
      .eq('slug', 'accessoires')
      .single();

    this.defaultCategoryId = data?.id ?? 17; // fallback
    return this.defaultCategoryId;
  }

  private log(msg: string): void {
    if (this.options.verbose) {
      console.log(`  [${this.options.dryRun ? 'DRY' : 'LIVE'}] ${msg}`);
    }
  }
}

// ─── Utils ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Print import statistieken */
export function printStats(stats: ImportStats): void {
  const duration = stats.finishedAt
    ? ((stats.finishedAt.getTime() - stats.startedAt.getTime()) / 1000).toFixed(1)
    : '?';

  console.log(`\n─── Import resultaat: ${stats.shopSlug} ───`);
  console.log(`  Duur:             ${duration}s`);
  console.log(`  Feed items:       ${stats.totalFeedItems}`);
  console.log(`  Match (EAN):      ${stats.matchedByEan}`);
  console.log(`  Match (MPN):      ${stats.matchedByMpn}`);
  console.log(`  Match (fuzzy):    ${stats.matchedByFuzzy}`);
  console.log(`  Nieuwe producten: ${stats.newProducts}`);
  console.log(`  Prijzen geupsert: ${stats.pricesUpdated}`);
  console.log(`  Overgeslagen:     ${stats.skipped}`);
  console.log(`  Fouten:           ${stats.errors}`);
  console.log(`─────────────────────────────────────────\n`);
}
