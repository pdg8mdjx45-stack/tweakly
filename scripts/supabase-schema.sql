-- Supabase Products Table Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Create the products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  preview_url TEXT,
  current_price NUMERIC DEFAULT 0,
  original_price NUMERIC DEFAULT 0,
  lowest_price NUMERIC DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  price_history JSONB DEFAULT '[]'::jsonb,
  shops JSONB DEFAULT '[]'::jsonb,
  specs JSONB DEFAULT '{}'::jsonb,
  badge TEXT,
  ean TEXT,
  disclaimer TEXT,
  variants JSONB,
  source TEXT NOT NULL DEFAULT 'icecat', -- 'curated' or 'icecat'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
CREATE INDEX IF NOT EXISTS idx_products_badge ON products (badge) WHERE badge IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_ean ON products (ean) WHERE ean IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_source ON products (source);
CREATE INDEX IF NOT EXISTS idx_products_current_price ON products (current_price) WHERE current_price > 0;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_products_search ON products
  USING GIN (to_tsvector('simple', name || ' ' || brand || ' ' || category));

-- 3. Enable Row Level Security (read-only for anon)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
