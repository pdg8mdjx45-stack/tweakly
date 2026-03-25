import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { LiquidGlassTabBar } from '@/components/liquid-glass-tab-bar';

// Bottom inset so page content is never hidden behind the floating pill
export const FLOATING_TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 62 + 28 + 16 : 62 + 16 + 12;

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidGlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Hide the default tab bar completely — we render our own
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Home'         }} />
      <Tabs.Screen name="nieuws"  options={{ title: 'Nieuws'       }} />
      <Tabs.Screen name="reviews" options={{ title: 'Reviews'      }} />
      <Tabs.Screen name="prijzen" options={{ title: 'Prijzen'      }} />
      <Tabs.Screen name="profiel" options={{ title: 'Instellingen' }} />

      {/* Hidden tabs — navigable programmatically, not shown in bar */}
      <Tabs.Screen name="zoeken"                    options={{ href: null }} />
      <Tabs.Screen name="meldingen"                 options={{ href: null }} />
      <Tabs.Screen name="bladwijzers"               options={{ href: null }} />
      <Tabs.Screen name="categorieen"               options={{ href: null }} />
      <Tabs.Screen name="instellingen-meldingen"    options={{ href: null }} />
      <Tabs.Screen name="instellingen-categorieen"  options={{ href: null }} />
    </Tabs>
  );
}
