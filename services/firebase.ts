/**
 * Firebase initialisatie
 *
 * Stap 1: Ga naar https://console.firebase.google.com en maak een project aan.
 * Stap 2: Ga naar Authentication → Sign-in method en activeer "Email/Wachtwoord".
 * Stap 3: Ga naar Project Settings → Jouw apps → voeg een Web App toe.
 * Stap 4: Kopieer de config hieronder.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
// @ts-expect-error - getReactNativePersistence is available in firebase/auth for RN
import { getReactNativePersistence, GoogleAuthProvider, initializeAuth } from 'firebase/auth';
// @ts-expect-error - getMessaging is available in firebase/messaging for RN
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAFUwoctnz_NPZ8KXaLkUUo49eC6imONUs",
  authDomain: "tweakly-e6a6f.firebaseapp.com",
  projectId: "tweakly-e6a6f",
  storageBucket: "tweakly-e6a6f.firebasestorage.app",
  messagingSenderId: "834914271134",
  appId: "1:834914271134:web:838b666f01602330aba08f",
  measurementId: "G-H44FS0WM7N"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'consent',
});

googleProvider.addScope('profile');
googleProvider.addScope('email');

export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export const VERIFICATION_URL = 'https://tweakly.nl/verify';
