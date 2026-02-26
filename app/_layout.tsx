import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';

import { LoadingScreen } from '@/components/loading-screen';
import { Palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { BookmarksProvider } from '@/hooks/use-bookmarks';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '@/hooks/use-theme-context';

// Revolut-inspired light theme
const RevolutLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Palette.primary,
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#000000',
    border: '#C6C6C8',
    notification: Palette.primary,
  },
};

// Revolut-inspired dark theme (default for Revolut)
const RevolutDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Palette.primary,
    background: Palette.dark1,
    card: Palette.dark2,
    border: Palette.dark4,
    notification: Palette.primary,
    text: '#FFFFFF',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutContent() {
  const { resolvedTheme } = useThemeContext();
  const { user, loading: authLoading, emailVerified } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [appReady, setAppReady] = useState(false);

  // Navigatiewacht: redirect op basis van auth-status
  useEffect(() => {
    if (authLoading || !appReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onVerificationScreen = inAuthGroup && segments[1] === 'verificatie';
    const onVerifyScreen = inAuthGroup && segments[1] === 'verify';

    if (!user) {
      // Niet ingelogd → naar inlogscherm
      if (!inAuthGroup) {
        router.replace('/(auth)/inloggen');
      }
    } else if (!emailVerified) {
      // Ingelogd maar niet geverifieerd → wacht-scherm
      if (!onVerificationScreen) {
        router.replace('/(auth)/verificatie');
      }
    } else if (inAuthGroup && !onVerifyScreen) {
      // Volledig ingelogd maar nog op auth-scherm → naar tabs
      // (verify-scherm mag zichzelf afhandelen na code-uitwisseling)
      router.replace('/(tabs)');
    }
  }, [user, authLoading, appReady, emailVerified, segments, router]);

  // Laadscherm totdat animatie klaar is
  if (!appReady) {
    return <LoadingScreen onReady={() => setAppReady(true)} />;
  }

  // Kort leeg scherm terwijl Firebase auth-status wordt geladen
  if (authLoading) {
    return <View style={{ flex: 1, backgroundColor: resolvedTheme === 'dark' ? Palette.dark1 : '#F2F2F7' }} />;
  }

  return (
    <ThemeProvider value={resolvedTheme === 'dark' ? RevolutDark : RevolutLight}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="artikel/[id]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="product/[id]"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="vergelijk"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: 'Prijsalert instellen' }}
        />
        <Stack.Screen
          name="pc-builder"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppThemeProvider>
        <BookmarksProvider>
          <RootLayoutContent />
        </BookmarksProvider>
      </AppThemeProvider>
    </AuthProvider>
  );
}
