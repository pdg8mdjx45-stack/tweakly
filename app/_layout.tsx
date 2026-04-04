import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });

import ErrorBoundary from '@/components/error-boundary';
import { LoadingScreen } from '@/components/loading-screen';
import { Palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { BookmarksProvider } from '@/hooks/use-bookmarks';
import { ReduceMotionProvider } from '@/hooks/use-reduce-motion';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '@/hooks/use-theme-context';
import { ToastProvider } from '@/hooks/use-toast';
import { TourProvider } from '@/hooks/use-tour';
import { setupNotificationHandler } from '@/services/notification-service';
import { registerPushToken } from '@/services/push-token';

// iOS 26 Liquid Glass light theme
const RevolutLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Palette.primary,
    background: '#F2F2F7',
    card: 'rgba(255,255,255,0.82)',
    text: '#000000',
    border: 'rgba(0,0,0,0.10)',
    notification: Palette.primary,
  },
};

// iOS 26 Liquid Glass dark theme
const RevolutDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Palette.primary,
    background: Palette.dark1,
    card: 'rgba(28,28,36,0.88)',
    border: 'rgba(255,255,255,0.10)',
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
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  useEffect(() => {
    if (isExpoGo) return;
    setupNotificationHandler();
  }, [isExpoGo]);

  useEffect(() => {
    if (isExpoGo) return;
    if (user?.id) {
      void registerPushToken(user.id);
    }
  }, [isExpoGo, user?.id]);

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
        <Stack.Screen
          name="categorieen"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="recommender/index"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="instellingen/meldingen" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="instellingen/bladwijzers" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="instellingen/prijsalerts" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="instellingen/zoeken" options={{ headerShown: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="link-scanner" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="cookies" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="affiliate" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <ReduceMotionProvider>
            <AppThemeProvider>
              <BookmarksProvider>
                <TourProvider>
                  <ToastProvider>
                    <RootLayoutContent />
                  </ToastProvider>
                </TourProvider>
              </BookmarksProvider>
            </AppThemeProvider>
          </ReduceMotionProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
