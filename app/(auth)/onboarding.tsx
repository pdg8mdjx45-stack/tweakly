import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';

import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useThemeContext } from '@/hooks/use-theme-context';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@onboarding_done';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

type Slide = {
  id: string;
  type: 'logo' | 'icon';
  icon?: IoniconName;
  accentColor: string;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  {
    id: '1',
    type: 'logo',
    accentColor: Palette.primary,
    title: 'Welkom bij Tweakly',
    subtitle: 'Jouw slimme gids voor de beste tech-aankopen in Nederland',
  },
  {
    id: '2',
    type: 'icon',
    icon: 'newspaper-outline',
    accentColor: '#1A73E8',
    title: 'Nieuws & Reviews',
    subtitle: 'Het laatste technologienieuws en onafhankelijke productreviews op één plek',
  },
  {
    id: '3',
    type: 'icon',
    icon: 'pricetag-outline',
    accentColor: '#34C759',
    title: 'Prijsvergelijking',
    subtitle: 'Vergelijk prijzen bij tientallen webshops en vind altijd de beste deal',
  },
  {
    id: '4',
    type: 'icon',
    icon: 'notifications-outline',
    accentColor: Palette.primary,
    title: 'Prijsalerts',
    subtitle: 'Stel een doelprijs in en ontvang direct een melding zodra de prijs daalt',
  },
];

export default function OnboardingScreen() {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';
  const router = useRouter();

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleFinish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(auth)/inloggen');
  }, [router]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleFinish();
    }
  }, [activeIndex, handleFinish]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActiveIndex(viewableItems[0].index ?? 0);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = activeIndex === SLIDES.length - 1;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={[styles.slide, { width }]}>
      {/* Illustration */}
      <View style={styles.illustrationArea}>
        <View style={[styles.outerCircle, { backgroundColor: item.accentColor + '18' }]}>
          <View style={[styles.innerCircle, { backgroundColor: item.accentColor + '28' }]}>
            {item.type === 'logo' ? (
              <Image
                source={require('@/assets/images/logo no text removebg.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name={item.icon!} size={72} color={item.accentColor} />
            )}
          </View>
        </View>
      </View>

      {/* Text */}
      <View style={styles.textArea}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <Text style={[styles.brand, { color: Palette.primary }]}>tweakly</Text>
        {!isLast && (
          <Pressable
            onPress={handleFinish}
            hitSlop={12}
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.55 }]}
          >
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Overslaan</Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
      />

      {/* Bottom controls */}
      <View style={[styles.bottom, { backgroundColor: colors.background }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 22, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity, backgroundColor: Palette.primary }]}
              />
            );
          })}
        </View>

        {/* Primary button */}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: Palette.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {isLast ? 'Aan de slag' : 'Volgende'}
          </Text>
          {!isLast && (
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#fff"
              style={{ marginLeft: Spacing.sm }}
            />
          )}
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

const ILLUSTRATION_SIZE = Math.min(width * 0.7, 280);

const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.lg : Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  skipBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm },
  skipText: { fontSize: 15, fontWeight: '500' },

  flatList: { flex: 1 },

  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },

  illustrationArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerCircle: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    borderRadius: ILLUSTRATION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircle: {
    width: ILLUSTRATION_SIZE * 0.72,
    height: ILLUSTRATION_SIZE * 0.72,
    borderRadius: (ILLUSTRATION_SIZE * 0.72) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: ILLUSTRATION_SIZE * 0.52,
    height: ILLUSTRATION_SIZE * 0.52,
  },

  textArea: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: 300,
  },

  bottom: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Platform.OS === 'android' ? Spacing.xl : Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  dot: {
    height: 8,
    borderRadius: Radius.full,
  },

  primaryBtn: {
    width: '100%',
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  loginLink: { paddingVertical: Spacing.xs },
  loginLinkText: { fontSize: 14 },
});
