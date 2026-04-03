# Tweakly — iOS 26 Liquid Glass & Animation Overhaul

**Date:** 2026-04-03  
**Scope:** All screens — 5 main tabs + product detail + auth + settings + new Link Scanner screen  
**Style:** Apple iOS 26 cinematic, neutral glass (colorless/silver), green on active states only

---

## Goals

1. Every screen feels like a native iOS 26 app — liquid glass surfaces, specular highlights, caustic shimmer
2. Cinematic Apple-style entrances on every screen (FadeInDown spring, staggered lists)
3. Remove duplicate/dead screens and consolidate category views into one shared screen
4. Add a "Paste Link" / Link Scanner screen with mock UI for promo codes, price history, alerts, and affiliate buy CTA

---

## 1. Screen Consolidation (deletions)

| File to delete | Replaced by |
|---|---|
| `app/(tabs)/categorieen.tsx` | `app/categorieen.tsx` (shared) |
| `app/instellingen/categorieen.tsx` | Same shared screen |
| `app/categorie-wizard.tsx` | Same shared screen |

### Shared `app/categorieen.tsx`

Accepts a `mode` query param:
- `mode=browse` — shows category grid for browsing products (used from Prijzen tab)
- `mode=select` — shows category grid for picking a recommender category (used from Home/recommender flow)

Same component, same glass UI, different navigation target on press.

---

## 2. New Component: `LiquidScreen`

**File:** `components/liquid-screen.tsx`

Wraps every screen. Provides:
- OLED background (`#08080D`)
- Single slow-drifting radial gradient orb: `rgba(255,255,255,0.012)`, cycles between 3 anchor positions every 8s with `withRepeat(withTiming(..., {duration: 8000}))`. Extremely subtle — depth, not distraction.
- `FadeIn.springify().damping(20).stiffness(130)` on mount for the content area
- **No SafeAreaView** — screens handle their own insets so it looks edge-to-edge native in Expo Go

---

## 3. Animation System

### Page entrances
- Header / hero: `FadeInDown.springify().damping(20).stiffness(130)`
- List items: `FadeInDown.delay(index * 45).springify().damping(18).stiffness(110)`
- Stagger cap: index capped at 8 (max 360ms total delay) — items beyond index 8 get no delay

### Press interactions
- Cards / rows: `scale → 0.97` on pressIn, spring back on pressOut (`damping:15, stiffness:300`)
- CTA / buy buttons: `scale → 0.94` on pressIn, stronger spring back (`damping:12, stiffness:340`)
- Tab icons: existing bounce animation — no change

### Loading states
- Use existing `GlassShimmer` and `FeedLoading` consistently on all async screens
- Product cards show `GlassShimmer` while image loads

### Transitions
- Keep default Expo Router native iOS slide — already feels Apple-authentic

---

## 4. Glass Treatment Per Screen

### Home (`app/(tabs)/index.tsx`)
- Wrap in `LiquidScreen`
- Hero deal card: full lens anatomy already present — keep, ensure `GlassShimmer` is active
- Add "Link Scanner" entry pill below search bar: `🔗 Plak productlink` — small `ClearLiquidGlass` pill, navigates to `app/link-scanner.tsx`
- Category chips: wrap in `ClearLiquidGlass`
- Horizontal product scroll cards: `GlassShimmer` already on `ProductCard` — ensure it runs
- Section headers: `FadeInDown` stagger by section index

### Nieuws (`app/(tabs)/nieuws.tsx`)
- Wrap in `LiquidScreen`
- `GlassPageHeader` already present — keep
- `ArticleCard`: `ClearLiquidGlass` base + `GlassShimmer` (already has shimmer — verify wired)
- List stagger: `FadeInDown.delay(index * 45ms)`

### Reviews (`app/(tabs)/reviews.tsx`)
- Identical treatment to Nieuws (same component structure)

### Prijzen (`app/(tabs)/prijzen.tsx`)
- Wrap in `LiquidScreen`
- Category grid chips: `ClearLiquidGlass` + spring scale on press
- Product grid: stagger entrance, `GlassShimmer` already on cards
- Filter chips: `ClearLiquidGlass`

### Profiel / Instellingen (`app/(tabs)/profiel.tsx`)
- Wrap in `LiquidScreen`
- Settings groups: upgrade from plain `BlurView` to `ClearLiquidGlass` + specular rim
- Profile avatar: add lens blob overlay (pulsing `GlassShimmer` intensity=0.4)
- Toggle rows: spring scale feedback on press (`damping:18, stiffness:320`)
- Section labels: `FadeInDown` stagger

### Meldingen / Alerts (`app/(tabs)/meldingen.tsx`)
- Wrap in `LiquidScreen`
- Alert rows: `ClearLiquidGlass` card per row + `GlassShimmer`
- Progress bar: glass trough with animated green fill
- Stagger entrance on rows

### Bladwijzers (`app/(tabs)/bladwijzers.tsx` → hidden tab, access via Profiel)
- Wrap in `LiquidScreen`
- Bookmark cards: `ClearLiquidGlass` + `GlassShimmer`
- Stagger entrance

### Product Detail (`app/product/[id].tsx`)
- Wrap in `LiquidScreen`
- Hero image area: full caustic lens anatomy (already partially done — complete it)
- Shop price rows: `ClearLiquidGlass` per row
- Price history chart: glass card wrapper
- Buy CTA: full lens anatomy pill (caustic + specular + blob + inner shadow)
- Alert modal: glass modal with `ClearLiquidGlass`

### Auth screens (`app/(auth)/`)
- `inloggen`, `registreren`, `onboarding`, `profiel-instellen`, `telefoon`, `verificatie`, `verify`, `wachtwoord-vergeten`
- Each: `LiquidScreen` background, input fields get `ClearLiquidGlass` treatment, primary buttons get lens anatomy CTA style
- `onboarding.tsx`: hero section gets animated orb background (more prominent than default)

### Settings screens (`app/instellingen/`)
- `meldingen`, `prijsalerts`, `zoeken`, `bladwijzers`
- Each: `LiquidScreen`, settings groups → `ClearLiquidGlass`, same pattern as Profiel tab

### Legal / static (`app/cookies.tsx`, `app/privacy.tsx`, `app/terms.tsx`, `app/affiliate.tsx`)
- `LiquidScreen` background only, content is plain text — no heavy glass treatment needed

---

## 5. New Screen: Link Scanner (`app/link-scanner.tsx`)

### Entry point
- Glass pill on Home screen below search bar: `🔗 Plak productlink`
- Navigates to `app/link-scanner.tsx`

### Screen layout (mock UI — no real functionality)

**Header:** `GlassPageHeader` with title "Link Scanner", subtitle "Plak een productlink"

**Input area:**
- Full-width `ClearLiquidGlass` pill input
- Placeholder: "https://..."
- Paste icon (right side), clear button when filled
- On paste: shimmer animation plays → card below expands with spring (`withSpring`, damping:16, stiffness:200)

**Resolved product card:**
- `ClearLiquidGlass` card, full-width
- Mock product image (placeholder), product name, shop logo badge, detected price `€899`
- `GlassShimmer` on the card

**Promo codes section:**
- `ClearLiquidGlass` card
- Green badge "1 code gevonden"
- Masked code: `TWEAKLY••••` with a "Kopieer" copy button (glass pill)
- `FadeInDown` entrance after card resolves

**Price history chart:**
- Reuses `PriceHistoryChart` with mock data (12 months, realistic price curve)
- Wrapped in `ClearLiquidGlass` card

**Price alert row:**
- `ClearLiquidGlass` row: bell icon, "Stel prijsalert in", target price `TextInput`, `LiquidSwitch` toggle

**Buy CTA:**
- Full-width pill, green gradient (`#34C759 → #2AAF4F`)
- Full lens anatomy (caustic + specular + blob + inner shadow)
- Text: "Koop via Tweakly" + small "affiliate" badge (glass chip, right side)
- `scale → 0.94` press animation

---

## 6. Files Summary

### New files
- `components/liquid-screen.tsx` — shared screen wrapper
- `app/link-scanner.tsx` — Link Scanner screen
- `app/categorieen.tsx` — consolidated category screen (replaces 3 files)

### Modified files
- `app/(tabs)/index.tsx` — LiquidScreen + Link Scanner entry pill + stagger
- `app/(tabs)/nieuws.tsx` — LiquidScreen + stagger
- `app/(tabs)/reviews.tsx` — LiquidScreen + stagger
- `app/(tabs)/prijzen.tsx` — LiquidScreen + category glass + stagger
- `app/(tabs)/profiel.tsx` — LiquidScreen + ClearLiquidGlass groups + avatar lens
- `app/(tabs)/meldingen.tsx` — LiquidScreen + glass rows + progress
- `app/(tabs)/bladwijzers.tsx` — LiquidScreen + glass cards
- `app/product/[id].tsx` — LiquidScreen + complete lens anatomy + glass rows
- All `app/(auth)/*.tsx` — LiquidScreen + glass inputs + lens CTAs
- All `app/instellingen/*.tsx` — LiquidScreen + ClearLiquidGlass groups
- `app/cookies.tsx`, `app/privacy.tsx`, `app/terms.tsx`, `app/affiliate.tsx` — LiquidScreen bg only

### Deleted files
- `app/(tabs)/categorieen.tsx`
- `app/instellingen/categorieen.tsx`
- `app/categorie-wizard.tsx`

---

## 7. Constraints

- React Native / Expo SDK 54 — no web-only CSS
- `expo-blur` for `BlurView`, `expo-linear-gradient` for gradients
- `react-native-reanimated` v3 for all animations
- `expo-glass-effect` native glass disabled (causes crashes) — always use fallback path
- Respect `useReduceMotion()` — when reduce motion is on, skip entrance animations and shimmer pulses
- No `SafeAreaView` in `LiquidScreen` — edge-to-edge
