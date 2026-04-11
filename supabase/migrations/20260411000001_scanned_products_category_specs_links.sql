-- Migration: extend scanned_products with category, specs, shop_links
-- and add blocked_keywords table for content moderation

-- Add new columns to scanned_products
alter table scanned_products
  add column if not exists category text,
  add column if not exists specs jsonb,
  add column if not exists shop_links jsonb;

-- Index on category for fast category queries
create index if not exists scanned_products_category_idx
  on scanned_products (category)
  where category is not null;

-- Content moderation: blocked keywords
create table if not exists blocked_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  created_at timestamptz not null default now()
);

-- Only service role can manage blocked keywords (no RLS for anon/user)
alter table blocked_keywords enable row level security;

create policy "Service role only"
  on blocked_keywords
  for all
  using (false)
  with check (false);

-- Seed initial blocked keywords
insert into blocked_keywords (keyword) values
  ('sekspeeltje'),
  ('vibrator'),
  ('dildo'),
  ('fleshlight'),
  ('buttplug'),
  ('wietpijp'),
  ('bong'),
  ('wapen'),
  ('pistool'),
  ('munitie'),
  ('pornografie'),
  ('escort')
on conflict (keyword) do nothing;
