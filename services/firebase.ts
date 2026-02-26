/**
 * Firebase initialisatie
 *
 * Stap 1: Ga naar https://console.firebase.google.com en maak een project aan.
 * Stap 2: Ga naar Authentication → Sign-in method en activeer "Email/Wachtwoord".
 * Stap 3: Ga naar Project Settings → Jouw apps → voeg een Web App toe.
 * Stap 4: Kopieer de config hieronder.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
// @ts-expect-error - getReactNativePersistence is available in firebase/auth for RN
import { getReactNativePersistence, GoogleAuthProvider, initializeAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAFUwoctnz_NPZ8KXaLkUUo49eC6imONUs",
  authDomain: "tweakly-e6a6f.firebaseapp.com",
  projectId: "tweakly-e6a6f",
  storageBucket: "tweakly-e6a6f.firebasestorage.app",
  messagingSenderId: "834914271134",
  appId: "1:834914271134:web:838b666f01602330aba08f",
  measurementId: "G-H44FS0WM7N"
};

const app = initializeApp(firebaseConfig);

// initializeAuth met AsyncStorage persistence zorgt ervoor dat de gebruiker
// ingelogd blijft tussen app-sessies (sessie onthouden).
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Google Auth Provider voor Google Inloggen
export const googleProvider = new GoogleAuthProvider();

// Configureer Google provider voor offline access (nodig voor Firebase)
// Dit geeft toegang tot de access token na de OAuth flow
googleProvider.setCustomParameters({
  prompt: 'consent',
});

// Scope nodig voor basis gebruikersinfo
googleProvider.addScope('profile');
googleProvider.addScope('email');

/**
 * Email verificatie URL configureren
 * Dit moet overeenkomen met de URL in Firebase Console
 * Ga naar: Firebase Console → Authentication → Settings → Email templates
 */
export const VERIFICATION_URL = 'https://tweakly.nl/verify';
