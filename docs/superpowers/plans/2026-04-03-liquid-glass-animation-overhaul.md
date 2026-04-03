# Liquid Glass & Animation Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform every Tweakly screen into an iOS 26 liquid glass experience with cinematic Apple-style animations, consolidate duplicate category screens into one, and add a mock Link Scanner screen.

**Architecture:** Progressive enhancement — wrap each screen in a new `LiquidScreen` component, apply `ClearLiquidGlass` to cards/inputs/groups, wire `GlassShimmer` consistently, and add `FadeInDown` stagger entrances via `react-native-reanimated`. Three dead category screens are deleted and replaced by one shared `app/categorieen.tsx`.

**Tech Stack:** Expo SDK 54, Expo Router, React Native, `expo-blur`, `expo-linear-gradient`, `react-native-reanimated` v3, `expo-glass-effect` (disabled — always use fallback), `useReduceMotion()` hook for accessibility.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `components/liquid-screen.tsx` | OLED background + slow orb animation + FadeIn mount wrapper |
| `app/link-scanner.tsx` | Mock "Paste Link" screen — promo codes, price history, alert, buy CTA |
| `app/categorieen.tsx` | Consolidated category grid — replaces 3 deleted files |

### Deleted files
- `app/(tabs)/categorieen.tsx`
- `app/instellingen/categorieen.tsx`
- `app/categorie-wizard.tsx`

### Modified files
| File | Change |
|---|---|
| `app/(tabs)/_layout.tsx` | Wire `FloatingTabBar`, hide `categorieen` tab |
| `app/(tabs)/index.tsx` | LiquidScreen + Link Scanner entry pill + stagger |
| `app/(tabs)/nieuws.tsx` | LiquidScreen + list stagger |
| `app/(tabs)/reviews.tsx` | LiquidScreen + list stagger |
| `app/(tabs)/prijzen.tsx` | LiquidScreen + glass category chips + stagger |
| `app/(tabs)/profiel.tsx` | LiquidScreen + ClearLiquidGlass groups + avatar lens |
| `app/(tabs)/meldingen.tsx` | LiquidScreen + glass alert rows + progress bar |
| `app/(tabs)/bladwijzers.tsx` | LiquidScreen + glass bookmark cards |
| `app/product/[id].tsx` | LiquidScreen + glass shop rows + lens buy CTA |
| `app/(auth)/inloggen.tsx` | LiquidScreen + glass inputs + lens CTA button |
| `app/(auth)/registreren.tsx` | LiquidScreen + glass inputs + lens CTA button |
| `app/(auth)/onboarding.tsx` | LiquidScreen (prominent orb) + slide animations |
| `app/(auth)/profiel-instellen.tsx` | LiquidScreen + glass inputs |
| `app/(auth)/telefoon.tsx` | LiquidScreen + glass input |
| `app/(auth)/verificatie.tsx` | LiquidScreen + glass input |
| `app/(auth)/verify.tsx` | LiquidScreen + glass card |
| `app/(auth)/wachtwoord-vergeten.tsx` | LiquidScreen + glass input |
| `app/instellingen/meldingen.tsx` | LiquidScreen + ClearLiquidGlass groups |
| `app/instellingen/prijsalerts.tsx` | LiquidScreen + ClearLiquidGlass groups |
| `app/instellingen/zoeken.tsx` | LiquidScreen + ClearLiquidGlass groups |
| `app/instellingen/bladwijzers.tsx` | LiquidScreen + ClearLiquidGlass groups |
| `app/cookies.tsx` | LiquidScreen background only |
| `app/privacy.tsx` | LiquidScreen background only |
| `app/terms.tsx` | LiquidScreen background only |
| `app/affiliate.tsx` | LiquidScreen background only |

---

## Shared animation constants (used across all tasks)

These values are referenced throughout. Define them once at the top of each file that needs them:

```tsx
// Entrance animations
const ENTER_HEADER = FadeInDown.springify().damping(20).stiffness(130);
const enterItem = (i: number) =>
  FadeInDown.delay(Math.min(i, 8) * 45).springify().damping(18).stiffness(110);

// Press spring
const SPRING_PRESS    = { damping: 15, stiffness: 300 };
const SPRING_CTA      = { damping: 12, stiffness: 340 };
```

---

## Task 1: `LiquidScreen` component

**Files:**
- Create: `components/liquid-screen.tsx`

- [ ] **Step 1: Create the file**

```tsx
/**
 * LiquidScreen — shared screen wrapper
 * OLED background + slow-drifting radial orb + FadeIn mount animation
 * NO SafeAreaView — screens are edge-to-edge
 */
import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';

const ORB_ANCHORS = [
  { x: '20%', y: '15%' },
  { x: '70%', y: '30%' },
  { x: '45%', y: '60%' },
];

interface LiquidScreenProps {
  children: ReactNode;
  style?: object;
}

export function LiquidScreen({ children, style }: LiquidScreenProps) {
  const { animationsEnabled } = useReduceMotion();
  const orbX = useSharedValue(0);
  const orbY = useSharedValue(0);

  useEffect(() => {
    if (!animationsEnabled) return;
    orbX.value = withRepeat(
      withSequence(
        withTiming(40,  { duration: 8000 }),
        withTiming(-30, { duration: 8000 }),
        withTiming(0,   { duration: 8000 }),
      ),
      -1,
      true,
    );
    orbY.value = withRepeat(
      withSequence(
        withTiming(30,  { duration: 10000 }),
        withTiming(-20, { duration: 10000 }),
        withTiming(0,   { duration: 10000 }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(orbX);
      cancelAnimation(orbY);
    };
  }, [animationsEnabled]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: orbX.value }, { translateY: orbY.value }],
  }));

  return (
    <View style={[styles.root, style]}>
      {/* Orb */}
      <Animated.View style={[styles.orbWrap, orbStyle]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,255,255,0.012)', 'rgba(255,255,255,0.000)']}
          style={styles.orb}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Content */}
      <Animated.View
        style={styles.content}
        entering={animationsEnabled ? FadeIn.springify().damping(20).stiffness(130) : undefined}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#08080D',
  },
  orbWrap: {
    position: 'absolute',
    top: '10%',
    left: '20%',
    width: 320,
    height: 320,
  },
  orb: {
    flex: 1,
    borderRadius: 999,
  },
  content: {
    flex: 1,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/liquid-screen.tsx
git commit -m "feat: add LiquidScreen wrapper component"
```

---

## Task 2: `app/(tabs)/_layout.tsx` — wire FloatingTabBar

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace the layout with FloatingTabBar**

```tsx
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
      <Tabs.Screen name="zoeken"       options={{ href: null }} />
      <Tabs.Screen name="meldingen"    options={{ href: null }} />
      <Tabs.Screen name="bladwijzers"  options={{ href: null }} />
      <Tabs.Screen name="categorieen"  options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/_layout.tsx
git commit -m "feat: wire FloatingTabBar into tab layout"
```

---

## Task 3: Consolidated `app/categorieen.tsx` + delete dead screens

**Files:**
- Create: `app/categorieen.tsx`
- Delete: `app/(tabs)/categorieen.tsx`
- Delete: `app/instellingen/categorieen.tsx`
- Delete: `app/categorie-wizard.tsx`

- [ ] **Step 1: Create `app/categorieen.tsx`**

```tsx
/**
 * Shared category grid screen
 * mode=browse  → navigates to /prijzen?category=X
 * mode=select  → navigates to /recommender/X
 */
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassPageHeader } from '@/components/glass-page-header';
import { LiquidScreen } from '@/components/liquid-screen';
import { MOCK_CATEGORIES } from '@/constants/mock-data';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

const CATEGORY_COLORS = [
  '#007AFF','#FF9500','#34C759','#AF52DE','#FF2D55',
  '#5AC8FA','#FF6B00','#30B0C7','#64D2FF','#FF375F',
];

const enterItem = (i: number) =>
  FadeInDown.delay(Math.min(i, 8) * 45).springify().damping(18).stiffness(110);

function CategoryTile({
  category,
  color,
  index,
  onPress,
  isDark,
  colors,
  animationsEnabled,
}: {
  category: { id: string; name: string; icon?: string };
  color: string;
  index: number;
  onPress: () => void;
  isDark: boolean;
  colors: typeof Colors.light;
  animationsEnabled: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      entering={animationsEnabled ? enterItem(index) : undefined}
      style={[styles.tileWrap, animStyle]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1,    { damping: 15, stiffness: 300 }); }}
        onPress={onPress}
        style={styles.tilePressable}
      >
        <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.tile}>
          <View style={[styles.tileIcon, { backgroundColor: color + '22' }]}>
            <MaterialIcons name={(category.icon ?? 'devices') as any} size={26} color={color} />
          </View>
          <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={2}>
            {category.name}
          </Text>
        </ClearLiquidGlass>
      </Pressable>
    </Animated.View>
  );
}

export default function CategorieenScreen() {
  const { mode = 'browse' } = useLocalSearchParams<{ mode?: 'browse' | 'select' }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { animationsEnabled } = useReduceMotion();

  const handlePress = (id: string) => {
    if (mode === 'select') {
      router.push(`/recommender/${id}` as any);
    } else {
      router.push(`/prijzen?category=${id}` as any);
    }
  };

  return (
    <LiquidScreen>
      <GlassPageHeader
        title="Categorieën"
        subtitle={mode === 'select' ? 'Kies een categorie' : 'Blader per categorie'}
      />
      <FlatList
        data={MOCK_CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <CategoryTile
            category={item}
            color={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
            index={index}
            onPress={() => handlePress(item.id)}
            isDark={isDark}
            colors={colors}
            animationsEnabled={animationsEnabled}
          />
        )}
      />
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.md, paddingBottom: 120 },
  row:  { gap: Spacing.sm },
  tileWrap: { flex: 1 },
  tilePressable: { flex: 1 },
  tile: {
    padding: Spacing.md,
    gap: Spacing.sm,
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tileIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.1,
  },
});
```

- [ ] **Step 2: Delete the three dead files**

```bash
git rm "app/(tabs)/categorieen.tsx"
git rm "app/instellingen/categorieen.tsx"
git rm app/categorie-wizard.tsx
```

- [ ] **Step 3: Update any navigation calls that pointed to old paths**

Search for references to the deleted files:
```bash
grep -r "categorie-wizard\|instellingen/categorieen\|(tabs)/categorieen" app/ components/ --include="*.tsx" -l
```

For each file found, replace navigation calls:
- `/categorie-wizard` → `/categorieen?mode=select`
- `/(tabs)/categorieen` → `/categorieen?mode=browse`
- `/instellingen/categorieen` → `/categorieen?mode=browse`

- [ ] **Step 4: Commit**

```bash
git add app/categorieen.tsx
git commit -m "feat: consolidated category screen, delete 3 dead screens"
```

---

## Task 4: `app/(tabs)/index.tsx` — Home screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Add LiquidScreen wrapper**

Find the outermost `<View style={[..., { backgroundColor: colors.background }]}>` at the root of the return statement and replace it with:

```tsx
import { LiquidScreen } from '@/components/liquid-screen';

// Replace root View with:
return (
  <LiquidScreen>
    {/* existing content unchanged */}
  </LiquidScreen>
);
```

- [ ] **Step 2: Add stagger to section headers**

Add this import at the top of the file:
```tsx
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

Wrap each section header `<Text>` in:
```tsx
<Animated.Text
  entering={animationsEnabled ? FadeInDown.delay(sectionIndex * 80).springify().damping(20).stiffness(130) : undefined}
  style={[styles.sectionTitle, { color: colors.text }]}
>
  {title}
</Animated.Text>
```
Where `sectionIndex` is 0 for first section, 1 for second, etc.

- [ ] **Step 3: Add the Link Scanner entry pill**

Add this directly below the search bar (find the search bar JSX and add after it):

```tsx
import { useRouter } from 'expo-router';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';

// Below search bar:
<Pressable onPress={() => router.push('/link-scanner' as any)} style={styles.scannerPill}>
  <ClearLiquidGlass isDark={isDark} borderRadius={999} style={styles.scannerPillGlass}>
    <Text style={styles.scannerPillText}>🔗  Plak productlink</Text>
  </ClearLiquidGlass>
</Pressable>
```

Add styles:
```tsx
scannerPill: {
  marginHorizontal: Spacing.md,
  marginTop: Spacing.sm,
  marginBottom: Spacing.xs,
},
scannerPillGlass: {
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.sm,
  alignItems: 'center',
  justifyContent: 'center',
},
scannerPillText: {
  fontSize: 13,
  fontWeight: '600',
  color: 'rgba(255,255,255,0.75)',
  letterSpacing: 0.1,
},
```

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "feat: Home screen — LiquidScreen, stagger headers, Link Scanner pill"
```

---

## Task 5: Nieuws + Reviews screens

**Files:**
- Modify: `app/(tabs)/nieuws.tsx`
- Modify: `app/(tabs)/reviews.tsx`

- [ ] **Step 1: Update `nieuws.tsx`**

Add imports:
```tsx
import { LiquidScreen } from '@/components/liquid-screen';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

Replace root `<View style={[styles.container, { backgroundColor: colors.background }]}>` with `<LiquidScreen>`.

Add `const { animationsEnabled } = useReduceMotion();` inside the component.

Update `renderArticle` to add stagger:
```tsx
const renderArticle = ({ item, index }: { item: Article; index: number }) => {
  if (!item || !item.id || !item.title) return null;
  return (
    <Animated.View
      entering={animationsEnabled
        ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110)
        : undefined}
      style={styles.articleRow}
    >
      <ArticleCard article={item} variant="default" />
    </Animated.View>
  );
};
```

Remove the `<View style={styles.articleRow}>` wrapper since `Animated.View` now wraps it.

- [ ] **Step 2: Apply identical changes to `reviews.tsx`**

Same changes as Step 1 — same structure, just different feed type and header subtitle.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/nieuws.tsx" "app/(tabs)/reviews.tsx"
git commit -m "feat: Nieuws + Reviews — LiquidScreen, staggered article entrances"
```

---

## Task 6: Prijzen screen

**Files:**
- Modify: `app/(tabs)/prijzen.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { LiquidScreen } from '@/components/liquid-screen';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

- [ ] **Step 2: Wrap root in LiquidScreen**

Replace root `<View style={[styles.container, ...]}>` with `<LiquidScreen>`.

- [ ] **Step 3: Wrap category chips in ClearLiquidGlass with press spring**

Find the category chip `Pressable` component. Wrap each in an `Animated.View` and add spring press:

```tsx
function CategoryChip({ item, isSelected, onPress, isDark, colors, index, animationsEnabled }: {
  item: { id: string; name: string; icon: string };
  isSelected: boolean;
  onPress: () => void;
  isDark: boolean;
  colors: typeof Colors.light;
  index: number;
  animationsEnabled: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const catColor = CATEGORY_COLORS[item.id] ?? { bg: '#007AFF15', color: '#007AFF' };

  return (
    <Animated.View
      entering={animationsEnabled ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110) : undefined}
      style={animStyle}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
        onPress={onPress}
      >
        <ClearLiquidGlass isDark={isDark} borderRadius={999} style={[
          styles.chip,
          isSelected && { borderColor: catColor.color },
        ]}>
          <MaterialIcons name={item.icon as any} size={16} color={isSelected ? catColor.color : colors.textSecondary} />
          <Text style={[styles.chipText, { color: isSelected ? catColor.color : colors.textSecondary }]}>
            {item.name}
          </Text>
        </ClearLiquidGlass>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/prijzen.tsx"
git commit -m "feat: Prijzen — LiquidScreen, glass category chips, stagger"
```

---

## Task 7: Profiel (Instellingen) screen

**Files:**
- Modify: `app/(tabs)/profiel.tsx`

- [ ] **Step 1: Add imports and wrap in LiquidScreen**

```tsx
import { LiquidScreen } from '@/components/liquid-screen';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassShimmer } from '@/components/glass-shimmer';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

Replace root `<ScrollView style={[..., { backgroundColor: colors.background }]}>` outer container with `<LiquidScreen>`.

- [ ] **Step 2: Upgrade `Group` component to ClearLiquidGlass**

Replace the existing `Group` component:
```tsx
function Group({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <ClearLiquidGlass isDark={isDark} borderRadius={16} style={styles.group}>
      {children}
    </ClearLiquidGlass>
  );
}
```

Remove the old `groupDark`/`groupLight`/`groupSpecular` styles — no longer needed.

- [ ] **Step 3: Add GlassShimmer to profile avatar**

Find the avatar `View` (the circle with initials or image). Wrap it:
```tsx
<View style={styles.avatarWrap}>
  {/* existing avatar content */}
  <GlassShimmer isDark={isDark} borderRadius={999} intensity={0.4} />
</View>
```

- [ ] **Step 4: Add spring press to toggle rows**

In `ToggleRow`, wrap the outer `View` in an `Animated.View` with press scale:
```tsx
function ToggleRow({ ..., index = 0 }: { ...; index?: number }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const { animationsEnabled } = useReduceMotion();

  return (
    <Animated.View
      entering={animationsEnabled ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110) : undefined}
      style={[styles.toggleRow, animStyle]}
    >
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 18, stiffness: 320 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 320 }); }}
        style={styles.toggleRowInner}
      >
        {/* existing row content */}
      </Pressable>
    </Animated.View>
  );
}
```

Pass `index` prop from each call site (0, 1, 2, … per group).

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/profiel.tsx"
git commit -m "feat: Profiel — LiquidScreen, ClearLiquidGlass groups, avatar lens, spring rows"
```

---

## Task 8: Meldingen screen

**Files:**
- Modify: `app/(tabs)/meldingen.tsx`

- [ ] **Step 1: Add imports and wrap in LiquidScreen**

```tsx
import { LiquidScreen } from '@/components/liquid-screen';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassShimmer } from '@/components/glass-shimmer';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

Replace root `<View style={[..., { backgroundColor: colors.background }]}>` with `<LiquidScreen>`.

- [ ] **Step 2: Wrap AlertRow in ClearLiquidGlass**

Find `AlertRow`. Wrap the outer `View` in:
```tsx
<Animated.View
  entering={animationsEnabled ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110) : undefined}
>
  <ClearLiquidGlass isDark={isDark} borderRadius={16} style={styles.alertCard}>
    <GlassShimmer isDark={isDark} borderRadius={16} intensity={0.5} />
    {/* existing row content */}
  </ClearLiquidGlass>
</Animated.View>
```

Pass `index` prop to `AlertRow` from the render call.

- [ ] **Step 3: Animated progress bar**

Replace the static progress bar fill with an animated one:
```tsx
function ProgressBar({ progress, isDark }: { progress: number; isDark: boolean }) {
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = withTiming(progress * 100, { duration: 800 });
  }, [progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <Animated.View style={[styles.progressFill, barStyle, { backgroundColor: '#34C759' }]} />
    </View>
  );
}
```

Styles to add:
```tsx
progressTrack: { height: 4, borderRadius: 999, overflow: 'hidden', marginTop: 6 },
progressFill:  { height: 4, borderRadius: 999 },
alertCard:     { marginBottom: 10, padding: 14 },
```

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/meldingen.tsx"
git commit -m "feat: Meldingen — LiquidScreen, glass alert rows, animated progress"
```

---

## Task 9: Bladwijzers screen

**Files:**
- Modify: `app/(tabs)/bladwijzers.tsx`

- [ ] **Step 1: Add imports and wrap in LiquidScreen**

```tsx
import { LiquidScreen } from '@/components/liquid-screen';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

Replace root `<View style={[..., { backgroundColor: colors.background }]}>` with `<LiquidScreen>`.

- [ ] **Step 2: Add stagger entrance to BookmarkCard**

Wrap `BookmarkCard`'s returned JSX in:
```tsx
<Animated.View
  entering={animationsEnabled ? FadeInDown.delay(Math.min(index, 8) * 45).springify().damping(18).stiffness(110) : undefined}
>
  {/* existing card content */}
</Animated.View>
```

Pass `index` from the FlatList `renderItem` prop.

- [ ] **Step 3: Add scale press to BookmarkCard**

Inside `BookmarkCard`:
```tsx
const scale = useSharedValue(1);
const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

// Wrap the Pressable's outer view in animStyle
// Add to Pressable:
onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 300 }); }}
```

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/bladwijzers.tsx"
git commit -m "feat: Bladwijzers — LiquidScreen, stagger, spring press"
```

---

## Task 10: Product Detail screen

**Files:**
- Modify: `app/product/[id].tsx`

- [ ] **Step 1: Add imports and wrap in LiquidScreen**

```tsx
import { LiquidScreen } from '@/components/liquid-screen';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassShimmer } from '@/components/glass-shimmer';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

Replace root `<ScrollView style={[..., { backgroundColor: colors.background }]}>` wrapper with `<LiquidScreen>`.

- [ ] **Step 2: Wrap shop price rows in ClearLiquidGlass**

Find each shop row (where shop name + price are rendered). Wrap each in:
```tsx
<ClearLiquidGlass isDark={isDark} borderRadius={12} style={styles.shopRow}>
  {/* existing shop row content */}
</ClearLiquidGlass>
```

Add style:
```tsx
shopRow: { marginBottom: 8, padding: 12 },
```

- [ ] **Step 3: Wrap price history chart in glass card**

Find `<PriceHistoryChart .../>`. Wrap it:
```tsx
<ClearLiquidGlass isDark={isDark} borderRadius={16} style={styles.chartCard}>
  <PriceHistoryChart ... />
</ClearLiquidGlass>
```

Add style:
```tsx
chartCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, padding: Spacing.sm },
```

- [ ] **Step 4: Upgrade buy CTA to full lens anatomy**

Find the buy/CTA button. Replace its background with:
```tsx
<Pressable
  onPressIn={() => { scale.value = withSpring(0.94, { damping: 12, stiffness: 340 }); }}
  onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 340 }); }}
  onPress={handleBuy}
  style={styles.buyBtnShell}
>
  <Animated.View style={[styles.buyBtn, buyAnimStyle]}>
    <LinearGradient
      colors={['#34C759', '#2AAF4F']}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    />
    {/* Caustic */}
    <LinearGradient
      colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.00)']}
      style={styles.ctaCaustic}
      start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      pointerEvents="none"
    />
    {/* Specular rim */}
    <View style={styles.ctaSpecular} pointerEvents="none" />
    {/* Lens blob */}
    <View style={styles.ctaBlob} pointerEvents="none" />
    {/* Inner shadow */}
    <LinearGradient
      colors={['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.18)']}
      style={styles.ctaInnerShadow}
      start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
      pointerEvents="none"
    />
    <Text style={styles.buyBtnText}>Bekijk beste prijs</Text>
  </Animated.View>
</Pressable>
```

Add styles:
```tsx
buyBtnShell: { marginHorizontal: Spacing.md, marginBottom: Spacing.lg },
buyBtn: { height: 54, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
ctaCaustic: { position: 'absolute', top: 0, left: 0, right: 0, bottom: '44%' },
ctaSpecular: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.90)', borderTopLeftRadius: 999, borderTopRightRadius: 999 },
ctaBlob: { position: 'absolute', top: 6, left: 24, width: 80, height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.38)' },
ctaInnerShadow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%' },
```

- [ ] **Step 5: Commit**

```bash
git add "app/product/[id].tsx"
git commit -m "feat: Product detail — LiquidScreen, glass shop rows, chart card, lens buy CTA"
```

---

## Task 11: Auth screens

**Files:**
- Modify: `app/(auth)/inloggen.tsx`
- Modify: `app/(auth)/registreren.tsx`
- Modify: `app/(auth)/onboarding.tsx`
- Modify: `app/(auth)/profiel-instellen.tsx`
- Modify: `app/(auth)/telefoon.tsx`
- Modify: `app/(auth)/verificatie.tsx`
- Modify: `app/(auth)/verify.tsx`
- Modify: `app/(auth)/wachtwoord-vergeten.tsx`

The same 3-step pattern applies to each auth screen. Apply in order.

**Pattern for `inloggen`, `registreren`, `profiel-instellen`, `telefoon`, `verificatie`, `verify`, `wachtwoord-vergeten`:**

- [ ] **Step 1: Add imports to each**

```tsx
import { LiquidScreen } from '@/components/liquid-screen';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

- [ ] **Step 2: Wrap root in LiquidScreen (all 7 screens)**

For each screen, replace the outermost `<KeyboardAvoidingView>` or `<View>` background style with `<LiquidScreen>` as the outermost container, keeping `KeyboardAvoidingView` inside it:

```tsx
return (
  <LiquidScreen>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* existing content */}
    </KeyboardAvoidingView>
  </LiquidScreen>
);
```

- [ ] **Step 3: Wrap each TextInput in ClearLiquidGlass (all 7 screens)**

Find each `TextInput` and its container `View`. Replace that container with:
```tsx
<ClearLiquidGlass isDark={isDark} borderRadius={12} style={styles.inputWrap}>
  <TextInput
    style={[styles.input, { color: colors.text }]}
    placeholderTextColor={colors.textTertiary}
    {/* ...existing props */}
  />
</ClearLiquidGlass>
```

Add style:
```tsx
inputWrap: { marginBottom: 12, height: 52, justifyContent: 'center', paddingHorizontal: 14 },
input: { fontSize: 16, fontWeight: '400' },
```

- [ ] **Step 4: Upgrade primary CTA button to lens anatomy (all 7 screens)**

Find the primary submit/continue `Pressable`. Replace its background `View` content with the lens anatomy (same pattern as product detail Task 10 Step 4 but using brand green):
```tsx
<Pressable onPress={handleSubmit} style={styles.ctaShell}>
  <View style={styles.cta}>
    <LinearGradient colors={['#34C759','#2AAF4F']} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
    <LinearGradient colors={['rgba(255,255,255,0.32)','rgba(255,255,255,0.00)']} style={styles.ctaCaustic} start={{x:0.5,y:0}} end={{x:0.5,y:1}} pointerEvents="none" />
    <View style={styles.ctaSpecular} pointerEvents="none" />
    <View style={styles.ctaBlob} pointerEvents="none" />
    <LinearGradient colors={['rgba(0,0,0,0.00)','rgba(0,0,0,0.18)']} style={styles.ctaInnerShadow} start={{x:0.5,y:0}} end={{x:0.5,y:1}} pointerEvents="none" />
    <Text style={styles.ctaText}>{buttonLabel}</Text>
  </View>
</Pressable>
```

Styles (add once per file):
```tsx
ctaShell: { marginTop: 8 },
cta: { height: 54, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
ctaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
ctaCaustic: { position: 'absolute', top: 0, left: 0, right: 0, bottom: '44%' },
ctaSpecular: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.90)', borderTopLeftRadius: 999, borderTopRightRadius: 999 },
ctaBlob: { position: 'absolute', top: 6, left: 24, width: 80, height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.38)' },
ctaInnerShadow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%' },
```

- [ ] **Step 5: Special case — `onboarding.tsx`**

For onboarding only: Replace the static `Animated` (old API) background with `LiquidScreen`. The orb in `LiquidScreen` is enough background depth. Remove any hardcoded `backgroundColor` from slide views so the OLED black shows through. Keep the existing slide dots/pagination logic unchanged.

- [ ] **Step 6: Commit all auth screens**

```bash
git add "app/(auth)/"
git commit -m "feat: Auth screens — LiquidScreen, glass inputs, lens CTA buttons"
```

---

## Task 12: Settings screens (`app/instellingen/`)

**Files:**
- Modify: `app/instellingen/meldingen.tsx`
- Modify: `app/instellingen/prijsalerts.tsx`
- Modify: `app/instellingen/zoeken.tsx`
- Modify: `app/instellingen/bladwijzers.tsx`

Same pattern for all 4 screens:

- [ ] **Step 1: Add imports**

```tsx
import { LiquidScreen } from '@/components/liquid-screen';
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
```

- [ ] **Step 2: Wrap root in LiquidScreen**

Replace outer `<View style={[..., { backgroundColor: colors.background }]}>` with `<LiquidScreen>`.

- [ ] **Step 3: Upgrade `Group` component to ClearLiquidGlass**

Each settings screen has a local `Group` component identical to the one in profiel.tsx. Replace it with:
```tsx
function Group({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <ClearLiquidGlass isDark={isDark} borderRadius={16} style={styles.group}>
      {children}
    </ClearLiquidGlass>
  );
}
```

Remove `groupDark`, `groupLight`, `groupSpecular`, `groupSpecularDark`, `groupSpecularLight` styles.

- [ ] **Step 4: Add FadeInDown stagger to section labels**

Wrap each `SectionLabel` render in:
```tsx
<Animated.View entering={animationsEnabled ? FadeInDown.delay(sectionIndex * 80).springify().damping(20).stiffness(130) : undefined}>
  <SectionLabel label="..." colors={colors} />
</Animated.View>
```

- [ ] **Step 5: Commit**

```bash
git add app/instellingen/
git commit -m "feat: Settings screens — LiquidScreen, ClearLiquidGlass groups, stagger"
```

---

## Task 13: Legal / static screens

**Files:**
- Modify: `app/cookies.tsx`
- Modify: `app/privacy.tsx`
- Modify: `app/terms.tsx`
- Modify: `app/affiliate.tsx`

- [ ] **Step 1: Apply LiquidScreen to all 4**

For each file, add:
```tsx
import { LiquidScreen } from '@/components/liquid-screen';
```

Replace root `<View style={[..., { backgroundColor: colors.background }]}>` with `<LiquidScreen>`. Keep all inner content unchanged.

- [ ] **Step 2: Commit**

```bash
git add app/cookies.tsx app/privacy.tsx app/terms.tsx app/affiliate.tsx
git commit -m "feat: Legal screens — LiquidScreen background"
```

---

## Task 14: Link Scanner screen

**Files:**
- Create: `app/link-scanner.tsx`

- [ ] **Step 1: Create the screen**

```tsx
/**
 * Link Scanner — mock UI
 * Paste any product URL → promo codes, price history, price alert, affiliate buy CTA
 * NO real functionality — UI only
 */
import { ClearLiquidGlass } from '@/components/clear-liquid-glass';
import { GlassPageHeader } from '@/components/glass-page-header';
import { GlassShimmer } from '@/components/glass-shimmer';
import { LiquidScreen } from '@/components/liquid-screen';
import { PriceHistoryChart } from '@/components/charts';
import { LiquidSwitch } from '@/components/liquid-switch';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StyleSheet as RN,
} from 'react-native';

// Mock price history data
const MOCK_PRICE_HISTORY = Array.from({ length: 12 }, (_, i) => ({
  date: new Date(2025, i, 1).toISOString(),
  price: 1099 - Math.round(Math.sin(i * 0.8) * 80 + i * 15),
}));

const ENTER = (i: number) =>
  FadeInDown.delay(Math.min(i, 8) * 60).springify().damping(18).stiffness(110);

export default function LinkScannerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const { animationsEnabled } = useReduceMotion();

  const [url, setUrl] = useState('');
  const [resolved, setResolved] = useState(false);
  const [alertEnabled, setAlertEnabled] = useState(false);

  const cardHeight = useSharedValue(0);
  const cardOpacity = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: (1 - cardOpacity.value) * 12 }],
  }));

  const handleChangeUrl = (text: string) => {
    setUrl(text);
    if (text.length > 10 && !resolved) {
      // Simulate resolution after typing a URL
      cardOpacity.value = withTiming(1, { duration: 500 });
      setResolved(true);
    }
    if (text.length === 0) {
      cardOpacity.value = withTiming(0, { duration: 200 });
      setResolved(false);
    }
  };

  const buyScale = useSharedValue(1);
  const buyStyle = useAnimatedStyle(() => ({ transform: [{ scale: buyScale.value }] }));

  return (
    <LiquidScreen>
      <GlassPageHeader title="Link Scanner" subtitle="Plak een productlink" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── URL Input ─────────────────────────────────────────────── */}
        <Animated.View entering={animationsEnabled ? ENTER(0) : undefined} style={styles.section}>
          <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.inputCard}>
            <MaterialIcons name="link" size={20} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="https://..."
              placeholderTextColor={colors.textTertiary}
              value={url}
              onChangeText={handleChangeUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {url.length > 0 && (
              <Pressable onPress={() => handleChangeUrl('')} hitSlop={8}>
                <MaterialIcons name="close" size={18} color={colors.textTertiary} />
              </Pressable>
            )}
          </ClearLiquidGlass>
        </Animated.View>

        {/* ── Resolved product card ────────────────────────────────── */}
        <Animated.View style={[styles.section, cardStyle]}>
          <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.productCard}>
            <GlassShimmer isDark={isDark} borderRadius={Radius.xl} />
            <View style={styles.productCardInner}>
              <View style={styles.productImagePlaceholder}>
                <MaterialIcons name="laptop" size={40} color={colors.textTertiary} />
              </View>
              <View style={styles.productInfo}>
                <View style={styles.shopBadge}>
                  <MaterialIcons name="store" size={12} color={colors.textSecondary} />
                  <Text style={[styles.shopBadgeText, { color: colors.textSecondary }]}>Detecteerd: Coolblue</Text>
                </View>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
                  Apple MacBook Pro 14" M3 Pro
                </Text>
                <Text style={[styles.productPrice, { color: colors.text }]}>€1.899</Text>
              </View>
            </View>
          </ClearLiquidGlass>
        </Animated.View>

        {/* ── Promo codes ──────────────────────────────────────────── */}
        <Animated.View entering={resolved && animationsEnabled ? ENTER(1) : undefined} style={styles.section}>
          <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.promoCard}>
            <View style={styles.promoHeader}>
              <View style={styles.promoBadge}>
                <Text style={styles.promoBadgeText}>1 code gevonden</Text>
              </View>
            </View>
            <View style={styles.promoRow}>
              <View style={styles.promoCodeWrap}>
                <Text style={[styles.promoCodeText, { color: colors.text }]}>TWEAKLY••••</Text>
              </View>
              <ClearLiquidGlass isDark={isDark} borderRadius={999} style={styles.copyBtn}>
                <Text style={[styles.copyBtnText, { color: colors.text }]}>Kopieer</Text>
              </ClearLiquidGlass>
            </View>
          </ClearLiquidGlass>
        </Animated.View>

        {/* ── Price history ─────────────────────────────────────────── */}
        <Animated.View entering={resolved && animationsEnabled ? ENTER(2) : undefined} style={styles.section}>
          <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.chartCard}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Prijsgeschiedenis</Text>
            <PriceHistoryChart
              data={MOCK_PRICE_HISTORY}
              currentPrice={899}
              isDark={isDark}
            />
          </ClearLiquidGlass>
        </Animated.View>

        {/* ── Price alert ───────────────────────────────────────────── */}
        <Animated.View entering={resolved && animationsEnabled ? ENTER(3) : undefined} style={styles.section}>
          <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.alertRow}>
            <View style={[styles.alertIcon, { backgroundColor: '#FF9500' + '22' }]}>
              <MaterialIcons name="notifications" size={20} color="#FF9500" />
            </View>
            <View style={styles.alertInfo}>
              <Text style={[styles.alertLabel, { color: colors.text }]}>Stel prijsalert in</Text>
              <TextInput
                style={[styles.alertInput, { color: colors.textSecondary, borderColor: colors.border }]}
                placeholder="Doelprijs bijv. €799"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
            <LiquidSwitch value={alertEnabled} onChange={setAlertEnabled} isDark={isDark} />
          </ClearLiquidGlass>
        </Animated.View>

        {/* ── Buy CTA ──────────────────────────────────────────────── */}
        <Animated.View entering={resolved && animationsEnabled ? ENTER(4) : undefined} style={[styles.section, styles.ctaSection]}>
          <Pressable
            onPressIn={() => { buyScale.value = withSpring(0.94, { damping: 12, stiffness: 340 }); }}
            onPressOut={() => { buyScale.value = withSpring(1, { damping: 12, stiffness: 340 }); }}
          >
            <Animated.View style={[styles.cta, buyStyle]}>
              <LinearGradient
                colors={['#34C759', '#2AAF4F']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <LinearGradient
                colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0.00)']}
                style={styles.ctaCaustic}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                pointerEvents="none"
              />
              <View style={styles.ctaSpecular} pointerEvents="none" />
              <View style={styles.ctaBlob} pointerEvents="none" />
              <LinearGradient
                colors={['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.18)']}
                style={styles.ctaInnerShadow}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                pointerEvents="none"
              />
              <Text style={styles.ctaText}>Koop via Tweakly</Text>
              <ClearLiquidGlass isDark={false} borderRadius={999} style={styles.affiliateBadge}>
                <Text style={styles.affiliateBadgeText}>affiliate</Text>
              </ClearLiquidGlass>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LiquidScreen>
  );
}

const styles = StyleSheet.create({
  content:          { padding: Spacing.md, paddingBottom: 120, gap: Spacing.sm },
  section:          {},
  inputCard:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 52, gap: 10 },
  inputIcon:        {},
  input:            { flex: 1, fontSize: 15 },
  productCard:      { overflow: 'hidden' },
  productCardInner: { flexDirection: 'row', gap: 14, padding: 14 },
  productImagePlaceholder: {
    width: 80, height: 80, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  productInfo:      { flex: 1, justifyContent: 'center', gap: 4 },
  shopBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  shopBadgeText:    { fontSize: 11, fontWeight: '500' },
  productName:      { fontSize: 14, fontWeight: '700', letterSpacing: -0.15 },
  productPrice:     { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  promoCard:        { padding: 14, gap: 10 },
  promoHeader:      { flexDirection: 'row' },
  promoBadge:       { backgroundColor: '#34C75922', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  promoBadgeText:   { color: '#34C759', fontSize: 11, fontWeight: '700' },
  promoRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promoCodeWrap:    { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  promoCodeText:    { fontSize: 15, fontWeight: '700', letterSpacing: 1.2, fontVariant: ['tabular-nums'] },
  copyBtn:          { paddingHorizontal: 16, paddingVertical: 8 },
  copyBtnText:      { fontSize: 13, fontWeight: '600' },
  chartCard:        { padding: 14, gap: 8 },
  cardTitle:        { fontSize: 13, fontWeight: '700', letterSpacing: -0.1, marginBottom: 4 },
  alertRow:         { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  alertIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alertInfo:        { flex: 1, gap: 4 },
  alertLabel:       { fontSize: 14, fontWeight: '600' },
  alertInput:       { fontSize: 13, borderWidth: 0.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  ctaSection:       { marginTop: 4 },
  cta:              { height: 56, borderRadius: 999, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  ctaText:          { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  ctaCaustic:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: '44%' },
  ctaSpecular:      { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.90)', borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  ctaBlob:          { position: 'absolute', top: 6, left: 24, width: 80, height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.38)' },
  ctaInnerShadow:   { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%' },
  affiliateBadge:   { paddingHorizontal: 10, paddingVertical: 4 },
  affiliateBadgeText: { color: 'rgba(255,255,255,0.80)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/link-scanner.tsx
git commit -m "feat: Link Scanner screen — mock promo codes, price history, alert, lens buy CTA"
```

---

## Task 15: Final verification pass

- [ ] **Step 1: Check for any remaining `backgroundColor: colors.background` root views**

```bash
grep -r "backgroundColor: colors\.background" app/ --include="*.tsx" -l
```

For each file found, verify it has been wrapped in `LiquidScreen`. If not, apply the wrap.

- [ ] **Step 2: Check for broken navigation to deleted category screens**

```bash
grep -r "categorie-wizard\|instellingen/categorieen\|(tabs)/categorieen" app/ components/ --include="*.tsx"
```

Fix any remaining references per Task 3 Step 3.

- [ ] **Step 3: Check PriceHistoryChart props**

```bash
grep -n "PriceHistoryChart" components/charts/price-history-chart.tsx | head -5
```

Verify the `data`, `currentPrice`, and `isDark` prop names match what's used in `link-scanner.tsx`. If the component uses different prop names, update `link-scanner.tsx` to match.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: liquid glass overhaul complete — all screens, Link Scanner, consolidated categories"
```
