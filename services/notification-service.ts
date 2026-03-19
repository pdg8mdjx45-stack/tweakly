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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let _permissionGranted: boolean | null = null;

export async function requestPermissions(): Promise<boolean> {
  if (_permissionGranted !== null) return _permissionGranted;

  if (Platform.OS === 'web') {
    _permissionGranted = false;
    return false;
  }

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
    
    await Notifications.setNotificationChannelAsync('nieuws', {
      name: 'Nieuws & Reviews',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  return _permissionGranted;
}

export interface NotificationSettings {
  enabled?: boolean;
  notifPrijzen?: boolean;
  notifNieuws?: boolean;
  notifReviews?: boolean;
}

export async function sendPriceDropNotification(
  productName: string,
  oldPrice: number,
  newPrice: number,
  productId: string,
  settings?: NotificationSettings,
): Promise<void> {
  if (settings?.enabled === false || settings?.notifPrijzen === false) return;
  
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
    trigger: null,
  });
}

export async function sendNewsNotification(
  title: string,
  description: string,
  articleId: string,
  category: 'nieuws' | 'reviews' = 'nieuws',
  settings?: NotificationSettings,
): Promise<void> {
  if (settings?.enabled === false) return;
  if (category === 'nieuws' && settings?.notifNieuws === false) return;
  if (category === 'reviews' && settings?.notifReviews === false) return;

  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: description.substring(0, 120) + (description.length > 120 ? '...' : ''),
      data: { articleId, type: 'news' },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'nieuws' }),
    },
    trigger: null,
  });
}

let _handlerRegistered = false;

export function setupNotificationHandler(): void {
  if (_handlerRegistered) return;
  _handlerRegistered = true;

  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.productId && data?.type === 'price-drop') {
      router.push(`/product/${data.productId}`);
    } else if (data?.articleId && data?.type === 'news') {
      router.push(`/artikel/${data.articleId}`);
    }
  });
}
