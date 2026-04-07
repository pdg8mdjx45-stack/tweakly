# Full App Redesign — iOS 26 Liquid Glass Design System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the iOS 26 / iOS 18 glassmorphism design language across the Tweakly app — lighter accent green, frosted tab bar, cinematic charts, scroll-aware nav headers, and pill buttons on auth screens.

**Architecture:** Surgical changes to visual surface only — theme tokens, FloatingTabBar styling, chart dimensions/colors, product screen button colors, a new ScrollAwareHeader component wired to artikel and product detail screens. No data flow, routing, or logic changes.

**Tech Stack:** React Native / Expo SDK 54, Expo Router, react-native-reanimated (shared values, interpolate), expo-blur (BlurView), react-native-chart-kit (LineChart), react-native-safe-area-context.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `constants/theme.ts` | Modify | Update `Colors.light.tint` + `Colors.light.tabIconSelected` to `#34C759` |
| `components/floating-tab-bar.tsx` | Modify | Add frosted pill container shell; change pill color to `#34C759` |
| `components/charts/price-history-chart.tsx` | Modify | Full-width chart, green gradient fill, taller height |
| `components/scroll-aware-header.tsx` | Create | Blur + title fade-in on scroll |
| `app/artikel/[id].tsx` | Modify | Wire ScrollAwareHeader; update CTA + category pill to `#34C759` |
| `app/product/[id].tsx` | Modify | Wire ScrollAwareHeader; update shop button + google link colors |
| `app/(auth)/inloggen.tsx` | Modify | Update primaryBtn backgroundColor to `#34C759` + add shadow |
| `app/(auth)/registreren.tsx` | Modify | Update primaryBtn backgroundColor to `#34C759` + add shadow |

---

## Task 1: Update Theme Tokens

**Files:**
- Modify: `constants/theme.ts`

- [ ] **Step 1: Update Colors.light.tint and tabIconSelected**

In `constants/theme.ts`, change `Colors.light` from:
```ts
tint: Palette.primary,
tabIconSelected: Palette.primary,
```
to:
```ts
tint: Palette.primaryVivid,
tabIconSelected: Palette.primaryVivid,
```

The full `Colors.light` block after the change:
```ts
light: {
  text: '#0A0A0A',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FAFAFA',
  surfaceGrouped: '#F2F2F7',
  tint: Palette.primaryVivid,       // was Palette.primary
  icon: '#6C6C72',
  tabIconDefault: '#AEAEB2',
  tabIconSelected: Palette.primaryVivid, // was Palette.primary
  border: 'rgba(0,0,0,0.06)',
  borderProminent: 'rgba(0,0,0,0.12)',
  priceDown: Palette.primaryVivid,
  priceUp: Palette.warning,
  fill: 'rgba(0,0,0,0.04)',
},
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd c:/Users/alexa/tweakly && npx tsc --noEmit 2>&1 | head -40
```
Expected: no errors (or pre-existing errors only, none from theme.ts).

- [ ] **Step 3: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: theme — accent color light green #34C759"
```

---

## Task 2: Frosted Tab Bar Container

**Files:**
- Modify: `components/floating-tab-bar.tsx`

- [ ] **Step 1: Update color constants and add BlurView import**

At the top of `components/floating-tab-bar.tsx`, change:
```ts
import { IconSymbol } from './ui/icon-symbol';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Palette } from '../constants/theme';
```
to:
```ts
import { BlurView } from 'expo-blur';
import { IconSymbol } from './ui/icon-symbol';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Palette } from '../constants/theme';
```

- [ ] **Step 2: Update pill and icon color constants**

Change the color constant block from:
```ts
const PILL_COLOR  = Palette.primary;      // #1A3A20 dark green pill (light + dark)
const COL_ACTIVE  = '#FFFFFF';            // white icon on dark green pill
const COL_IDLE_L  = 'rgba(0,0,0,0.35)';  // darker inactive for white background
const COL_IDLE_D  = 'rgba(255,255,255,0.45)';
```
to:
```ts
const PILL_COLOR  = Palette.primaryVivid; // #34C759 iOS green pill
const COL_ACTIVE  = '#FFFFFF';            // white icon on green pill
const COL_IDLE_L  = 'rgba(0,0,0,0.40)';  // readable on frosted light bg
const COL_IDLE_D  = 'rgba(255,255,255,0.45)';
```

- [ ] **Step 3: Add frosted shell around icon row in both render paths**

The component has two render paths (native glass branch and fallback). In **both**, wrap the existing `<View style={styles.iconRow} ...>` content inside a frosted shell.

Replace this pattern (appears twice — once in native glass branch, once in fallback):
```tsx
<View
  style={[styles.wrapper, { bottom: BOTTOM_PAD, left: SIDE_PAD, right: SIDE_PAD }]}
  pointerEvents="box-none"
>
  <Animated.View style={[styles.pillShell, pillStyle]} pointerEvents="none">
    <View style={[StyleSheet.absoluteFill, { backgroundColor: PILL_COLOR, borderRadius: 999 }]} />
  </Animated.View>

  <View style={styles.iconRow} {...pan.panHandlers}>
```

with:
```tsx
<View
  style={[styles.wrapper, { bottom: BOTTOM_PAD, left: SIDE_PAD, right: SIDE_PAD }]}
  pointerEvents="box-none"
>
  {/* Frosted pill shell — background of the entire bar */}
  <View style={[styles.barShell, isDark && styles.barShellDark]} pointerEvents="none">
    {Platform.OS === 'ios' && !isDark && (
      <BlurView
        intensity={20}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
    )}
  </View>

  <Animated.View style={[styles.pillShell, pillStyle]} pointerEvents="none">
    <View style={[StyleSheet.absoluteFill, { backgroundColor: PILL_COLOR, borderRadius: 999 }]} />
  </Animated.View>

  <View style={styles.iconRow} {...pan.panHandlers}>
```

- [ ] **Step 4: Add barShell styles**

In the `StyleSheet.create({...})` block, add after the existing `wrapper` style:
```ts
barShell: {
  position: 'absolute',
  top: EXTRA_TOP,
  left: 0,
  right: 0,
  height: BAR_H,
  borderRadius: 34,
  backgroundColor: 'rgba(242,242,247,0.88)',
  overflow: 'hidden',
  // Shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.09,
  shadowRadius: 24,
  elevation: 12,
},
barShellDark: {
  backgroundColor: 'rgba(28,28,30,0.88)',
},
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd c:/Users/alexa/tweakly && npx tsc --noEmit 2>&1 | head -40
```
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add components/floating-tab-bar.tsx
git commit -m "feat: tab bar — frosted light pill container, #34C759 active pill"
```

---

## Task 3: Cinematic Price History Chart

**Files:**
- Modify: `components/charts/price-history-chart.tsx`

- [ ] **Step 1: Update chartWidth and height**

Find:
```ts
const screenWidth = Dimensions.get('window').width;
// Full container width for centered chart
const chartWidth = (screenWidth - Spacing.md * 2) * 0.85;
```
Replace with:
```ts
const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - Spacing.md * 2; // full width minus 32pt margins
```

- [ ] **Step 2: Update chartConfig colors and fill**

Find the `chartConfig` object and update:

```ts
const chartConfig = {
  backgroundColor: 'transparent',
  backgroundGradientFrom: 'transparent',
  backgroundGradientTo: 'transparent',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(52,199,89,${opacity})`,
  labelColor: (opacity = 1) => `rgba(142,142,147,${opacity})`,
  style: {
    borderRadius: Radius.md,
  },
  propsForDots: {
    r: '0',
    strokeWidth: '0',
  },
  propsForBackgroundLines: {
    strokeDasharray: '5,5',
    stroke: isDark ? '#38383A' : '#E5E5EA',
    strokeWidth: 1,
  },
  fillShadowGradient: Palette.primaryVivid,
  fillShadowGradientOpacity: 0.18,
  paddingLeft: 40,
  paddingBottom: 20,
};
```

Note: remove the old conditional `isDark` color/labelColor logic — the new color functions are fixed.

- [ ] **Step 3: Update chart height to 220 and fix chartContainer style**

Find the `<LineChart>` call and change `height={180}` to `height={220}`.

Find in styles:
```ts
chartContainer: {
  marginVertical: Spacing.sm,
  alignSelf: 'flex-end',
},
```
Replace with:
```ts
chartContainer: {
  marginVertical: Spacing.sm,
  alignSelf: 'stretch',
  overflow: 'hidden',
  borderRadius: Radius.md,
},
```

- [ ] **Step 4: Update dataset line color**

Find:
```ts
datasets: [
  {
    data: sampledData.prices,
    color: (opacity = 1) => Palette.primary,
    strokeWidth: 2,
  },
],
```
Replace with:
```ts
datasets: [
  {
    data: sampledData.prices,
    color: (opacity = 1) => Palette.primaryVivid,
    strokeWidth: 2.5,
  },
],
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd c:/Users/alexa/tweakly && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 6: Commit**

```bash
git add components/charts/price-history-chart.tsx
git commit -m "feat: chart — full-width, green gradient fill, taller 220pt"
```

---

## Task 4: ScrollAwareHeader Component

**Files:**
- Create: `components/scroll-aware-header.tsx`

- [ ] **Step 1: Create the component**

```tsx
/**
 * ScrollAwareHeader — blur + title that fades in as the user scrolls down.
 * Position it absolutely at the top of the screen. BackButton renders on top (zIndex 100).
 */
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, Text } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  SharedValue,
} from 'react-native-reanimated';

interface ScrollAwareHeaderProps {
  title: string;
  scrollY: SharedValue<number>;
  insetTop: number;
  isDark?: boolean;
}

export function ScrollAwareHeader({ title, scrollY, insetTop, isDark = false }: ScrollAwareHeaderProps) {
  const FADE_START = 1;
  const FADE_END = 40;

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [FADE_START, FADE_END], [0, 1], 'clamp'),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [FADE_START, FADE_END], [0, 1], 'clamp'),
    transform: [
      {
        translateY: interpolate(scrollY.value, [FADE_START, FADE_END], [4, 0], 'clamp'),
      },
    ],
  }));

  const height = insetTop + 52;

  return (
    <Animated.View
      style={[styles.container, { height }, containerStyle]}
      pointerEvents="none"
    >
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={24}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(10,10,10,0.75)'
              : 'rgba(255,255,255,0.75)',
          },
        ]}
      />
      <Animated.Text
        style={[
          styles.title,
          { color: isDark ? '#FFFFFF' : '#0A0A0A', marginTop: insetTop },
          titleStyle,
        ]}
        numberOfLines={1}
      >
        {title}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd c:/Users/alexa/tweakly && npx tsc --noEmit 2>&1 | head -40
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/scroll-aware-header.tsx
git commit -m "feat: ScrollAwareHeader — blur + title fade on scroll"
```

---

## Task 5: Wire ScrollAwareHeader into artikel/[id].tsx

**Files:**
- Modify: `app/artikel/[id].tsx`

- [ ] **Step 1: Add imports**

At the top of `app/artikel/[id].tsx`, add these imports alongside the existing ones:
```tsx
import { useSharedValue } from 'react-native-reanimated';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ScrollAwareHeader } from '@/components/scroll-aware-header';
```

- [ ] **Step 2: Add scrollY shared value inside ArtikelScreen**

After the existing hook calls (after `const { bookmarked, toggleBookmark } = ...`), add:
```tsx
const scrollY = useSharedValue(0);
const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
  scrollY.value = e.nativeEvent.contentOffset.y;
};
```

- [ ] **Step 3: Add ScrollAwareHeader and wire ScrollView**

In the `return` block, directly after `<BackButton />` and `<StatusBar barStyle="dark-content" />`, add:
```tsx
<ScrollAwareHeader
  title={article.title}
  scrollY={scrollY}
  insetTop={insets.top}
/>
```

On the `<ScrollView>` element, add:
```tsx
onScroll={handleScroll}
scrollEventThrottle={16}
```

- [ ] **Step 4: Update category pill and CTA button to use #34C759**

Find:
```tsx
<View style={[styles.categoryPill, { backgroundColor: Palette.primary }]}>
```
Change to:
```tsx
<View style={[styles.categoryPill, { backgroundColor: Palette.primaryVivid }]}>
```

Find:
```tsx
style={({ pressed }) => [
  styles.readBtn,
  { backgroundColor: Palette.primary },
  pressed && { opacity: 0.85 },
]}
```
Change to:
```tsx
style={({ pressed }) => [
  styles.readBtn,
  { backgroundColor: Palette.primaryVivid },
  pressed && { opacity: 0.85 },
]}
```

Find (not-found screen back button):
```tsx
style={[styles.backBtn, { backgroundColor: Palette.primary }]}
```
Change to:
```tsx
style={[styles.backBtn, { backgroundColor: Palette.primaryVivid }]}
```

Also update the bookmark icon color:
```tsx
color={bookmarked ? Palette.primary : '#1C1C1E'}
```
to:
```tsx
color={bookmarked ? Palette.primaryVivid : '#1C1C1E'}
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd c:/Users/alexa/tweakly && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 6: Commit**

```bash
git add app/artikel/\[id\].tsx
git commit -m "feat: artikel screen — scroll-aware header, #34C759 accent"
```

---

## Task 6: Wire ScrollAwareHeader into product/[id].tsx

**Files:**
- Modify: `app/product/[id].tsx`

- [ ] **Step 1: Add imports**

At the top of `app/product/[id].tsx`, add alongside existing imports:
```tsx
import { useSharedValue } from 'react-native-reanimated';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ScrollAwareHeader } from '@/components/scroll-aware-header';
```

- [ ] **Step 2: Add scrollY shared value inside ProductScreen**

After the existing state declarations, add:
```tsx
const scrollY = useSharedValue(0);
const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
  scrollY.value = e.nativeEvent.contentOffset.y;
};
```

- [ ] **Step 3: Add ScrollAwareHeader and wire ScrollView**

In the main return block, directly after `<BackButton />` and `<StatusBar hidden />`, add:
```tsx
<ScrollAwareHeader
  title={product?.name ?? ''}
  scrollY={scrollY}
  insetTop={insets.top}
  isDark={isDark}
/>
```

On the existing `<ScrollView showsVerticalScrollIndicator={false}>`, add:
```tsx
onScroll={handleScroll}
scrollEventThrottle={16}
```

- [ ] **Step 4: Update shop "Bekijk" button and Google Shopping button colors**

Find the shop CTA button:
```tsx
style={({ pressed }) => [
  styles.shopButton,
  { backgroundColor: Palette.primary },
  pressed && { opacity: 0.85 },
]}
```
Change to:
```tsx
style={({ pressed }) => [
  styles.shopButton,
  { backgroundColor: Palette.primaryVivid },
  pressed && { opacity: 0.85 },
]}
```

Find `googleShoppingText`:
```tsx
<Text style={[styles.googleShoppingText, { color: colors.tint }]}>
```
Change to:
```tsx
<Text style={[styles.googleShoppingText, { color: Palette.primaryVivid }]}>
```

Find `googleShoppingButton` style in the `StyleSheet.create` block and add a background:

In the StyleSheet, find:
```ts
googleShoppingButton: {
```
Add `backgroundColor: 'rgba(52,199,89,0.06)',` inside that style object.

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd c:/Users/alexa/tweakly && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 6: Commit**

```bash
git add app/product/\[id\].tsx
git commit -m "feat: product screen — scroll-aware header, #34C759 buttons"
```

---

## Task 7: Auth Button Colors (inloggen + registreren)

**Files:**
- Modify: `app/(auth)/inloggen.tsx`
- Modify: `app/(auth)/registreren.tsx`

- [ ] **Step 1: Update inloggen.tsx primaryBtn color and add shadow**

In `app/(auth)/inloggen.tsx`, find in the StyleSheet:
```ts
primaryBtn: {
  borderRadius: 999,
  paddingVertical: 16,
  alignItems: 'center',
  marginTop: Spacing.xs,
  backgroundColor: Palette.primary,
},
```
Replace with:
```ts
primaryBtn: {
  borderRadius: 999,
  paddingVertical: 16,
  alignItems: 'center',
  marginTop: Spacing.xs,
  backgroundColor: Palette.primaryVivid,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 12,
  elevation: 4,
},
```

Also update the `linkText` color (password-forgotten link):
```ts
linkText: { fontSize: 14, fontWeight: '500', color: Palette.primary },
```
to:
```ts
linkText: { fontSize: 14, fontWeight: '500', color: Palette.primaryVivid },
```

- [ ] **Step 2: Update registreren.tsx primaryBtn color and add shadow**

In `app/(auth)/registreren.tsx`, find in the StyleSheet:
```ts
primaryBtn: {
  borderRadius: 999,
  paddingVertical: 16,
  alignItems: 'center',
  marginTop: Spacing.xs,
  backgroundColor: Palette.primary,
},
```
Replace with:
```ts
primaryBtn: {
  borderRadius: 999,
  paddingVertical: 16,
  alignItems: 'center',
  marginTop: Spacing.xs,
  backgroundColor: Palette.primaryVivid,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 12,
  elevation: 4,
},
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd c:/Users/alexa/tweakly && npx tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/inloggen.tsx" "app/(auth)/registreren.tsx"
git commit -m "feat: auth buttons — #34C759 with floating shadow"
```

---

## Self-Review

**Spec coverage check:**

| Spec Section | Task |
|---|---|
| 1. Accent color `#34C759` — `Colors.light.tint` + `tabIconSelected` | Task 1 |
| 1. CTA buttons to `primaryVivid` | Tasks 5, 6, 7 |
| 1. Category pill to `primaryVivid` | Task 5 |
| 2. Tab bar frosted pill shell + BlurView | Task 2 |
| 2. Pill color → `#34C759` | Task 2 |
| 3. Chart full-width | Task 3 |
| 3. Chart gradient fill + green color | Task 3 |
| 3. Chart height 220 | Task 3 |
| 4. Google Shopping button tinted bg + `primaryVivid` text | Task 6 |
| 4. Shop "Bekijk" → `primaryVivid` | Task 6 |
| 5. ScrollAwareHeader component | Task 4 |
| 5. artikel/[id] scroll-aware header | Task 5 |
| 5. product/[id] scroll-aware header | Task 6 |
| 6. Profile picture — no effects (already correct) | No task needed |
| 7. Auth pill buttons + shadow | Task 7 |
| 8. BackButton — already correct | No task needed |

All spec sections covered. No placeholders. Types consistent (`SharedValue<number>`, `ScrollAwareHeaderProps`). `Palette.primaryVivid` used throughout — defined in `constants/theme.ts` as `'#34C759'`.
