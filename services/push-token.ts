/**
 * Push Token Registration
 *
 * Vraagt toestemming, haalt het Expo Push Token op, en slaat het op in
 * Supabase zodat de server notificaties kan sturen als de app niet open is.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    // Vraag toestemming
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Android notificatiekanalen
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('nieuws', {
        name: 'Nieuws & Reviews',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('price-drops', {
        name: 'Prijsdalingen',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0066FF',
        sound: 'default',
      });
    }

    // Haal Expo Push Token op
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0da93413-4fdc-478f-8a35-7125c1163674',
    });

    const token = tokenData.data;
    if (!token) return;

    // Sla op in Supabase (upsert — zelfde apparaat overschrijft zichzelf)
    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
      },
      { onConflict: 'user_id,token', ignoreDuplicates: false },
    );
  } catch (err) {
    // Nooit crashen door token registratie
    console.warn('[push-token] registratie mislukt:', err);
  }
}

export async function unregisterPushToken(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '0da93413-4fdc-478f-8a35-7125c1163674',
    });
    if (!tokenData.data) return;
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', tokenData.data);
  } catch {
    // silently fail
  }
}
