/**
 * Alerts Store — persists price alerts in AsyncStorage.
 *
 * Since we don't have a backend for real-time price tracking,
 * alerts are stored locally and users can manually check prices
 * via Google Shopping links.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'tweakly-alerts-v1';

export interface PriceAlert {
  id: string;
  productId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  originalPrice?: number;
  createdAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

let cachedAlerts: PriceAlert[] | null = null;

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeAlerts(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function getAlerts(): Promise<PriceAlert[]> {
  if (cachedAlerts) return cachedAlerts;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cachedAlerts = raw ? JSON.parse(raw) : [];
    return cachedAlerts!;
  } catch {
    return [];
  }
}

async function persist(alerts: PriceAlert[]) {
  cachedAlerts = alerts;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // silently fail
  }
  notify();
}

export async function addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): Promise<PriceAlert> {
  const alerts = await getAlerts();
  // Don't duplicate alerts for the same product
  const existing = alerts.find(a => a.productId === alert.productId);
  if (existing) {
    // Update the existing alert
    existing.targetPrice = alert.targetPrice;
    existing.currentPrice = alert.currentPrice;
    await persist(alerts);
    return existing;
  }

  const newAlert: PriceAlert = {
    ...alert,
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  alerts.push(newAlert);
  await persist(alerts);
  return newAlert;
}

export async function removeAlert(alertId: string): Promise<void> {
  const alerts = await getAlerts();
  await persist(alerts.filter(a => a.id !== alertId));
}

export async function clearAlerts(): Promise<void> {
  await persist([]);
}

/** Generate a Google Shopping URL to check the current price */
export function getCheckPriceUrl(productName: string): string {
  const q = encodeURIComponent(productName);
  return `https://www.google.com/search?tbm=shop&q=${q}`;
}
