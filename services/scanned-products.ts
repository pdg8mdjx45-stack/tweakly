/**
 * Scanned Products — Supabase persistence for link-scanner results.
 *
 * Tables: scanned_products, scanned_price_history
 */

import { supabase } from './supabase';

export interface ShopLink {
  name: string;
  price: number | null;
  url: string;
}

export interface ScannedProduct {
  id: string;
  shop_slug: string;
  shop_product_id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  current_price: number;
  affiliate_url: string;
  original_url: string;
  category: string | null;
  specs: Record<string, string> | null;
  shop_links: ShopLink[] | null;
  created_at: string;
  updated_at: string;
}

export interface ScannedPricePoint {
  id: string;
  scanned_product_id: string;
  price: number;
  checked_at: string;
}

export interface ScannedProductWithHistory extends ScannedProduct {
  priceHistory: ScannedPricePoint[];
}

// ─── Upsert ────────────────────────────────────────────────────────────────────

export async function upsertScannedProduct(data: {
  shop_slug: string;
  shop_product_id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  current_price: number;
  affiliate_url: string;
  original_url: string;
  category?: string | null;
  specs?: Record<string, string> | null;
  shop_links?: ShopLink[] | null;
}): Promise<ScannedProduct | null> {
  const { data: row, error } = await supabase
    .from('scanned_products')
    .upsert(
      { ...data, updated_at: new Date().toISOString() },
      { onConflict: 'shop_slug,shop_product_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.warn('upsertScannedProduct error:', error.message);
    return null;
  }
  return row as ScannedProduct;
}

// ─── Price history ─────────────────────────────────────────────────────────────

export async function addPricePoint(
  scannedProductId: string,
  price: number
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: last } = await supabase
    .from('scanned_price_history')
    .select('price, checked_at')
    .eq('scanned_product_id', scannedProductId)
    .order('checked_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last) {
    const lastDate = (last.checked_at as string).slice(0, 10);
    if (lastDate === today && Number(last.price) === price) return;
  }

  const { error } = await supabase.from('scanned_price_history').insert({
    scanned_product_id: scannedProductId,
    price,
    checked_at: new Date().toISOString(),
  });

  if (error) console.warn('addPricePoint error:', error.message);
}

// ─── Fetch ─────────────────────────────────────────────────────────────────────

export async function getScannedProduct(
  shopSlug: string,
  shopProductId: string
): Promise<ScannedProductWithHistory | null> {
  const { data: product, error } = await supabase
    .from('scanned_products')
    .select('*')
    .eq('shop_slug', shopSlug)
    .eq('shop_product_id', shopProductId)
    .single();

  if (error || !product) return null;

  const { data: history } = await supabase
    .from('scanned_price_history')
    .select('*')
    .eq('scanned_product_id', product.id)
    .order('checked_at', { ascending: true });

  return {
    ...(product as ScannedProduct),
    priceHistory: (history ?? []) as ScannedPricePoint[],
  };
}

export async function getAllScannedProducts(): Promise<ScannedProduct[]> {
  const { data, error } = await supabase
    .from('scanned_products')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('getAllScannedProducts error:', error.message);
    return [];
  }
  return (data ?? []) as ScannedProduct[];
}

export async function getScannedProductsByCategory(category: string): Promise<ScannedProduct[]> {
  const { data, error } = await supabase
    .from('scanned_products')
    .select('*')
    .eq('category', category)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('getScannedProductsByCategory error:', error.message);
    return [];
  }
  return (data ?? []) as ScannedProduct[];
}
