import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  // Use fallback to 'light' in case ThemeProvider is not yet initialized
  let colorScheme = 'light';
  try {
    colorScheme = useColorScheme() ?? 'light';
  } catch (e) {
    // ThemeProvider not yet available, use default 'light'
    colorScheme = 'light';
  }
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Palette.primary,
        tabBarInactiveTintColor: isDark ? '#6B6B7B' : '#8E8E93',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(20,20,26,0.85)' : 'rgba(255,255,255,0.88)',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 10,
          shadowColor: isDark ? '#000' : 'rgba(26,58,32,0.1)',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: isDark ? 0.3 : 0.12,
          shadowRadius: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name={focused ? 'house.fill' : 'house'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="nieuws"
        options={{
          title: 'Nieuws',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name={focused ? 'newspaper.fill' : 'newspaper'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Reviews',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name={focused ? 'star.fill' : 'star'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="prijzen"
        options={{
          title: 'Prijzen',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name={focused ? 'tag.fill' : 'tag'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profiel"
        options={{
          title: 'Instellingen',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={focused ? 26 : 24} name={focused ? 'gearshape.fill' : 'gearshape'} color={color} />
          ),
        }}
      />

      {/* Hidden tabs — navigable programmatically but not in the tab bar */}
      <Tabs.Screen name="zoeken" options={{ href: null }} />
      <Tabs.Screen name="meldingen" options={{ href: null }} />
      <Tabs.Screen name="bladwijzers" options={{ href: null }} />
      <Tabs.Screen name="categorieen" options={{ href: null }} />
      <Tabs.Screen name="instellingen-meldingen" options={{ href: null }} />
      <Tabs.Screen name="instellingen-categorieen" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
