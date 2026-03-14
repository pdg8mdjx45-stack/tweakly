/**
 * Universele Feed Parser
 *
 * Parset XML, JSON en CSV feeds naar een genormaliseerd RawShopProduct formaat.
 * Gebruikt FieldMapping om velden van de feed te mappen naar onze standaard interface.
 */

import { XMLParser } from 'fast-xml-parser';
import type { RawShopProduct, ShopFeedConfig, FieldMapping } from './types';

// ─── Main parse function ────────────────────────────────────────────────────

/**
 * Parse feed content naar RawShopProduct array.
 * Detecteert automatisch of het XML, JSON of CSV is op basis van config.type.
 */
export function parseFeed(content: string, config: ShopFeedConfig): RawShopProduct[] {
  switch (config.type) {
    case 'xml':
      return parseXmlFeed(content, config.fieldMapping, config.categoryFilter);
    case 'json':
      return parseJsonFeed(content, config.fieldMapping, config.categoryFilter);
    case 'csv':
      return parseCsvFeed(content, config.fieldMapping, config.categoryFilter);
    default:
      throw new Error(`Onbekend feed type: ${config.type}`);
  }
}

// ─── XML Parser ─────────────────────────────────────────────────────────────

function parseXmlFeed(
  xml: string,
  mapping: FieldMapping,
  categoryFilter?: string[],
): RawShopProduct[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    isArray: (name) => {
      // Common feed wrapper elements that contain product arrays
      const arrayTags = ['product', 'item', 'entry', 'offer', 'artikel'];
      return arrayTags.includes(name.toLowerCase());
    },
  });

  const parsed = parser.parse(xml);

  // Find the product array — could be nested in various wrapper elements
  const items = findProductArray(parsed);
  if (!items) {
    console.warn('Geen producten gevonden in XML feed');
    return [];
  }

  return mapItems(items, mapping, categoryFilter);
}

// ─── JSON Parser ────────────────────────────────────────────────────────────

function parseJsonFeed(
  json: string,
  mapping: FieldMapping,
  categoryFilter?: string[],
): RawShopProduct[] {
  const parsed = JSON.parse(json);

  // Could be an array directly, or nested in a wrapper object
  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else {
    const found = findProductArray(parsed);
    items = found || [];
  }

  return mapItems(items, mapping, categoryFilter);
}

// ─── CSV Parser ─────────────────────────────────────────────────────────────

function parseCsvFeed(
  csv: string,
  mapping: FieldMapping,
  categoryFilter?: string[],
): RawShopProduct[] {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // Detect delimiter (tab, semicolon, or comma)
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t'
    : firstLine.includes(';') ? ';'
    : ',';

  const headers = parseCsvLine(firstLine, delimiter);
  const items: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length && j < values.length; j++) {
      row[headers[j].trim()] = values[j];
    }
    items.push(row);
  }

  return mapItems(items, mapping, categoryFilter);
}

/** Parse een CSV regel met respect voor quotes */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

/**
 * Zoek recursief naar een array van objecten in een genest object.
 * Handig voor feeds met wrappers zoals <products><product>...</product></products>
 */
function findProductArray(obj: unknown): unknown[] | null {
  if (Array.isArray(obj)) return obj;
  if (typeof obj !== 'object' || obj === null) return null;

  for (const value of Object.values(obj)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      return value;
    }
  }

  // One level deeper
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const found = findProductArray(value);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Haal een waarde op via een dot-separated pad.
 * Bijv. getNestedValue(item, 'pricing.price') → item.pricing.price
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/** Map feed items naar RawShopProduct array */
function mapItems(
  items: unknown[],
  mapping: FieldMapping,
  categoryFilter?: string[],
): RawShopProduct[] {
  const products: RawShopProduct[] = [];

  for (const item of items) {
    const name = String(getNestedValue(item, mapping.name) || '').trim();
    const priceRaw = getNestedValue(item, mapping.price);
    const url = String(getNestedValue(item, mapping.url) || '').trim();

    // Verplichte velden: naam, prijs, URL
    if (!name || !url) continue;

    const price = parsePrice(priceRaw);
    if (price <= 0) continue;

    // Optionele velden
    const category = mapping.category
      ? String(getNestedValue(item, mapping.category) || '').trim()
      : undefined;

    // Categorie filter toepassen
    if (categoryFilter && categoryFilter.length > 0 && category) {
      const lowerCat = category.toLowerCase();
      const matches = categoryFilter.some(f => lowerCat.includes(f.toLowerCase()));
      if (!matches) continue;
    }

    const product: RawShopProduct = {
      name,
      price,
      url,
      ean: mapping.ean ? cleanEan(getNestedValue(item, mapping.ean)) : undefined,
      mpn: mapping.mpn ? String(getNestedValue(item, mapping.mpn) || '').trim() || undefined : undefined,
      brand: mapping.brand ? String(getNestedValue(item, mapping.brand) || '').trim() || undefined : undefined,
      category,
      inStock: mapping.inStock ? parseStock(getNestedValue(item, mapping.inStock)) : undefined,
      shipping: mapping.shipping ? parsePrice(getNestedValue(item, mapping.shipping)) : undefined,
      imageUrl: mapping.imageUrl ? String(getNestedValue(item, mapping.imageUrl) || '').trim() || undefined : undefined,
      description: mapping.description ? String(getNestedValue(item, mapping.description) || '').trim() || undefined : undefined,
    };

    products.push(product);
  }

  return products;
}

/** Parse prijs uit diverse formaten (string, number, met/zonder valutasymbool) */
function parsePrice(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;

  // Strip valutasymbolen en whitespace, vervang komma door punt
  const cleaned = value
    .replace(/[€$£\s]/g, '')
    .replace(',', '.');

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Parse voorraadstatus uit diverse formaten */
function parseStock(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value !== 'string') return true;

  const lower = value.toLowerCase().trim();
  const inStockValues = ['true', '1', 'yes', 'ja', 'in stock', 'instock', 'op voorraad', 'in_stock', 'available'];
  return inStockValues.includes(lower);
}

/** Clean en valideer EAN */
function cleanEan(value: unknown): string | undefined {
  if (!value) return undefined;
  const ean = String(value).replace(/\D/g, '');
  // EAN-8, EAN-13, of UPC-A
  if (ean.length === 8 || ean.length === 12 || ean.length === 13) {
    return ean;
  }
  return undefined;
}
