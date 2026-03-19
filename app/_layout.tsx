import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { LoadingScreen } from '@/components/loading-screen';
import { Palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { BookmarksProvider } from '@/hooks/use-bookmarks';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '@/hooks/use-theme-context';
import { TourProvider } from '@/hooks/use-tour';
import { ReduceMotionProvider } from '@/hooks/use-reduce-motion';
import { setupNotificationHandler } from '@/services/notification-service';
import { registerPushToken } from '@/services/push-token';

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

  useEffect(() => {
    setupNotificationHandler();
  }, []);

  useEffect(() => {
    if (user?.id) {
      void registerPushToken(user.id);
    }
  }, [user?.id]);

  // Navigatiewacht: redirect op basis van auth-status
  useEffect(() => {
    if (authLoading || !appReady) return;

    const segs = segments as string[];
    const inAuthGroup = segs[0] === '(auth)';
    const authScreen = segs[1];

    if (!user) {
      // Niet ingelogd → naar inlogscherm
      if (!inAuthGroup) {
        router.replace('/(auth)/inloggen');
      }
    } else if (!emailVerified) {
      // Ingelogd maar niet geverifieerd → wacht-scherm
      const onVerificationScreen = inAuthGroup && authScreen === 'verificatie';
      if (!onVerificationScreen) {
        router.replace('/(auth)/verificatie');
      }
    } else if (inAuthGroup) {
      // Volledig ingelogd maar nog op auth-scherm → naar tabs
      // (behalve voor verify, verificatie en onboarding)
      const onVerifyScreen = authScreen === 'verify';
      const onOnboardingScreen = authScreen === 'onboarding';
      if (!onVerifyScreen && !onOnboardingScreen) {
        router.replace('/(tabs)');
      }
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
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="cookies" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ReduceMotionProvider>
        <AppThemeProvider>
          <BookmarksProvider>
            <TourProvider>
              <RootLayoutContent />
            </TourProvider>
          </BookmarksProvider>
        </AppThemeProvider>
      </ReduceMotionProvider>
    </AuthProvider>
  );
}
