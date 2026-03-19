-- ============================================================================
-- Tweakly Database Schema v2 — Genormaliseerd (Tweakers-style Pricewatch)
-- ============================================================================
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Migratie van flat 'products' tabel naar genormaliseerd schema:
--   brands, categories, shops, products, product_images,
--   spec_keys, spec_values, shop_prices, price_history, product_variants
--
-- Volgorde: tabellen zonder dependencies eerst, dan met foreign keys.
-- ============================================================================

-- 0. Helper: updated_at trigger function (hergebruikt)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. BRANDS — Merken (Samsung, Apple, ASUS, ...)
-- ============================================================================
CREATE TABLE IF NOT EXISTS brands (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  website     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands (slug);

-- ============================================================================
-- 2. CATEGORIES — Productcategorieën met hiërarchie
-- ============================================================================
-- parent_id maakt nested categorieën mogelijk:
--   Componenten → Grafische kaarten, Processors, Moederborden, ...
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  icon        TEXT,              -- emoji of icon naam
  sort_order  INTEGER DEFAULT 0, -- volgorde in UI
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);

-- ============================================================================
-- 3. SHOPS — Webwinkels (Coolblue, Bol.com, Amazon, ...)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shops (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  website     TEXT NOT NULL,
  logo_url    TEXT,
  logo_code   TEXT,              -- korte code voor UI (CB, BOL, AMZ)
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops (slug);

-- ============================================================================
-- 4. PRODUCTS — Hoofdtabel producten
-- ============================================================================
CREATE TABLE IF NOT EXISTS products_v2 (
  id              SERIAL PRIMARY KEY,
  external_id     TEXT UNIQUE,       -- origineel ID (sm-1, tweakers ID, etc.)
  name            TEXT NOT NULL,
  brand_id        INTEGER NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  ean             TEXT,
  mpn             TEXT,              -- manufacturer part number
  description     TEXT,
  image_url       TEXT,
  preview_url     TEXT,
  rating          NUMERIC(2,1) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  badge           TEXT CHECK (badge IN ('prijsdaling', 'deal', 'nieuw')),
  disclaimer      TEXT,
  source          TEXT NOT NULL DEFAULT 'icecat',
  release_date    DATE,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_v2_brand ON products_v2 (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_v2_category ON products_v2 (category_id);
CREATE INDEX IF NOT EXISTS idx_products_v2_ean ON products_v2 (ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_v2_mpn ON products_v2 (mpn) WHERE mpn IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_v2_badge ON products_v2 (badge) WHERE badge IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_v2_external ON products_v2 (external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_v2_active ON products_v2 (is_active) WHERE is_active = true;

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_products_v2_search ON products_v2
  USING GIN (to_tsvector('simple', name));

-- updated_at trigger
CREATE TRIGGER products_v2_updated_at
  BEFORE UPDATE ON products_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. PRODUCT_IMAGES — Meerdere afbeeldingen per product
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_images (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products_v2(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN DEFAULT false,
  sort_order  INTEGER DEFAULT 0,
  source      TEXT               -- 'icecat', 'manual', 'scraper'
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id);

-- ============================================================================
-- 6. SPEC_KEYS — Specificatie namen per categorie
-- ============================================================================
-- Bijv. category=Smartphones → 'Scherm', 'Processor', 'RAM', ...
CREATE TABLE IF NOT EXISTS spec_keys (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  unit        TEXT,              -- 'GB', 'MHz', 'mAh', '"', ...
  data_type   TEXT DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'boolean')),
  is_filterable BOOLEAN DEFAULT false,  -- toon in filter sidebar
  sort_order  INTEGER DEFAULT 0,
  UNIQUE (name, category_id)
);

CREATE INDEX IF NOT EXISTS idx_spec_keys_category ON spec_keys (category_id);

-- ============================================================================
-- 7. SPEC_VALUES — Specificatie waarden per product
-- ============================================================================
CREATE TABLE IF NOT EXISTS spec_values (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products_v2(id) ON DELETE CASCADE,
  spec_key_id INTEGER NOT NULL REFERENCES spec_keys(id) ON DELETE CASCADE,
  value       TEXT NOT NULL,
  numeric_value NUMERIC,         -- voor filteren/sorteren op nummer
  UNIQUE (product_id, spec_key_id)
);

CREATE INDEX IF NOT EXISTS idx_spec_values_product ON spec_values (product_id);
CREATE INDEX IF NOT EXISTS idx_spec_values_key ON spec_values (spec_key_id);
CREATE INDEX IF NOT EXISTS idx_spec_values_numeric ON spec_values (numeric_value)
  WHERE numeric_value IS NOT NULL;

-- ============================================================================
-- 8. SHOP_PRICES — Huidige prijzen per shop per product
-- ============================================================================
-- Dit is de kern van de prijsvergelijking.
-- Elke shop heeft een eigen prijs, URL, en voorraadstatus.
CREATE TABLE IF NOT EXISTS shop_prices (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products_v2(id) ON DELETE CASCADE,
  shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  price       NUMERIC(10,2) NOT NULL,
  currency    TEXT DEFAULT 'EUR',
  url         TEXT NOT NULL,          -- directe link naar product bij shop
  in_stock    BOOLEAN DEFAULT true,
  shipping    NUMERIC(10,2) DEFAULT 0,
  verified    BOOLEAN DEFAULT false,  -- geverifieerd via feed/API
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_prices_product ON shop_prices (product_id);
CREATE INDEX IF NOT EXISTS idx_shop_prices_shop ON shop_prices (shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_prices_price ON shop_prices (price);
CREATE INDEX IF NOT EXISTS idx_shop_prices_stock ON shop_prices (in_stock) WHERE in_stock = true;

CREATE TRIGGER shop_prices_updated_at
  BEFORE UPDATE ON shop_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 9. PRICE_HISTORY — Historische prijzen (per product per shop)
-- ============================================================================
-- Dagelijks een snapshot per product/shop combinatie.
-- Maakt prijsgrafieken mogelijk met meerdere lijnen per shop.
CREATE TABLE IF NOT EXISTS price_history (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products_v2(id) ON DELETE CASCADE,
  shop_id     INTEGER REFERENCES shops(id) ON DELETE SET NULL, -- NULL = laagste prijs overall
  price       NUMERIC(10,2) NOT NULL,
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (product_id, shop_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history (product_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_price_history_product_shop ON price_history (product_id, shop_id, recorded_at);

-- ============================================================================
-- 10. PRODUCT_VARIANTS — Varianten (kleur, opslag, model)
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products_v2(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  variant_type TEXT NOT NULL CHECK (variant_type IN ('kleur', 'opslag', 'model', 'configuratie')),
  ean         TEXT,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);

-- Variant prices (per shop)
CREATE TABLE IF NOT EXISTS variant_prices (
  id          SERIAL PRIMARY KEY,
  variant_id  INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  shop_id     INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  price       NUMERIC(10,2) NOT NULL,
  url         TEXT NOT NULL,
  in_stock    BOOLEAN DEFAULT true,
  UNIQUE (variant_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_variant_prices_variant ON variant_prices (variant_id);

-- ============================================================================
-- 11. PRICE_ALERTS — Prijsmeldingen (server-side, vervangt AsyncStorage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_alerts (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,     -- Firebase/Supabase auth user ID
  product_id  INTEGER NOT NULL REFERENCES products_v2(id) ON DELETE CASCADE,
  target_price NUMERIC(10,2) NOT NULL,
  is_triggered BOOLEAN DEFAULT false,
  triggered_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON price_alerts (product_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts (is_triggered)
  WHERE is_triggered = false;

-- ============================================================================
-- PROFILES — User profiles linked to auth.users
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  display_name text,
  age integer,
  push_enabled boolean DEFAULT true,
  email_notif_enabled boolean DEFAULT false,
  category_nieuws boolean DEFAULT true,
  category_reviews boolean DEFAULT true,
  category_prijzen boolean DEFAULT true,
  notif_prijzen boolean DEFAULT true,
  notif_nieuws boolean DEFAULT true,
  notif_reviews boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE USING (auth.uid() = id);

-- ============================================================================
-- VERIFICATION CODES — Email verification codes
-- ============================================================================

CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verify', 'reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes (email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes (code);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_codes_all" ON verification_codes FOR ALL 
  USING (auth.role() = 'service_role' OR auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================================
-- Alle tabellen: lezen voor iedereen, schrijven alleen via service role

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Read policies (anon can read everything except alerts)
CREATE POLICY "brands_read" ON brands FOR SELECT USING (true);
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);
CREATE POLICY "shops_read" ON shops FOR SELECT USING (true);
CREATE POLICY "products_v2_read" ON products_v2 FOR SELECT USING (true);
CREATE POLICY "product_images_read" ON product_images FOR SELECT USING (true);
CREATE POLICY "spec_keys_read" ON spec_keys FOR SELECT USING (true);
CREATE POLICY "spec_values_read" ON spec_values FOR SELECT USING (true);
CREATE POLICY "shop_prices_read" ON shop_prices FOR SELECT USING (true);
CREATE POLICY "price_history_read" ON price_history FOR SELECT USING (true);
CREATE POLICY "product_variants_read" ON product_variants FOR SELECT USING (true);
CREATE POLICY "variant_prices_read" ON variant_prices FOR SELECT USING (true);

-- Alerts: users can only see their own
CREATE POLICY "alerts_read_own" ON price_alerts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "alerts_insert_own" ON price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_delete_own" ON price_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 13. VIEWS — Handige views voor de app
-- ============================================================================

-- Product overzicht met merk, categorie, en laagste prijs
CREATE OR REPLACE VIEW product_overview AS
SELECT
  p.id,
  p.external_id,
  p.name,
  b.name AS brand,
  b.slug AS brand_slug,
  c.name AS category,
  c.slug AS category_slug,
  c.parent_id AS category_parent_id,
  p.ean,
  p.mpn,
  p.image_url,
  p.preview_url,
  p.rating,
  p.review_count,
  p.badge,
  p.disclaimer,
  p.source,
  p.release_date,
  p.is_active,
  p.created_at,
  p.updated_at,
  -- Prijsaggregaties uit shop_prices
  COALESCE(price_agg.min_price, 0) AS current_price,
  COALESCE(price_agg.max_price, 0) AS highest_price,
  COALESCE(price_agg.shop_count, 0) AS shop_count,
  -- Laagste ooit uit price_history
  COALESCE(history_agg.lowest_ever, 0) AS lowest_price
FROM products_v2 p
JOIN brands b ON b.id = p.brand_id
JOIN categories c ON c.id = p.category_id
LEFT JOIN LATERAL (
  SELECT
    MIN(sp.price) AS min_price,
    MAX(sp.price) AS max_price,
    COUNT(*) AS shop_count
  FROM shop_prices sp
  WHERE sp.product_id = p.id AND sp.in_stock = true
) price_agg ON true
LEFT JOIN LATERAL (
  SELECT MIN(ph.price) AS lowest_ever
  FROM price_history ph
  WHERE ph.product_id = p.id
) history_agg ON true;

-- ============================================================================
-- 14. FUNCTIONS — RPC functies voor de app
-- ============================================================================

-- Categorieën met product count
CREATE OR REPLACE FUNCTION get_categories_with_counts()
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  slug TEXT,
  parent_id INTEGER,
  icon TEXT,
  sort_order INTEGER,
  product_count BIGINT
) AS $$
  SELECT
    c.id, c.name, c.slug, c.parent_id, c.icon, c.sort_order,
    COUNT(p.id) AS product_count
  FROM categories c
  LEFT JOIN products_v2 p ON p.category_id = c.id AND p.is_active = true
  GROUP BY c.id
  ORDER BY c.sort_order, c.name;
$$ LANGUAGE sql STABLE;

-- Zoek producten (full-text)
CREATE OR REPLACE FUNCTION search_products_v2(query TEXT, max_results INTEGER DEFAULT 50)
RETURNS SETOF product_overview AS $$
  SELECT po.*
  FROM product_overview po
  JOIN products_v2 p ON p.id = po.id
  WHERE
    p.is_active = true
    AND (
      to_tsvector('simple', p.name) @@ plainto_tsquery('simple', query)
      OR p.name ILIKE '%' || query || '%'
      OR p.ean = query
      OR p.mpn = query
    )
  ORDER BY
    ts_rank(to_tsvector('simple', p.name), plainto_tsquery('simple', query)) DESC,
    po.shop_count DESC
  LIMIT max_results;
$$ LANGUAGE sql STABLE;

-- Prijsgeschiedenis voor een product (voor grafiek)
CREATE OR REPLACE FUNCTION get_price_history(p_product_id INTEGER, p_days INTEGER DEFAULT 90)
RETURNS TABLE (
  recorded_at DATE,
  shop_name TEXT,
  shop_id INTEGER,
  price NUMERIC
) AS $$
  SELECT
    ph.recorded_at,
    COALESCE(s.name, 'Laagste prijs') AS shop_name,
    ph.shop_id,
    ph.price
  FROM price_history ph
  LEFT JOIN shops s ON s.id = ph.shop_id
  WHERE ph.product_id = p_product_id
    AND ph.recorded_at >= CURRENT_DATE - p_days
  ORDER BY ph.recorded_at, s.name;
$$ LANGUAGE sql STABLE;

-- Shop prijzen voor een product (prijsvergelijking tabel)
CREATE OR REPLACE FUNCTION get_shop_prices(p_product_id INTEGER)
RETURNS TABLE (
  shop_name TEXT,
  shop_slug TEXT,
  shop_logo TEXT,
  price NUMERIC,
  shipping NUMERIC,
  total_price NUMERIC,
  url TEXT,
  in_stock BOOLEAN,
  verified BOOLEAN,
  last_checked TIMESTAMPTZ
) AS $$
  SELECT
    s.name AS shop_name,
    s.slug AS shop_slug,
    COALESCE(s.logo_url, s.logo_code) AS shop_logo,
    sp.price,
    sp.shipping,
    sp.price + sp.shipping AS total_price,
    sp.url,
    sp.in_stock,
    sp.verified,
    sp.last_checked
  FROM shop_prices sp
  JOIN shops s ON s.id = sp.shop_id
  WHERE sp.product_id = p_product_id
  ORDER BY sp.price + sp.shipping ASC;
$$ LANGUAGE sql STABLE;

-- Specificaties voor een product
CREATE OR REPLACE FUNCTION get_product_specs(p_product_id INTEGER)
RETURNS TABLE (
  key_name TEXT,
  value TEXT,
  unit TEXT,
  sort_order INTEGER
) AS $$
  SELECT
    sk.name AS key_name,
    sv.value,
    sk.unit,
    sk.sort_order
  FROM spec_values sv
  JOIN spec_keys sk ON sk.id = sv.spec_key_id
  WHERE sv.product_id = p_product_id
  ORDER BY sk.sort_order, sk.name;
$$ LANGUAGE sql STABLE;

-- Prijsdalingen (voor homepage)
CREATE OR REPLACE FUNCTION get_price_drops(max_results INTEGER DEFAULT 10)
RETURNS SETOF product_overview AS $$
  SELECT * FROM product_overview
  WHERE badge = 'prijsdaling' AND is_active = true AND current_price > 0
  ORDER BY shop_count DESC
  LIMIT max_results;
$$ LANGUAGE sql STABLE;

-- Record dagelijkse prijs snapshot (aangeroepen door cron/importer)
CREATE OR REPLACE FUNCTION record_daily_prices()
RETURNS void AS $$
BEGIN
  -- Per-shop prijzen
  INSERT INTO price_history (product_id, shop_id, price, recorded_at)
  SELECT product_id, shop_id, price, CURRENT_DATE
  FROM shop_prices
  WHERE in_stock = true
  ON CONFLICT (product_id, shop_id, recorded_at) DO UPDATE
    SET price = EXCLUDED.price;

  -- Laagste prijs overall (shop_id = NULL)
  INSERT INTO price_history (product_id, shop_id, price, recorded_at)
  SELECT product_id, NULL, MIN(price), CURRENT_DATE
  FROM shop_prices
  WHERE in_stock = true
  GROUP BY product_id
  ON CONFLICT (product_id, shop_id, recorded_at) DO UPDATE
    SET price = EXCLUDED.price;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 15. SEED DATA — Basiswinkels en categorieën
-- ============================================================================

-- Nederlandse webshops
INSERT INTO shops (name, slug, website, logo_code) VALUES
  ('Coolblue',      'coolblue',      'https://www.coolblue.nl',       'CB'),
  ('Bol.com',       'bol-com',       'https://www.bol.com',           'BOL'),
  ('MediaMarkt',    'mediamarkt',    'https://www.mediamarkt.nl',     'MM'),
  ('Amazon.nl',     'amazon-nl',     'https://www.amazon.nl',         'AMZ'),
  ('Alternate',     'alternate',     'https://www.alternate.nl',      'ALT'),
  ('Megekko',       'megekko',       'https://www.megekko.nl',        'MEG'),
  ('Azerty',        'azerty',        'https://www.azerty.nl',         'AZ'),
  ('Paradigit',     'paradigit',     'https://www.paradigit.nl',      'PAR'),
  ('Conrad',        'conrad',        'https://www.conrad.nl',         'CON'),
  ('Expert',        'expert',        'https://www.expert.nl',         'EXP'),
  ('BCC',           'bcc',           'https://www.bcc.nl',            'BCC'),
  ('Informatique',  'informatique',  'https://www.informatique.nl',   'INF'),
  ('4Launch',       '4launch',       'https://www.4launch.nl',        '4L'),
  ('Apple Store',   'apple-store',   'https://www.apple.com/nl',      'APL'),
  ('Samsung Shop',  'samsung-shop',  'https://www.samsung.com/nl',    'SAM')
ON CONFLICT (name) DO NOTHING;

-- Hoofdcategorieën
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Smartphones',      'smartphones',      '📱', 1),
  ('Tablets',           'tablets',           '📲', 2),
  ('Laptops',           'laptops',           '💻', 3),
  ('Desktops',          'desktops',          '🖥️', 4),
  ('Monitoren',         'monitoren',         '🖥️', 5),
  ('Televisies',        'televisies',        '📺', 6),
  ('Audio',             'audio',             '🎧', 7),
  ('Gaming',            'gaming',            '🎮', 8),
  ('Netwerk',           'netwerk',           '📡', 9),
  ('Fotografie',        'fotografie',        '📷', 10),
  ('Wearables',         'wearables',         '⌚', 11),
  ('Componenten',       'componenten',       '🔧', 12),
  ('Randapparatuur',    'randapparatuur',    '⌨️', 13),
  ('Opslag',            'opslag',            '💾', 14),
  ('Printers',          'printers',          '🖨️', 15),
  ('Software',          'software',          '📀', 16),
  ('Accessoires',       'accessoires',       '🔗', 17),
  ('Huishoudelijk',     'huishoudelijk',     '🏠', 18)
ON CONFLICT (slug) DO NOTHING;

-- Subcategorieën (componenten)
INSERT INTO categories (name, slug, parent_id, icon, sort_order)
SELECT sub.name, sub.slug, p.id, sub.icon, sub.sort_order
FROM (VALUES
  ('Grafische kaarten', 'grafische-kaarten', '🎴', 1),
  ('Processors',        'processors',        '⚡', 2),
  ('Moederborden',      'moederborden',      '🔧', 3),
  ('Geheugen',          'geheugen',          '🧩', 4),
  ('SSD',               'ssd',               '💾', 5),
  ('Voedingen',         'voedingen',         '🔌', 6),
  ('Behuizingen',       'behuizingen',       '📦', 7),
  ('CPU-koelers',       'cpu-koelers',       '❄️', 8)
) AS sub(name, slug, icon, sort_order)
CROSS JOIN categories p
WHERE p.slug = 'componenten'
ON CONFLICT (slug) DO NOTHING;

-- Subcategorieën (randapparatuur)
INSERT INTO categories (name, slug, parent_id, icon, sort_order)
SELECT sub.name, sub.slug, p.id, sub.icon, sub.sort_order
FROM (VALUES
  ('Toetsenborden', 'toetsenborden', '⌨️', 1),
  ('Muizen',        'muizen',        '🖱️', 2),
  ('Webcams',       'webcams',       '📹', 3),
  ('Luidsprekers',  'luidsprekers',  '🔊', 4)
) AS sub(name, slug, icon, sort_order)
CROSS JOIN categories p
WHERE p.slug = 'randapparatuur'
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- DONE! Na het uitvoeren van dit script:
-- 1. Run het migratie-script (scripts/migrate-to-v2.ts) om bestaande data over te zetten
-- 2. Update product-db.ts om het nieuwe schema te gebruiken
-- ============================================================================
