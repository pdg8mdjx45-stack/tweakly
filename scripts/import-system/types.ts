/**
 * Types voor het product import systeem
 */

/** Ruwe product data zoals het binnenkomt vanuit een shop feed */
export interface RawShopProduct {
  /** EAN / GTIN barcode */
  ean?: string;
  /** Manufacturer Part Number */
  mpn?: string;
  /** Product naam zoals de shop het noemt */
  name: string;
  /** Merk */
  brand?: string;
  /** Categorie (shop's eigen categorisering) */
  category?: string;
  /** Prijs in EUR */
  price: number;
  /** Directe product URL bij de shop */
  url: string;
  /** Op voorraad */
  inStock?: boolean;
  /** Verzendkosten */
  shipping?: number;
  /** Product afbeelding URL */
  imageUrl?: string;
  /** Beschrijving */
  description?: string;
}

/** Configuratie voor een shop feed */
export interface ShopFeedConfig {
  /** Shop slug (moet overeenkomen met shops tabel) */
  shopSlug: string;
  /** Type feed */
  type: 'xml' | 'json' | 'csv';
  /** URL van de feed */
  url: string;
  /** Optionele headers (bijv. API key) */
  headers?: Record<string, string>;
  /** Mapping van feed velden naar RawShopProduct velden */
  fieldMapping: FieldMapping;
  /** Optionele filter (bijv. alleen elektronica) */
  categoryFilter?: string[];
}

/** Mapping van feed velden naar onze standaard velden */
export interface FieldMapping {
  ean?: string;       // pad naar EAN in feed item (bijv. 'gtin' of 'ean13')
  mpn?: string;       // pad naar MPN
  name: string;       // pad naar productnaam
  brand?: string;     // pad naar merk
  category?: string;  // pad naar categorie
  price: string;      // pad naar prijs
  url: string;        // pad naar product URL
  inStock?: string;   // pad naar voorraadstatus
  shipping?: string;  // pad naar verzendkosten
  imageUrl?: string;  // pad naar afbeelding
  description?: string;
}

/** Resultaat van een product match poging */
export interface MatchResult {
  /** Gevonden product ID in products_v2, of null als geen match */
  productId: number | null;
  /** Match methode */
  method: 'ean' | 'mpn' | 'fuzzy' | 'none';
  /** Betrouwbaarheid 0-1 */
  confidence: number;
}

/** Import statistieken */
export interface ImportStats {
  shopSlug: string;
  startedAt: Date;
  finishedAt?: Date;
  totalFeedItems: number;
  matchedByEan: number;
  matchedByMpn: number;
  matchedByFuzzy: number;
  newProducts: number;
  pricesUpdated: number;
  pricesInserted: number;
  errors: number;
  skipped: number;
}
