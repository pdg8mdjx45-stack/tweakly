/**
 * Background Price Checker — periodically checks prices for active alerts.
 *
 * Uses expo-background-fetch + expo-task-manager to run checks
 * even when the app is backgrounded. Sends local notifications
 * via notification-service when prices drop below target.
 *
 * Price source: Tweakers Pricewatch (free, no API key needed).
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { getAlerts, updateAlertPrice } from './alerts-store';
import { sendPriceDropNotification } from './notification-service';
import { searchTweakers } from './tweakers-pricewatch';

const TASK_NAME = 'TWEAKLY_PRICE_CHECK';
const MAX_CHECKS_PER_RUN = 5; // iOS gives ~30s, so limit checks
const CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between checks for same product

// ─── Task definition (must be top-level, outside of component tree) ─────────

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const result = await checkPricesForAlerts();
    return result
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Core price checking logic ──────────────────────────────────────────────

export async function checkPricesForAlerts(): Promise<boolean> {
  const alerts = await getAlerts();
  if (alerts.length === 0) return false;

  const now = Date.now();
  let hasNewData = false;
  let checksPerformed = 0;

  // Sort by least recently checked first
  const sorted = [...alerts].sort((a, b) => {
    const aTime = a.lastChecked ? new Date(a.lastChecked).getTime() : 0;
    const bTime = b.lastChecked ? new Date(b.lastChecked).getTime() : 0;
    return aTime - bTime;
  });

  for (const alert of sorted) {
    if (checksPerformed >= MAX_CHECKS_PER_RUN) break;

    // Skip if checked recently
    if (alert.lastChecked) {
      const elapsed = now - new Date(alert.lastChecked).getTime();
      if (elapsed < CHECK_COOLDOWN_MS) continue;
    }

    checksPerformed++;

    try {
      const results = await searchTweakers(alert.productName);
      if (results.length === 0) {
        // Still update lastChecked so we don't keep retrying
        await updateAlertPrice(alert.id, alert.currentPrice);
        continue;
      }

      // Find the best price from search results
      const pricesFound = results
        .map(r => r.price)
        .filter((p): p is number => p !== null && p > 0);

      if (pricesFound.length === 0) {
        await updateAlertPrice(alert.id, alert.currentPrice);
        continue;
      }

      const newPrice = Math.min(...pricesFound);
      const oldPrice = alert.currentPrice;

      await updateAlertPrice(alert.id, newPrice);
      hasNewData = true;

      // Send notification if price dropped below target
      if (newPrice <= alert.targetPrice && !alert.notified) {
        await sendPriceDropNotification(
          alert.productName,
          oldPrice > 0 ? oldPrice : alert.originalPrice ?? newPrice * 1.1,
          newPrice,
          alert.productId,
        );
      }
    } catch {
      // Individual check failed, continue with others
    }
  }

  return hasNewData;
}

// ─── Registration ───────────────────────────────────────────────────────────

let _registered = false;

export async function registerBackgroundPriceCheck(): Promise<void> {
  if (_registered) return;

  try {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60 * 60, // 1 hour minimum
      stopOnTerminate: false,
      startOnBoot: true,
    });
    _registered = true;
  } catch {
    // Background fetch not available (e.g. Expo Go, web)
  }
}

export async function unregisterBackgroundPriceCheck(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    _registered = false;
  } catch {
    // Not registered
  }
}
