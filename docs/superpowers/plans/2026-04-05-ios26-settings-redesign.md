# iOS 26 Settings Aesthetic Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle Tweakly to match the iOS 26 Settings app aesthetic in both light and dark mode — airy white frosted glass on light, warm gray frosted glass on dark, grouped card sections throughout.

**Architecture:** Design tokens in `constants/theme.ts` are updated first so every downstream component inherits the new colors automatically. Primitive glass components (`GlassBlur`, `ClearLiquidGlass`, `GlassPageHeader`, `FloatingTabBar`) are updated next. Then `LiquidScreen` (the shared screen wrapper) is updated to use the system background color. Finally every screen is audited and card/border colors replaced with `colors.surface` + `colors.border`.

**Tech Stack:** React Native, Expo Router, `@callstack/liquid-glass` (iOS 26), `@shopify/react-native-skia` BackdropBlur (Android), `expo-blur` (fallback), `react-native-reanimated`.

---

## File Map

| File | Change |
|---|---|
| `constants/theme.ts` | Update `Palette.dark1–5`, `Colors.dark.*`, `Glass.*` tokens |
| `components/liquid-screen.tsx` | Use `Colors[scheme].background` instead of hardcoded `#08080D` |
| `components/glass-blur.tsx` | Update default tints and blur intensities for both modes |
| `components/clear-liquid-glass.tsx` | Update tint colors for both modes |
| `components/glass-page-header.tsx` | Update GlassBlur tints for both modes |
| `components/floating-tab-bar.tsx` | Update `GLASS.dark` token values |
| `components/liquid-switch.tsx` | Update dark mode OFF track color |
| `components/article-card.tsx` | Replace hardcoded dark tints with `colors.surface` + `colors.border` |
| `components/product-card.tsx` | Replace hardcoded dark tints with `colors.surface` + `colors.border` |
| `app/(tabs)/index.tsx` | Update card backgrounds to use `colors.surface` |
| `app/(tabs)/nieuws.tsx` | Remove gap wrapper, articles render directly in grouped list |
| `app/(tabs)/reviews.tsx` | Same as nieuws |
| `app/(tabs)/prijzen.tsx` | Update card/chip colors |
| `app/(tabs)/profiel.tsx` | Group already uses `ClearLiquidGlass` — tokens auto-fix; update `sectionLabel` color |
| `app/(tabs)/bladwijzers.tsx` | Update card backgrounds |
| `app/(tabs)/zoeken.tsx` | Update card backgrounds |
| `app/product/[id].tsx` | Update card backgrounds |
| `app/artikel/[id].tsx` | Update card backgrounds |
| `app/vergelijk.tsx` | Update card backgrounds |
| `app/link-scanner.tsx` | Update card backgrounds |
| `app/categorieen.tsx` | Update card backgrounds |
| `app/recommender/index.tsx` | Update card backgrounds |
| `app/pc-builder.tsx` | Update card backgrounds |
| `app/instellingen/bladwijzers.tsx` | Update card backgrounds |
| `app/instellingen/prijsalerts.tsx` | Update card backgrounds |
| `app/instellingen/zoeken.tsx` | Update card backgrounds |
| `app/instellingen/meldingen.tsx` | Update card backgrounds |
| `app/(auth)/inloggen.tsx` | Replace hardcoded glass cards with `colors.surface` |
| `app/(auth)/registreren.tsx` | Same as inloggen |
| `app/(auth)/profiel-instellen.tsx` | Same as inloggen |
| `app/(auth)/wachtwoord-vergeten.tsx` | Same as inloggen |
| `app/(auth)/telefoon.tsx` | Same as inloggen |
| `app/(auth)/onboarding.tsx` | Same as inloggen |
| `app/cookies.tsx` | Update background/card colors |
| `app/privacy.tsx` | Update background/card colors |
| `app/terms.tsx` | Update background/card colors |
| `app/affiliate.tsx` | Update background/card colors |

---

## Task 1: Update Design Tokens (`constants/theme.ts`)

**Files:**
- Modify: `constants/theme.ts`

- [ ] **Step 1: Update `Palette` dark values**

In `constants/theme.ts`, replace the five dark palette values:

```ts
// Before:
dark1: '#08080D',
dark2: '#121218',
dark3: '#1C1C24',
dark4: '#28283A',
dark5: '#3C3C4A',

// After:
dark1: '#1C1C1E',
dark2: '#2C2C2E',
dark3: '#3A3A3C',
dark4: '#48484A',
dark5: '#636366',
```

- [ ] **Step 2: Update `Colors.dark` map**

Replace the `dark:` block in `Colors`:

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

- [ ] **Step 3: Add `Glass.cardDark` and update `Glass.liquid`, `Glass.chrome`, `Glass.header`, `Glass.tabBar`, `Glass.modal`, `Glass.glassmorphic`, `Glass.thin`**

Find the `Glass` constant and apply these changes:

```ts
// Add after Glass.cardLight:
cardDark: {
  backgroundColor: 'rgba(44,44,46,0.85)',
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.10)',
},

// Glass.liquid.light — change backgroundColor:
light: {
  backgroundColor: 'rgba(255,255,255,0.72)',  // was 0.58
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.95)',
  shadowColor: 'rgba(0,0,0,0.12)',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 20,
  elevation: 5,
},

// Glass.liquid.dark:
dark: {
  backgroundColor: 'rgba(44,44,46,0.82)',    // was rgba(36,36,46,0.75)
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.12)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.45,                        // was 0.50
  shadowRadius: 28,                           // was 32
  elevation: 12,
},

// Glass.chrome.dark backgroundColor:
dark: {
  backgroundColor: 'rgba(28,28,30,0.90)',    // was rgba(26,26,34,0.82)
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.10)',
},

// Glass.header.light backgroundColor:
light: {
  backgroundColor: 'rgba(242,242,247,0.92)', // was 0.88
  borderBottomWidth: 0.33,
  borderBottomColor: 'rgba(0,0,0,0.08)',
},

// Glass.header.dark:
dark: {
  backgroundColor: 'rgba(28,28,30,0.92)',    // was rgba(8,8,14,0.85)
  borderBottomWidth: 0.33,
  borderBottomColor: 'rgba(255,255,255,0.08)', // was 0.06
},

// Glass.tabBar.dark:
dark: {
  backgroundColor: 'rgba(28,28,30,0.90)',    // was rgba(16,16,22,0.90)
  borderTopWidth: 0.33,
  borderTopColor: 'rgba(255,255,255,0.09)',  // was 0.07
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -10 },
  shadowOpacity: 0.55,
  shadowRadius: 28,
  elevation: 14,
},

// Glass.modal.dark backgroundColor:
dark: {
  backgroundColor: 'rgba(28,28,30,0.97)',    // was rgba(26,26,34,0.97)
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.10)',
},

// Glass.glassmorphic.dark backgroundColor:
dark: {
  backgroundColor: 'rgba(28,28,30,0.72)',    // was rgba(20,20,28,0.70)
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.08)',
},

// Glass.thin.dark backgroundColor:
dark: {
  backgroundColor: 'rgba(255,255,255,0.07)', // was 0.06
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.10)',
},
```

- [ ] **Step 4: Verify the file compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 5: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: iOS 26 Settings design tokens — dark mode to #1C1C1E family, lighter glass tints"
```

---

## Task 2: Update `LiquidScreen` (shared screen background)

**Files:**
- Modify: `components/liquid-screen.tsx`

- [ ] **Step 1: Make `LiquidScreen` theme-aware**

`LiquidScreen` currently hardcodes `backgroundColor: '#08080D'` in styles. Replace it so the background follows `Colors[scheme].background`:

```ts
// Add imports at top:
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

// In LiquidScreen function body, before return:
const colorScheme = useColorScheme() ?? 'light';

// Replace the root View:
<View style={[styles.root, { backgroundColor: Colors[colorScheme].background }, style]}>
```

Remove `backgroundColor` from `styles.root`:
```ts
root: {
  flex: 1,
  // backgroundColor removed — set dynamically above
},
```

The orb gradient stays. Its colors (`rgba(255,255,255,0.012)`) are already near-invisible and look fine on both backgrounds.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/liquid-screen.tsx
git commit -m "feat: LiquidScreen uses Colors[scheme].background instead of hardcoded #08080D"
```

---

## Task 3: Update `GlassBlur` tints and intensities

**Files:**
- Modify: `components/glass-blur.tsx`

- [ ] **Step 1: Update default tint and blur intensity for both modes**

In `GlassBlur`, find the `resolvedTint` and `intensity` assignments:

```ts
// resolvedTint (line ~49):
const resolvedTint = tintColor ?? (isDark
  ? 'rgba(28,28,30,0.52)'     // was rgba(10,10,18,0.42)
  : 'rgba(255,255,255,0.72)'); // was rgba(255,255,255,0.52)

// intensity (line ~70, iOS/web branch):
const intensity = isDark ? 62 : 80;  // was 58 : 72
```

- [ ] **Step 2: Update `AndroidGlassBlur` dark specular/caustic colors**

In `AndroidGlassBlur`, the tintColor is already passed in from the resolved tint (now correct). Update the specular/caustic colors to match the lighter dark mode:

```ts
// In AndroidGlassBlur body:
const specularColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.95)'; // was 0.18/0.95
const causticColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.65)'; // was 0.08/0.65
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add components/glass-blur.tsx
git commit -m "feat: GlassBlur — lighter tints for both modes, intensity 80/62"
```

---

## Task 4: Update `ClearLiquidGlass` tints

**Files:**
- Modify: `components/clear-liquid-glass.tsx`

- [ ] **Step 1: Update tint colors**

In the `GlassBlur` fallback branch (line ~40), update the `tintColor` prop:

```ts
// Before:
tintColor={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.18)'}

// After:
tintColor={isDark ? 'rgba(44,44,46,0.45)' : 'rgba(255,255,255,0.32)'}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/clear-liquid-glass.tsx
git commit -m "feat: ClearLiquidGlass — warmer dark tint, more opaque light tint"
```

---

## Task 5: Update `GlassPageHeader` tints

**Files:**
- Modify: `components/glass-page-header.tsx`

- [ ] **Step 1: Update GlassBlur tintColor in the fallback branch**

Find the `GlassBlur` element (line ~38):

```ts
// Before:
tintColor={isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.50)'}

// After:
tintColor={isDark ? 'rgba(28,28,30,0.60)' : 'rgba(255,255,255,0.78)'}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/glass-page-header.tsx
git commit -m "feat: GlassPageHeader — warmer dark tint, more opaque white light tint"
```

---

## Task 6: Update `FloatingTabBar` dark tokens

**Files:**
- Modify: `components/floating-tab-bar.tsx`

- [ ] **Step 1: Update `GLASS.dark` values**

Find the `GLASS.dark` object (around line 87) and update:

```ts
dark: {
  barBlurIntensity:  80,
  barBlurTint:       'dark' as const,
  barTint:           'rgba(28,28,30,0.88)',    // was rgba(10,10,18,0.52)
  barSpecTop:        'rgba(255,255,255,0.10)', // was 0.14
  barSpecBot:        'rgba(255,255,255,0.00)',
  barEdgeTop:        'rgba(255,255,255,0.14)', // was 0.18
  barEdgeBot:        'rgba(0,0,0,0.38)',
  barBorder:         'rgba(255,255,255,0.10)', // was 0.12
  shadowOpacity:     0.62,
  shadowRadius:      40,
  pillBlurIntensity: 28,
  pillBlurTint:      'dark' as const,
  pillFill:          'rgba(255,255,255,0.08)', // was 0.09
  pillRimTop:        'rgba(255,255,255,0.65)',
  pillRimSide:       'rgba(255,255,255,0.28)',
  pillRimBot:        'rgba(255,255,255,0.07)',
  causticTop:        'rgba(255,255,255,0.38)',
  causticBot:        'rgba(255,255,255,0.00)',
  glint:             'rgba(255,255,255,0.70)',
  reflect:           'rgba(255,255,255,0.15)',
},
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/floating-tab-bar.tsx
git commit -m "feat: FloatingTabBar GLASS.dark — warmer gray tints matching #1C1C1E palette"
```

---

## Task 7: Update `LiquidSwitch` dark track color

**Files:**
- Modify: `components/liquid-switch.tsx`

- [ ] **Step 1: Update dark OFF-state track color**

In `trackStyle` (line ~29), the OFF color in dark mode:

```ts
// Before:
[isDark ? 'rgba(255,255,255,0.18)' : 'rgba(120,120,128,0.24)', 'rgb(52,199,89)']

// After:
[isDark ? 'rgba(72,72,74,0.90)' : 'rgba(120,120,128,0.24)', 'rgb(52,199,89)']
```

`rgba(72,72,74,0.90)` matches `dark4` (`#48484A`) which is the iOS 26 switch track OFF color.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add components/liquid-switch.tsx
git commit -m "feat: LiquidSwitch dark OFF track uses #48484A (iOS 26 gray)"
```

---

## Task 8: Update `ArticleCard` card backgrounds

**Files:**
- Modify: `components/article-card.tsx`

- [ ] **Step 1: Replace hardcoded row background with theme colors**

The `row` and `compactRow` styles have hardcoded `backgroundColor: 'rgba(255,255,255,0.04)'` and `borderColor: 'rgba(255,255,255,0.14)'`. These look dark on dark mode but wrong on light mode.

`ArticleCard` already receives `colorScheme` — use `colors.surface` and `colors.border`:

In the `StyleSheet.create` section, `row` and `compactRow` have static `backgroundColor` and `borderColor`. Move these to inline styles on the `Pressable`.

For the `default` variant Pressable (line ~119):
```tsx
style={({ pressed }) => [
  styles.row,
  {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  pressed && styles.rowPressed,
]}
```

For the `compact` variant Pressable (line ~180):
```tsx
style={({ pressed }) => [
  styles.compactRow,
  {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  pressed && styles.rowPressed,
]}
```

Remove `backgroundColor` and `borderColor` from `styles.row` and `styles.compactRow` in `StyleSheet.create`:
```ts
row: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingVertical: 13,
  paddingHorizontal: Spacing.md,
  borderRadius: Radius.lg,
  overflow: 'hidden',
  borderWidth: 0.5,
  ...Shadow.md,
},
compactRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  paddingVertical: 10,
  paddingHorizontal: Spacing.md,
  borderRadius: Radius.md,
  overflow: 'hidden',
  borderWidth: 0.5,
  ...Shadow.md,
},
```

Also update the `featured` card — it references `Palette.dark3` directly:
```tsx
// Before:
style={({ pressed }) => [
  styles.featured,
  { backgroundColor: isDark ? Palette.dark3 : Palette.grey5 },
  ...
]}

// After:
style={({ pressed }) => [
  styles.featured,
  { backgroundColor: isDark ? colors.surfaceElevated : Palette.grey5 },
  ...
]}
```

- [ ] **Step 2: Also update the BlurView fallback tint inside the row**

In the `default` variant's fallback (line ~129):
```tsx
<View style={[StyleSheet.absoluteFill, styles.rowBlur, {
  backgroundColor: isDark ? 'rgba(44,44,46,0.35)' : 'rgba(255,255,255,0.55)'
}]} pointerEvents="none" />
```

Same for `compact` variant (line ~189).

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add components/article-card.tsx
git commit -m "feat: ArticleCard uses colors.surface/border — clean white light, warm gray dark"
```

---

## Task 9: Update `ProductCard` card backgrounds

**Files:**
- Modify: `components/product-card.tsx`

- [ ] **Step 1: Read the current card container styles**

Search for hardcoded background colors in product-card.tsx:

```bash
grep -n "backgroundColor\|borderColor\|dark2\|dark3\|rgba(255,255,255,0.0" components/product-card.tsx | head -30
```

- [ ] **Step 2: Replace hardcoded card backgrounds with `colors.surface` + `colors.border`**

`ProductCard` already uses `colorScheme` → `colors`. For every card container `View` or `Pressable` that uses a hardcoded dark background like `rgba(255,255,255,0.04)` or `Palette.dark2`:

Replace with:
```tsx
backgroundColor: colors.surface,
borderColor: colors.border,
```

For the BlurView fallback tint overlay inside cards:
```tsx
backgroundColor: isDark ? 'rgba(44,44,46,0.35)' : 'rgba(255,255,255,0.55)'
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add components/product-card.tsx
git commit -m "feat: ProductCard uses colors.surface/border for both modes"
```

---

## Task 10: Update Tab Screens

**Files:**
- Modify: `app/(tabs)/index.tsx`, `app/(tabs)/nieuws.tsx`, `app/(tabs)/reviews.tsx`, `app/(tabs)/prijzen.tsx`, `app/(tabs)/profiel.tsx`, `app/(tabs)/bladwijzers.tsx`, `app/(tabs)/zoeken.tsx`

- [ ] **Step 1: `app/(tabs)/index.tsx` — hero card and inline cards**

Search for hardcoded background colors:
```bash
grep -n "backgroundColor\|dark1\|dark2\|0x08\|rgba(255,255,255,0.0[0-9]" app/\(tabs\)/index.tsx | head -30
```

For every inline card/section `View` that has a hardcoded dark background, replace with `colors.surface` / `colors.border`. The `HeroDeal` gradient is brand green and stays unchanged. Category chips that use `color + '15'` opacity tints stay unchanged.

Key pattern to find and update — any `StyleSheet` entry or inline style like:
```ts
// Before:
backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.85)'
// After:
backgroundColor: colors.surface
```

- [ ] **Step 2: `app/(tabs)/profiel.tsx` — section label color**

`SectionLabel` currently uses `colors.textSecondary`. Update to `colors.textTertiary` to match iOS 26 Settings uppercase section headers:

```tsx
// In SectionLabel component (line ~52):
<Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{label}</Text>
```

Also update `styles.sectionLabel` to match the spec:
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

`Group` already uses `ClearLiquidGlass` → tokens updated in Task 4 auto-fix this.

- [ ] **Step 3: `app/(tabs)/nieuws.tsx`, `reviews.tsx` — remove hardcoded gap wrapper backgrounds if any**

Check and remove any inline `backgroundColor` on wrapper Views that should be transparent:
```bash
grep -n "backgroundColor" app/\(tabs\)/nieuws.tsx app/\(tabs\)/reviews.tsx
```
Remove any that set a hardcoded dark color on wrapper containers (not cards).

- [ ] **Step 4: `app/(tabs)/prijzen.tsx` — category chip and grid card colors**

Search:
```bash
grep -n "backgroundColor\|borderColor" app/\(tabs\)/prijzen.tsx | head -30
```

Category chips that show color (e.g. `'#007AFF15'`) stay as-is — they're intentional accent tints. Any card container using a hardcoded dark background updates to `colors.surface`.

- [ ] **Step 5: `app/(tabs)/bladwijzers.tsx`, `zoeken.tsx` — card backgrounds**

```bash
grep -n "rgba(255,255,255,0.0\|dark2\|dark3\|08080" app/\(tabs\)/bladwijzers.tsx app/\(tabs\)/zoeken.tsx
```

Replace with `colors.surface` / `colors.border`.

- [ ] **Step 6: Verify all tabs**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 7: Commit**

```bash
git add app/\(tabs\)/index.tsx app/\(tabs\)/profiel.tsx app/\(tabs\)/nieuws.tsx app/\(tabs\)/reviews.tsx app/\(tabs\)/prijzen.tsx app/\(tabs\)/bladwijzers.tsx app/\(tabs\)/zoeken.tsx
git commit -m "feat: tab screens use colors.surface/border, sectionLabel uses textTertiary"
```

---

## Task 11: Update Product/Article/Feature Screens

**Files:**
- Modify: `app/product/[id].tsx`, `app/artikel/[id].tsx`, `app/vergelijk.tsx`, `app/link-scanner.tsx`, `app/categorieen.tsx`, `app/recommender/index.tsx`, `app/pc-builder.tsx`

- [ ] **Step 1: Find hardcoded backgrounds in each file**

```bash
grep -rn "rgba(255,255,255,0.0[0-9]\|rgba(10,10,18\|rgba(8,8,14\|#08080D\|#121218\|#1C1C24\|dark1\|dark2\|dark3" \
  app/product/ app/artikel/ app/vergelijk.tsx app/link-scanner.tsx app/categorieen.tsx app/recommender/ app/pc-builder.tsx
```

- [ ] **Step 2: Replace each with `colors.surface` / `colors.border`**

For each file, the pattern is:
- Card container backgrounds → `colors.surface`
- Card borders → `colors.border` (width `StyleSheet.hairlineWidth` or `0.5`)
- Screen-level backgrounds → remove (let `LiquidScreen` handle via Task 2)
- BlurView fallback tint overlays inside cards → `isDark ? 'rgba(44,44,46,0.35)' : 'rgba(255,255,255,0.55)'`

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add app/product/ app/artikel/ app/vergelijk.tsx app/link-scanner.tsx app/categorieen.tsx app/recommender/ app/pc-builder.tsx
git commit -m "feat: product/artikel/feature screens use colors.surface/border"
```

---

## Task 12: Update Instellingen Screens

**Files:**
- Modify: `app/instellingen/bladwijzers.tsx`, `app/instellingen/prijsalerts.tsx`, `app/instellingen/zoeken.tsx`, `app/instellingen/meldingen.tsx`

- [ ] **Step 1: Find hardcoded backgrounds**

```bash
grep -rn "rgba(255,255,255,0.0[0-9]\|rgba(10,10,18\|dark1\|dark2\|dark3\|#08080" app/instellingen/
```

- [ ] **Step 2: Replace with `colors.surface` / `colors.border`**

Same pattern as Task 11. These are settings-style screens so they should closely match the profiel tab: grouped cards with `colors.surface` background, `colors.border` border, `Radius.xl` (22px) corners, `Shadow.sm`.

For any `ClearLiquidGlass` group wrappers — tokens from Task 4 auto-fix. For plain `View` cards, replace manually.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/instellingen/
git commit -m "feat: instellingen screens use colors.surface/border grouped cards"
```

---

## Task 13: Update Auth Screens

**Files:**
- Modify: `app/(auth)/inloggen.tsx`, `app/(auth)/registreren.tsx`, `app/(auth)/profiel-instellen.tsx`, `app/(auth)/wachtwoord-vergeten.tsx`, `app/(auth)/telefoon.tsx`, `app/(auth)/onboarding.tsx`

- [ ] **Step 1: Find auth-specific glass cards**

Auth screens use local `GlassCard` and `GlassInput` helpers that wrap `LiquidGlassView` directly. On non-iOS-26 devices the fallback styles `glassCardFallback`/`glassInputFallback` have hardcoded dark backgrounds.

```bash
grep -rn "glassCardFallback\|glassInputFallback\|backgroundColor\|rgba(255,255,255,0.0" app/\(auth\)/
```

- [ ] **Step 2: Update fallback styles to use theme colors**

Auth screens already import `Colors` and use `resolvedTheme`. For each auth screen's local `GlassCard`/`GlassInput` fallback:

```ts
// Before (example from inloggen.tsx):
glassCardFallback: {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.14)',
},
glassInputFallback: {
  backgroundColor: 'rgba(255,255,255,0.04)',
  borderWidth: 0.5,
  borderColor: 'rgba(255,255,255,0.10)',
},
```

These styles need to be dynamic (not in `StyleSheet.create`) since they depend on theme. Move to inline styles that reference `colors.surface` and `colors.border`:

```tsx
// Replace GlassCard component in each auth screen:
function GlassCard({ children, style, isDark, colors }: {
  children: React.ReactNode;
  style?: object;
  isDark: boolean;
  colors: typeof Colors['light'];
}) {
  if (Platform.OS === 'ios' && isLiquidGlassSupported) {
    return (
      <LiquidGlassView style={[styles.glassCard, style]} effect="regular" interactive={false}>
        {children}
      </LiquidGlassView>
    );
  }
  return (
    <View style={[
      styles.glassCard,
      {
        backgroundColor: colors.surface,
        borderWidth: 0.5,
        borderColor: colors.border,
      },
      style,
    ]}>
      {children}
    </View>
  );
}
```

Pass `isDark` and `colors` from the screen's existing `resolvedTheme` / `colors` variables.

`GlassInput` similarly:
```tsx
function GlassInput({ children, style, colors }: {
  children: React.ReactNode;
  style?: object;
  colors: typeof Colors['light'];
}) {
  if (Platform.OS === 'ios' && isLiquidGlassSupported) {
    return (
      <LiquidGlassView style={[styles.glassInput, style]} effect="thin" interactive={true}>
        {children}
      </LiquidGlassView>
    );
  }
  return (
    <View style={[
      styles.glassInput,
      {
        backgroundColor: colors.fill,
        borderWidth: 0.5,
        borderColor: colors.border,
      },
      style,
    ]}>
      {children}
    </View>
  );
}
```

Apply the same pattern to all 6 auth screens.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: auth screens GlassCard/GlassInput fallbacks use colors.surface/border"
```

---

## Task 14: Update Juridisch Screens

**Files:**
- Modify: `app/cookies.tsx`, `app/privacy.tsx`, `app/terms.tsx`, `app/affiliate.tsx`

- [ ] **Step 1: Find hardcoded backgrounds**

```bash
grep -rn "backgroundColor\|rgba(255,255,255,0.0[0-9]\|dark1\|dark2\|#08080" app/cookies.tsx app/privacy.tsx app/terms.tsx app/affiliate.tsx
```

- [ ] **Step 2: Replace with `colors.surface` / `colors.border`**

These are mostly text-heavy screens. Replace any hardcoded card/section backgrounds with `colors.surface` and borders with `colors.border`. Screen background is handled by `LiquidScreen`.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/cookies.tsx app/privacy.tsx app/terms.tsx app/affiliate.tsx
git commit -m "feat: juridisch screens use colors.surface/border"
```

---

## Task 15: Final Verification

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```
Expected: no new errors introduced by this work.

- [ ] **Step 2: Scan for remaining hardcoded dark values**

```bash
grep -rn "#08080D\|#121218\|#1C1C24\|rgba(10,10,18\|rgba(8,8,14" \
  app/ components/ constants/ \
  --include="*.tsx" --include="*.ts" | grep -v "node_modules\|.git\|docs/"
```
Expected: no matches (these old dark values should all be gone).

- [ ] **Step 3: Scan for remaining hardcoded near-transparent whites used as dark backgrounds**

```bash
grep -rn "rgba(255,255,255,0\.0[2-6])" \
  app/ components/ \
  --include="*.tsx" | grep -v "node_modules\|.git"
```
Review any matches — if they're card backgrounds they should use `colors.surface`. If they're subtle shimmer/overlay effects, leave them.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: iOS 26 Settings aesthetic redesign complete — light/dark both modes"
```
