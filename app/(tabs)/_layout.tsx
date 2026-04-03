import { FloatingTabBar } from '@/components/floating-tab-bar';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Home' }} />
      <Tabs.Screen name="nieuws"   options={{ title: 'Nieuws' }} />
      <Tabs.Screen name="reviews"  options={{ title: 'Reviews' }} />
      <Tabs.Screen name="prijzen"  options={{ title: 'Prijzen' }} />
      <Tabs.Screen name="profiel"  options={{ title: 'Instellingen' }} />
      <Tabs.Screen name="zoeken"      options={{ href: null }} />
      <Tabs.Screen name="meldingen"   options={{ href: null }} />
      <Tabs.Screen name="bladwijzers" options={{ href: null }} />
      <Tabs.Screen name="categorieen" options={{ href: null }} />
    </Tabs>
  );
}
