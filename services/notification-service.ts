/**
 * Notification Service — handles local push notifications for price drops.
 *
 * Uses expo-notifications for local notifications (no server needed).
 * Notifications are triggered by the background price checker when a
 * product's price drops below the user's target price.
 */

import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

// ─── Configuration ──────────────────────────────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permission handling ────────────────────────────────────────────────────

let _permissionGranted: boolean | null = null;

export async function requestPermissions(): Promise<boolean> {
  if (_permissionGranted !== null) return _permissionGranted;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') {
    _permissionGranted = true;
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  _permissionGranted = status === 'granted';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('price-drops', {
      name: 'Prijsdalingen',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0066FF',
      sound: 'default',
    });
  }

  return _permissionGranted;
}

// ─── Send notification ──────────────────────────────────────────────────────

export async function sendPriceDropNotification(
  productName: string,
  oldPrice: number,
  newPrice: number,
  productId: string,
): Promise<void> {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  const savings = oldPrice - newPrice;
  const pctDrop = Math.round((savings / oldPrice) * 100);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Prijsdaling: ${productName}`,
      body: `Van €${oldPrice.toFixed(2)} naar €${newPrice.toFixed(2)} (-${pctDrop}%)`,
      data: { productId, type: 'price-drop' },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'price-drops' }),
    },
    trigger: null, // Send immediately
  });
}

// ─── Notification response handler (tap on notification) ────────────────────

let _handlerRegistered = false;

export function setupNotificationHandler(): void {
  if (_handlerRegistered) return;
  _handlerRegistered = true;

  // Handle notification tap when app is in foreground or background
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.productId && data?.type === 'price-drop') {
      router.push(`/product/${data.productId}`);
    }
  });
}
