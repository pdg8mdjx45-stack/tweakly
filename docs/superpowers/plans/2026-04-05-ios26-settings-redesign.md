# iOS 26 Settings Aesthetic Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle every screen in Tweakly to match the iOS 26 Settings app aesthetic — airy white frosted glass in light mode, warm dark gray glass in dark mode, grouped card sections, liquid glass on iOS 26, Skia blur fallback on Android.

**Architecture:** Token-first: update `constants/theme.ts` once and all components/screens inherit the new palette. Then update four glass primitives. Then sweep all screens to adopt grouped-sections pattern. No new dependencies.

**Tech Stack:** React Native / Expo SDK 54, `@callstack/liquid-glass` (iOS 26), `@shopify/react-native-skia` BackdropBlur (Android), `expo-blur` (web/older iOS), `react-native-reanimated`, existing theme/glass system.

---

## File Map

| File | Change |
|---|---|
| `constants/theme.ts` | Palette dark1–5, Colors.dark, Glass tokens |
| `components/glass-blur.tsx` | Default tint + intensity both modes |
| `components/clear-liquid-glass.tsx` | Tint both modes |
| `components/glass-page-header.tsx` | GlassBlur tint both modes |
| `components/floating-tab-bar.tsx` | GLASS.dark token object |
| `components/liquid-switch.tsx` | Dark OFF track color |
| `components/article-card.tsx` | Remove inline glass, use colors.surface + colors.border |
| `components/product-card.tsx` | Same |
| `app/(tabs)/index.tsx` | Local ProductCard inline glass → surface card |
| `app/(tabs)/nieuws.tsx` | List padding |
| `app/(tabs)/reviews.tsx` | List padding |
| `app/(tabs)/prijzen.tsx` | Chip accent, grid padding |
| `app/(tabs)/profiel.tsx` | Group → plain surface, SectionLabel color |
| `app/(tabs)/bladwijzers.tsx` | Surface/border cleanup |
| `app/(tabs)/zoeken.tsx` | Surface/border cleanup |
| `app/product/[id].tsx` | Section cards → grouped surface |
| `app/artikel/[id].tsx` | Content card surface |
| `app/vergelijk.tsx` | Surface/border |
| `app/link-scanner.tsx` | Surface/border |
| `app/categorieen.tsx` | Surface/border |
| `app/recommender/index.tsx` | Surface/border |
| `app/pc-builder.tsx` | Surface/border |
| `app/instellingen/bladwijzers.tsx` | Grouped sections pattern |
| `app/instellingen/prijsalerts.tsx` | Grouped sections pattern |
| `app/instellingen/zoeken.tsx` | Grouped sections pattern |
| `app/instellingen/meldingen.tsx` | Grouped sections pattern |
| `app/(auth)/inloggen.tsx` | GlassCard/GlassInput → surface |
| `app/(auth)/registreren.tsx` | Same |
| `app/(auth)/profiel-instellen.tsx` | Same |
| `app/(auth)/wachtwoord-vergeten.tsx` | Same |
| `app/(auth)/telefoon.tsx` | Same |
| `app/(auth)/onboarding.tsx` | Same |
| `app/cookies.tsx` | Surface/border |
| `app/privacy.tsx` | Surface/border |
| `app/terms.tsx` | Surface/border |
| `app/affiliate.tsx` | Surface/border |

---

## Task 1: Update design tokens (`constants/theme.ts`)

**Files:**
- Modify: `constants/theme.ts`

- [ ] **Step 1: Update Palette dark values**

In `constants/theme.ts`, replace the five dark Palette entries:

```ts
// Old:
dark1: '#08080D',
dark2: '#121218',
dark3: '#1C1C24',
dark4: '#28283A',
dark5: '#3C3C4A',

// New:
dark1: '#1C1C1E',
dark2: '#2C2C2E',
dark3: '#3A3A3C',
dark4: '#48484A',
dark5: '#636366',
```

- [ ] **Step 2: Update Colors.dark map**

Replace the entire `dark:` block inside `Colors`:

```ts
dark: {
  text: '#F5F5F7',
  textSecondary: '#A0A0AC',
  textTertiary: '#6E6E78',
  background: '#1C1C1E',
  surface: '#2C2C2E',
  surfaceElevated: '#3A3A3C',
  tint: Palette.blue,
  icon: '#8E8E9A',
  tabIconDefault: '#6E6E78',
  tabIconSelected: Palette.blue,
  border: 'rgba(255,255,255,0.10)',
  borderProminent: 'rgba(255,255,255,0.18)',
  priceDown: Palette.accent,
  priceUp: Palette.warning,
  fill: 'rgba(120,120,128,0.20)',
},
```

- [ ] **Step 3: Update Glass tokens**

Apply these changes to the `Glass` export in `constants/theme.ts`:

```ts
// After glass.card, add:
cardDark: {
  backgroundColor: 'rgba(44,44,46,0.85)',
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.10)',
},

// Update liquid:
liquid: {
  light: {
    backgroundColor: 'rgba(255,255,255,0.72)',  // was 0.58
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.92)',
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 5,
  },
  dark: {
    backgroundColor: 'rgba(44,44,46,0.82)',     // was rgba(36,36,46,0.75)
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,                         // was 0.50
    shadowRadius: 28,                            // was 32
    elevation: 12,
  },
},

// Update chrome.dark:
chrome: {
  light: {
    backgroundColor: 'rgba(242,242,247,0.84)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.96)',
  },
  dark: {
    backgroundColor: 'rgba(28,28,30,0.90)',      // was rgba(26,26,34,0.82)
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
},

// Update header:
header: {
  light: {
    backgroundColor: 'rgba(242,242,247,0.92)',   // was 0.88
    borderBottomWidth: 0.33,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  dark: {
    backgroundColor: 'rgba(28,28,30,0.92)',      // was rgba(8,8,14,0.85)
    borderBottomWidth: 0.33,
    borderBottomColor: 'rgba(255,255,255,0.08)', // was 0.06
  },
},

// Update tabBar.dark only (light unchanged):
tabBar: {
  light: {
    backgroundColor: 'rgba(242,242,247,0.90)',
    borderTopWidth: 0.33,
    borderTopColor: 'rgba(0,0,0,0.06)',
    shadowColor: 'rgba(0,0,0,0.10)',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 14,
  },
  dark: {
    backgroundColor: 'rgba(28,28,30,0.90)',      // was rgba(16,16,22,0.90)
    borderTopWidth: 0.33,
    borderTopColor: 'rgba(255,255,255,0.09)',     // was 0.07
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },
},

// Update modal.dark:
modal: {
  light: {
    backgroundColor: 'rgba(242,242,247,0.97)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  dark: {
    backgroundColor: 'rgba(28,28,30,0.97)',      // was rgba(26,26,34,0.97)
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
},

// Update glassmorphic.dark:
glassmorphic: {
  light: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.52)',
  },
  dark: {
    backgroundColor: 'rgba(28,28,30,0.72)',      // was rgba(20,20,28,0.70)
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
},

// Update thin.dark:
thin: {
  light: {
    backgroundColor: 'rgba(255,255,255,0.32)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.60)',
  },
  dark: {
    backgroundColor: 'rgba(255,255,255,0.07)',   // was 0.06
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
},
```

- [ ] **Step 4: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: iOS 26 tokens — dark palette #1C1C1E family, glass tints"
```

---

## Task 2: Update `GlassBlur`

**Files:**
- Modify: `components/glass-blur.tsx`

- [ ] **Step 1: Update default tints**

```ts
// Replace:
const resolvedTint = tintColor ?? (isDark
  ? 'rgba(10,10,18,0.42)'
  : 'rgba(255,255,255,0.52)');

// With:
const resolvedTint = tintColor ?? (isDark
  ? 'rgba(28,28,30,0.52)'
  : 'rgba(255,255,255,0.72)');
```

- [ ] **Step 2: Update blur intensity**

```ts
// Replace:
const intensity = isDark ? 58 : 72;

// With:
const intensity = isDark ? 62 : 80;
```

- [ ] **Step 3: Commit**

```bash
git add components/glass-blur.tsx
git commit -m "feat: GlassBlur — brighter light tint, warmer dark tint"
```

---

## Task 3: Update `ClearLiquidGlass`

**Files:**
- Modify: `components/clear-liquid-glass.tsx`

- [ ] **Step 1: Update tint**

```ts
// Replace:
tintColor={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.18)'}

// With:
tintColor={isDark ? 'rgba(44,44,46,0.45)' : 'rgba(255,255,255,0.32)'}
```

- [ ] **Step 2: Commit**

```bash
git add components/clear-liquid-glass.tsx
git commit -m "feat: ClearLiquidGlass — whiter light tint, warm dark tint"
```

---

## Task 4: Update `GlassPageHeader`

**Files:**
- Modify: `components/glass-page-header.tsx`

- [ ] **Step 1: Update GlassBlur tintColor**

Find the `tintColor` prop on the `<GlassBlur>` in the fallback branch:

```ts
// Replace:
tintColor={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.50)'}

// With:
tintColor={isDark ? 'rgba(28,28,30,0.60)' : 'rgba(255,255,255,0.78)'}
```

- [ ] **Step 2: Commit**

```bash
git add components/glass-page-header.tsx
git commit -m "feat: GlassPageHeader — airy light tint, warm dark tint"
```

---

## Task 5: Update `FloatingTabBar`

**Files:**
- Modify: `components/floating-tab-bar.tsx`

- [ ] **Step 1: Update GLASS.dark object**

Replace the `dark:` entry inside the `GLASS` constant:

```ts
dark: {
  barBlurIntensity:  80,
  barBlurTint:       'dark' as const,
  barTint:           'rgba(28,28,30,0.88)',
  barSpecTop:        'rgba(255,255,255,0.10)',
  barSpecBot:        'rgba(255,255,255,0.00)',
  barEdgeTop:        'rgba(255,255,255,0.14)',
  barEdgeBot:        'rgba(0,0,0,0.38)',
  barBorder:         'rgba(255,255,255,0.10)',
  shadowOpacity:     0.62,
  shadowRadius:      40,
  pillBlurIntensity: 28,
  pillBlurTint:      'dark' as const,
  pillFill:          'rgba(255,255,255,0.08)',
  pillRimTop:        'rgba(255,255,255,0.65)',
  pillRimSide:       'rgba(255,255,255,0.28)',
  pillRimBot:        'rgba(255,255,255,0.07)',
  causticTop:        'rgba(255,255,255,0.38)',
  causticBot:        'rgba(255,255,255,0.00)',
  glint:             'rgba(255,255,255,0.70)',
  reflect:           'rgba(255,255,255,0.15)',
},
```

- [ ] **Step 2: Commit**

```bash
git add components/floating-tab-bar.tsx
git commit -m "feat: FloatingTabBar — dark glass to #1C1C1E family"
```

---

## Task 6: Update `LiquidSwitch` and `ArticleCard`

**Files:**
- Modify: `components/liquid-switch.tsx`
- Modify: `components/article-card.tsx`

- [ ] **Step 1: LiquidSwitch — update dark OFF track color**

In `liquid-switch.tsx`, find the `interpolateColor` call and update the OFF color for dark mode:

```ts
// Replace:
[isDark ? 'rgba(255,255,255,0.18)' : 'rgba(120,120,128,0.24)', 'rgb(52,199,89)']

// With:
[isDark ? 'rgba(72,72,74,0.90)' : 'rgba(120,120,128,0.24)', 'rgb(52,199,89)']
```

- [ ] **Step 2: ArticleCard default row — remove inline glass, use surface**

In `components/article-card.tsx`, in the `variant === 'default'` branch, remove the entire glass block:

```tsx
// Remove this block entirely:
{Platform.OS === 'ios' && isLiquidGlassSupported ? (
  <LiquidGlassView style={[StyleSheet.absoluteFill, styles.rowBlur]} effect="regular" interactive={false} />
) : (
  <>
    <BlurView intensity={isDark ? 62 : 75} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, styles.rowBlur]} />
    <View style={[StyleSheet.absoluteFill, styles.rowBlur, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.52)' }]} pointerEvents="none" />
  </>
)}
```

Update the Pressable style to include surface colors inline:

```tsx
<Pressable
  onPress={handlePress}
  onPressIn={handlePressIn}
  onPressOut={handlePressOut}
  style={({ pressed }) => [
    styles.row,
    { backgroundColor: colors.surface, borderColor: colors.border },
    pressed && styles.rowPressed,
  ]}
>
```

- [ ] **Step 3: ArticleCard compact row — same treatment**

In the `variant === 'compact'` branch, remove the BlurView block and update the Pressable:

```tsx
<Pressable
  onPress={handlePress}
  onPressIn={handlePressIn}
  onPressOut={handlePressOut}
  style={({ pressed }) => [
    styles.compactRow,
    { backgroundColor: colors.surface, borderColor: colors.border },
    pressed && styles.rowPressed,
  ]}
>
```

Remove the glass block from compact variant too.

- [ ] **Step 4: Remove unused imports from article-card.tsx**

Remove `LiquidGlassView`, `isLiquidGlassSupported`, and `BlurView` from the imports at the top of `article-card.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/liquid-switch.tsx components/article-card.tsx
git commit -m "feat: LiquidSwitch dark track, ArticleCard surface card"
```

---

## Task 7: Update `ProductCard`

**Files:**
- Modify: `components/product-card.tsx`

- [ ] **Step 1: Read the file to locate glass layers**

Open `components/product-card.tsx` and find the `<View style={styles.productCardInner}>` block inside the main exported `ProductCard` component.

- [ ] **Step 2: Remove all absolute-positioned glass layers**

Inside `productCardInner`, remove:
- The `LiquidGlassView` or `BlurView` backdrop
- The tinted `View` overlay (`backgroundColor: isDark ? 'rgba(...)'`)
- The caustic `LinearGradient`
- The specular `View`
- The blob `View`
- The inner shadow `LinearGradient`

Keep only the image, info content, and badge children.

- [ ] **Step 3: Apply surface card style inline**

Update the `<View style={styles.productCardInner}>` to pass colors:

```tsx
<View
  style={[
    styles.productCardInner,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ]}
>
```

Update `productCardInner` in the StyleSheet — remove any hardcoded `backgroundColor`/`borderColor` from it, keep `borderWidth: StyleSheet.hairlineWidth`, `borderRadius`, `overflow: 'hidden'`, and `...Shadow.sm`.

- [ ] **Step 4: Remove unused imports**

Remove `LiquidGlassView`, `isLiquidGlassSupported`, `BlurView` from `product-card.tsx` imports if no longer used.

- [ ] **Step 5: Commit**

```bash
git add components/product-card.tsx
git commit -m "feat: ProductCard — surface card, remove glass layers"
```

---

## Task 8: Update Home screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Update local ProductCard component**

`index.tsx` has its own local `function ProductCard(...)` with inline glass. Find `<View style={styles.productCardInner}>` and remove all absolute glass layers (same as Task 7 Step 2). Apply inline colors:

```tsx
<View
  style={[
    styles.productCardInner,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ]}
>
```

- [ ] **Step 2: Remove unused imports**

Remove `BlurView` from imports at the top of `index.tsx` if it is no longer used after Step 1.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: Home screen — surface product cards"
```

---

## Task 9: Update Nieuws and Reviews screens

**Files:**
- Modify: `app/(tabs)/nieuws.tsx`
- Modify: `app/(tabs)/reviews.tsx`

- [ ] **Step 1: Nieuws — update FlatList contentContainerStyle**

In `nieuws.tsx`, find the `<FlatList>` and update (or add) its `contentContainerStyle`:

```tsx
contentContainerStyle={styles.list}
```

Add to StyleSheet:
```ts
list: {
  paddingHorizontal: Spacing.md,
  paddingTop: Spacing.sm,
  paddingBottom: 120,
  gap: 10,
},
```

- [ ] **Step 2: Reviews — same change**

Open `app/(tabs)/reviews.tsx`, apply the identical `contentContainerStyle={styles.list}` and StyleSheet entry.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/nieuws.tsx app/\(tabs\)/reviews.tsx
git commit -m "feat: Nieuws/Reviews — list padding for grouped card look"
```

---

## Task 10: Update Prijzen screen

**Files:**
- Modify: `app/(tabs)/prijzen.tsx`

- [ ] **Step 1: Update product grid contentContainerStyle**

Find the `FlatList` that renders `ProductCard` items. Update `contentContainerStyle`:

```ts
{
  paddingHorizontal: Spacing.md,
  paddingTop: Spacing.sm,
  paddingBottom: 120,
  gap: 12,
}
```

- [ ] **Step 2: Active category chip accent**

Find the category chip render. The active chip should use `Palette.primaryVivid` (`#34C759`) for its border/background tint. Find where `isFocused`/`selected` chip color is set and change it from any hardcoded value to `Palette.primaryVivid`.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/prijzen.tsx
git commit -m "feat: Prijzen — grid padding, green active chip"
```

---

## Task 11: Update Profiel screen

**Files:**
- Modify: `app/(tabs)/profiel.tsx`

- [ ] **Step 1: Replace Group component**

The `Group` component in `profiel.tsx` currently uses `ClearLiquidGlass`. Replace it with a plain surface view. Find:

```tsx
function Group({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <ClearLiquidGlass isDark={isDark} borderRadius={Radius.xl} style={styles.group}>
      {children}
    </ClearLiquidGlass>
  );
}
```

Replace with:
```tsx
function Group({ children, colors }: { children: React.ReactNode; colors: (typeof Colors)['light'] }) {
  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );
}
```

Update `styles.group`:
```ts
group: {
  borderRadius: Radius.xl,
  borderWidth: StyleSheet.hairlineWidth,
  overflow: 'hidden',
  ...Shadow.sm,
},
```

- [ ] **Step 2: Update all Group usages**

Find every `<Group isDark={isDark}>` in the screen JSX and change to `<Group colors={colors}>`.

- [ ] **Step 3: Update SectionLabel color**

Find `SectionLabel` and update the text color from `colors.textSecondary` to `colors.textTertiary`:

```tsx
<Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{label}</Text>
```

Update `styles.sectionLabel` to add uppercase/letterSpacing if not already present:
```ts
sectionLabel: {
  fontSize: 13,
  fontWeight: '400',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginLeft: 16,
  marginBottom: 8,
},
```

- [ ] **Step 4: Commit**

```bash
git add app/\(tabs\)/profiel.tsx
git commit -m "feat: Profiel — plain surface groups, iOS 26 Settings pattern"
```

---

## Task 12: Update remaining tab screens

**Files:**
- Modify: `app/(tabs)/bladwijzers.tsx`
- Modify: `app/(tabs)/zoeken.tsx`

- [ ] **Step 1: Bladwijzers**

Open `app/(tabs)/bladwijzers.tsx`. Find cards/rows with hardcoded dark glass (`rgba(255,255,255,0.04)` or similar). Replace `backgroundColor` with `colors.surface` and `borderColor` with `colors.border`, where `colors = Colors[colorScheme]`.

- [ ] **Step 2: Zoeken**

Open `app/(tabs)/zoeken.tsx`. Apply the same surface/border treatment to search result rows and any card containers.

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/bladwijzers.tsx app/\(tabs\)/zoeken.tsx
git commit -m "feat: Bladwijzers/Zoeken — theme surface cards"
```

---

## Task 13: Update product and artikel detail screens

**Files:**
- Modify: `app/product/[id].tsx`
- Modify: `app/artikel/[id].tsx`

- [ ] **Step 1: product/[id].tsx — section cards**

Open `app/product/[id].tsx`. Find every `ClearLiquidGlass` wrapper used for info sections (specs, price, shops sections). Replace each with:

```tsx
<View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
  {/* children unchanged */}
</View>
```

Add to StyleSheet if not present:
```ts
sectionCard: {
  borderRadius: Radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  overflow: 'hidden',
  marginHorizontal: Spacing.md,
  marginBottom: Spacing.md,
  ...Shadow.sm,
},
```

- [ ] **Step 2: artikel/[id].tsx — content card**

Open `app/artikel/[id].tsx`. Apply the same `sectionCard` pattern to the article content wrapper.

- [ ] **Step 3: Commit**

```bash
git add "app/product/[id].tsx" "app/artikel/[id].tsx"
git commit -m "feat: product/artikel detail — grouped surface section cards"
```

---

## Task 14: Update misc product screens

**Files:**
- Modify: `app/vergelijk.tsx`
- Modify: `app/link-scanner.tsx`
- Modify: `app/categorieen.tsx`
- Modify: `app/recommender/index.tsx`
- Modify: `app/pc-builder.tsx`

- [ ] **Step 1: vergelijk.tsx**

Find comparison cards. Replace hardcoded glass `backgroundColor` with `colors.surface`, `borderColor` with `colors.border`.

- [ ] **Step 2: link-scanner.tsx**

Find result cards. Same treatment.

- [ ] **Step 3: categorieen.tsx**

Find category list items. Replace any hardcoded tinted backgrounds with `colors.surface` + `colors.border`.

- [ ] **Step 4: recommender/index.tsx**

Find recommendation cards. Same treatment.

- [ ] **Step 5: pc-builder.tsx**

Find component selection cards. Same treatment.

- [ ] **Step 6: Commit**

```bash
git add app/vergelijk.tsx app/link-scanner.tsx app/categorieen.tsx app/recommender/index.tsx app/pc-builder.tsx
git commit -m "feat: misc screens — theme surface cards"
```

---

## Task 15: Update instellingen screens

**Files:**
- Modify: `app/instellingen/bladwijzers.tsx`
- Modify: `app/instellingen/prijsalerts.tsx`
- Modify: `app/instellingen/zoeken.tsx`
- Modify: `app/instellingen/meldingen.tsx`

These screens should most closely mirror iOS 26 Settings.

- [ ] **Step 1: Apply grouped section pattern to each screen**

For each file, get `colors` via `Colors[useColorScheme() ?? 'light']`. Replace any `ClearLiquidGlass` group wrappers with:

```tsx
{/* Section label */}
<Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
  SECTIE NAAM
</Text>

{/* Grouped card */}
<View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
  <Row ... />
  <View style={[styles.separator, { backgroundColor: colors.border }]} />
  <Row ... />
</View>
```

Add to each StyleSheet:
```ts
sectionLabel: {
  fontSize: 13,
  fontWeight: '400',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginLeft: 16,
  marginBottom: 8,
},
group: {
  borderRadius: Radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  overflow: 'hidden',
  ...Shadow.sm,
},
separator: {
  height: StyleSheet.hairlineWidth,
  marginLeft: 16,
},
```

- [ ] **Step 2: Commit**

```bash
git add app/instellingen/bladwijzers.tsx app/instellingen/prijsalerts.tsx app/instellingen/zoeken.tsx app/instellingen/meldingen.tsx
git commit -m "feat: instellingen — iOS 26 grouped sections"
```

---

## Task 16: Update auth screens

**Files:**
- Modify: `app/(auth)/inloggen.tsx`
- Modify: `app/(auth)/registreren.tsx`
- Modify: `app/(auth)/profiel-instellen.tsx`
- Modify: `app/(auth)/wachtwoord-vergeten.tsx`
- Modify: `app/(auth)/telefoon.tsx`
- Modify: `app/(auth)/onboarding.tsx`

- [ ] **Step 1: Replace GlassCard in inloggen.tsx**

`inloggen.tsx` has a local `GlassCard` wrapping `LiquidGlassView`. Replace it:

```tsx
function GlassCard({ children, style }: { children: React.ReactNode; style?: object }) {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  return (
    <View style={[styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}
```

Update `styles.glassCard`:
```ts
glassCard: {
  borderRadius: Radius.xxl,
  borderWidth: StyleSheet.hairlineWidth,
  overflow: 'hidden',
  padding: Spacing.lg,
  ...Shadow.md,
},
```

Remove `glassCardFallback` style entry.

- [ ] **Step 2: Replace GlassInput in inloggen.tsx**

```tsx
function GlassInput({ children, style }: { children: React.ReactNode; style?: object }) {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  return (
    <View style={[styles.glassInput, { backgroundColor: colors.fill, borderColor: colors.border }, style]}>
      {children}
    </View>
  );
}
```

Update `styles.glassInput`:
```ts
glassInput: {
  borderRadius: Radius.lg,
  borderWidth: StyleSheet.hairlineWidth,
  overflow: 'hidden',
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.sm + 2,
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.sm,
},
```

Remove `glassInputFallback` style entry.

- [ ] **Step 3: Remove unused imports from inloggen.tsx**

Remove `LiquidGlassView` and `isLiquidGlassSupported` from imports.

- [ ] **Step 4: Apply same pattern to remaining auth screens**

Open each of `registreren.tsx`, `profiel-instellen.tsx`, `wachtwoord-vergeten.tsx`, `telefoon.tsx`. Find any `LiquidGlassView`-based card or input wrappers. Replace with the same plain themed pattern: `colors.surface` + `colors.border` for cards, `colors.fill` + `colors.border` for input fields. Remove `LiquidGlassView`/`isLiquidGlassSupported` imports from each file.

- [ ] **Step 5: Update onboarding.tsx**

Open `app/(auth)/onboarding.tsx`. Find glass/blur wrappers. Replace with plain `View` using `colors.surface` + `colors.border`.

- [ ] **Step 6: Commit**

```bash
git add "app/(auth)/inloggen.tsx" "app/(auth)/registreren.tsx" "app/(auth)/profiel-instellen.tsx" "app/(auth)/wachtwoord-vergeten.tsx" "app/(auth)/telefoon.tsx" "app/(auth)/onboarding.tsx"
git commit -m "feat: auth screens — replace LiquidGlassView with themed surface cards"
```

---

## Task 17: Update legal screens

**Files:**
- Modify: `app/cookies.tsx`
- Modify: `app/privacy.tsx`
- Modify: `app/terms.tsx`
- Modify: `app/affiliate.tsx`

- [ ] **Step 1: Surface/border cleanup**

For each file, get `colors = Colors[colorScheme]`. Replace any hardcoded glass `backgroundColor` on content containers with `colors.background` for the screen and `colors.surface`/`colors.border` for content cards. Remove any blur layers — these are text-only screens.

- [ ] **Step 2: Commit**

```bash
git add app/cookies.tsx app/privacy.tsx app/terms.tsx app/affiliate.tsx
git commit -m "feat: legal screens — theme surface, no blur"
```
