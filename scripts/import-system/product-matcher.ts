/**
 * Product Matching Systeem
 *
 * Matcht inkomende shop producten aan bestaande producten in de database.
 * Prioriteit: EAN → MPN → Fuzzy name matching
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { MatchResult, RawShopProduct } from './types';

export class ProductMatcher {
  private eanIndex = new Map<string, number>();   // ean → product_id
  private mpnIndex = new Map<string, number>();   // mpn → product_id
  private nameIndex: { id: number; name: string; brand: string }[] = [];
  private initialized = false;

  constructor(private supabase: SupabaseClient) {}

  /** Laad alle bestaande producten in geheugen voor snelle matching */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('Loading product index for matching...');

    // Laad in batches van 1000
    let offset = 0;
    const PAGE_SIZE = 1000;
    let total = 0;

    while (true) {
      const { data, error } = await this.supabase
        .from('products_v2')
        .select('id, ean, mpn, name, brand_id')
        .eq('is_active', true)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error('Failed to load product index:', error.message);
        break;
      }
      if (!data || data.length === 0) break;

      for (const row of data) {
        if (row.ean) {
          this.eanIndex.set(normalizeEan(row.ean), row.id);
        }
        if (row.mpn) {
          this.mpnIndex.set(normalizeMpn(row.mpn), row.id);
        }
        this.nameIndex.push({ id: row.id, name: row.name.toLowerCase(), brand: '' });
      }

      total += data.length;
      offset += PAGE_SIZE;
    }

    // Load brand names for name index
    const { data: brands } = await this.supabase.from('brands').select('id, name');
    const brandMap = new Map<number, string>();
    if (brands) {
      for (const b of brands) brandMap.set(b.id, b.name.toLowerCase());
    }

    // Re-load with brand names for fuzzy matching
    this.nameIndex = [];
    offset = 0;
    while (true) {
      const { data } = await this.supabase
        .from('products_v2')
        .select('id, name, brand_id')
        .eq('is_active', true)
        .range(offset, offset + PAGE_SIZE - 1);

      if (!data || data.length === 0) break;

      for (const row of data) {
        this.nameIndex.push({
          id: row.id,
          name: row.name.toLowerCase(),
          brand: brandMap.get(row.brand_id) || '',
        });
      }
      offset += PAGE_SIZE;
    }

    this.initialized = true;
    console.log(`Product index loaded: ${this.eanIndex.size} EANs, ${this.mpnIndex.size} MPNs, ${this.nameIndex.length} names`);
  }

  /** Match een shop product aan een bestaand product */
  match(product: RawShopProduct): MatchResult {
    // 1. EAN match (meest betrouwbaar)
    if (product.ean) {
      const normalized = normalizeEan(product.ean);
      const id = this.eanIndex.get(normalized);
      if (id !== undefined) {
        return { productId: id, method: 'ean', confidence: 1.0 };
      }
    }

    // 2. MPN match
    if (product.mpn) {
      const normalized = normalizeMpn(product.mpn);
      const id = this.mpnIndex.get(normalized);
      if (id !== undefined) {
        return { productId: id, method: 'mpn', confidence: 0.95 };
      }
    }

    // 3. Fuzzy name match
    const fuzzyResult = this.fuzzyMatch(product.name, product.brand);
    if (fuzzyResult) {
      return fuzzyResult;
    }

    return { productId: null, method: 'none', confidence: 0 };
  }

  /** Registreer een nieuw product in de index (na insert) */
  registerProduct(id: number, ean?: string, mpn?: string, name?: string, brand?: string): void {
    if (ean) this.eanIndex.set(normalizeEan(ean), id);
    if (mpn) this.mpnIndex.set(normalizeMpn(mpn), id);
    if (name) this.nameIndex.push({ id, name: name.toLowerCase(), brand: (brand || '').toLowerCase() });
  }

  /** Fuzzy name matching met scoring */
  private fuzzyMatch(name: string, brand?: string): MatchResult | null {
    const normalizedName = normalizeName(name);
    const normalizedBrand = (brand || '').toLowerCase().trim();

    let bestMatch: { id: number; score: number } | null = null;

    for (const entry of this.nameIndex) {
      let score = 0;

      // Brand match bonus
      if (normalizedBrand && entry.brand === normalizedBrand) {
        score += 0.3;
      }

      // Name similarity
      const nameSim = tokenSimilarity(normalizedName, entry.name);
      score += nameSim * 0.7;

      // Moet minstens 0.75 scoren om als match te tellen
      if (score > 0.75 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { id: entry.id, score };
      }
    }

    if (bestMatch) {
      return {
        productId: bestMatch.id,
        method: 'fuzzy',
        confidence: Math.min(bestMatch.score, 0.95), // cap op 0.95
      };
    }

    return null;
  }
}

// ─── Helper functions ────────────────────────────────────────────────────────

/** Normaliseer EAN (strip leading zeros, alleen cijfers) */
function normalizeEan(ean: string): string {
  return ean.replace(/\D/g, '').replace(/^0+/, '');
}

/** Normaliseer MPN (lowercase, strip whitespace) */
function normalizeMpn(mpn: string): string {
  return mpn.toLowerCase().replace(/[\s\-_]+/g, '').trim();
}

/** Normaliseer productnaam voor vergelijking */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // verwijder speciale tekens
    .replace(/\s+/g, ' ')
    .trim();
}

/** Token-based similarity (Jaccard-achtig met gewicht voor woordvolgorde) */
function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter(t => t.length > 1));
  const tokensB = new Set(b.split(' ').filter(t => t.length > 1));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = tokensA.size + tokensB.size - intersection;
  if (union === 0) return 0;

  // Jaccard similarity
  const jaccard = intersection / union;

  // Bonus voor model nummers die matchen (bijv. "RTX 4070", "S25 Ultra")
  const modelPattern = /\b(\d{3,}[a-z]*|[a-z]+\d{3,})\b/gi;
  const modelsA = new Set((a.match(modelPattern) || []).map(m => m.toLowerCase()));
  const modelsB = new Set((b.match(modelPattern) || []).map(m => m.toLowerCase()));

  let modelBonus = 0;
  if (modelsA.size > 0 && modelsB.size > 0) {
    let modelMatch = 0;
    for (const m of modelsA) {
      if (modelsB.has(m)) modelMatch++;
    }
    if (modelMatch > 0) {
      modelBonus = 0.15; // bonus voor matching model numbers
    }
  }

  return Math.min(jaccard + modelBonus, 1.0);
}
