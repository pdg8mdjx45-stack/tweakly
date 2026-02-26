/**
 * Supabase initialisatie
 *
 * Stap 1: Ga naar https://supabase.com en maak een gratis project aan.
 * Stap 2: Ga naar Settings → API en kopieer de Project URL en anon key hieronder.
 * Stap 3: Ga naar Authentication → Providers → Email en zet "Confirm email" aan.
 * Stap 4: Ga naar Authentication → URL Configuration en stel in:
 *   - Site URL: tweakly://
 *   - Allowed Redirect URLs: tweakly://*
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = 'https://glnpdfbnyijdzvulzbfv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbnBkZmJueWlqZHp2dWx6YmZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTU4MzUsImV4cCI6MjA4Nzg3MTgzNX0.az-ko5O8XY0wrKwqqssE_Xwowy1o0aof5Rsj5H-ThDM';

const isWeb = Platform.OS === 'web';
const isBrowser = isWeb && typeof window !== 'undefined';

const noopStorage = {
  getItem: (_key: string) => null,
  setItem: (_key: string, _value: string) => {},
  removeItem: (_key: string) => {},
};

const authStorage = isWeb
  ? (isBrowser ? window.localStorage : noopStorage)
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: !isWeb || isBrowser,
    persistSession: !isWeb || isBrowser,
    detectSessionInUrl: isBrowser,
    flowType: 'pkce',
  },
});
