# Full App Redesign — iOS 26 Liquid Glass Design System
**Date:** 2026-04-07  
**Status:** Approved

---

## Overview

Surgical redesign of the Tweakly app applying a clean iOS 26 / iOS 18 glassmorphism design language. The codebase already has the right structural primitives (GlassCard, FloatingTabBar, BackButton, LiquidScreen, theme tokens). The work is targeted changes to visual surface — no logic, data flow, or navigation architecture changes.

---

## 1. Accent Color: Dark Green → Light Green

**Current:** `Palette.primary = '#1A3A20'` is used as the primary accent throughout.  
**Target:** Switch the role of accent to `Palette.primaryVivid = '#34C759'` (iOS system green).

### Changes:
- In `constants/theme.ts`: Update `Colors.light.tint` and `Colors.light.tabIconSelected` from `Palette.primary` to `Palette.primaryVivid`. Keep `Palette.primary` (dark green) as the tab pill and text color where it's used for brand identity (section labels, icon wraps in settings).
- The `LiquidSwitch` on-color is already `rgb(52,199,89)` — matches `#34C759`. No change needed.
- Buttons throughout the app that use `Palette.primary` as `backgroundColor` for CTA pills (shop "Bekijk" buttons, filter reset, etc.) should be updated to `Palette.primaryVivid`.
- `GlassCard` hairline border `borderColor` stays `rgba(0,0,0,0.06)` — no change.
- Profile screen `iconWrap` and nav icon colors that explicitly use `Palette.primary` should stay dark green — it's intentional brand coloring for icon backgrounds, not accent.
- Article category pill backgrounds: currently `Palette.primary` for light mode → change to `Palette.primaryVivid`.

**Scope:** Only swap `Palette.primary` → `Palette.primaryVivid` in contexts that are accent/CTA/active-state. Keep dark green where it's used as brand color for containers/backgrounds.

---

## 2. Tab Bar: Dark Green Pill → Frosted Light Pill

**Current:** `PILL_COLOR = Palette.primary` (`#1A3A20`) — dark green sliding pill. Tab bar wrapper is transparent.  
**Target:** Frosted light gray pill background for the entire bar container + lighter active indicator.

### Changes in `components/floating-tab-bar.tsx`:
- Add a `View` wrapper behind the icon row with:
  - `backgroundColor: 'rgba(242,242,247,0.88)'` (iOS grouped background at 88%)
  - `borderRadius: 34` (pill-shaped)
  - Shadow: `shadowColor: '#000', shadowOffset: {width:0, height:8}, shadowOpacity: 0.09, shadowRadius: 24`
  - Secondary shadow via `elevation: 12` on Android
  - On iOS: wrap with `BlurView` (intensity 20, tint 'light') behind the background layer
- Change `PILL_COLOR` from `Palette.primary` to `Palette.primaryVivid` (`#34C759`)
- Change `COL_ACTIVE` from `'#FFFFFF'` (white on dark) to `'#FFFFFF'` — stays white (green pill is light enough, white icon visible)
- Change `COL_IDLE_L` from `'rgba(0,0,0,0.35)'` to `'rgba(0,0,0,0.40)'` — keep readable on light background
- The wrapper `View` currently has no background — add the frosted pill shell around the entire `BAR_H`-tall container
- Keep all spring physics, PanResponder, haptics, and layout logic unchanged

---

## 3. Charts: Full-Width + Cinematic Styling

**Current:** `chartWidth = (screenWidth - 32) * 0.85` — only 85% wide, left-aligned.  
**Target:** Full container width with proper padding, gradient fill, cinematic presentation.

### Changes in `components/charts/price-history-chart.tsx`:
- `chartWidth = screenWidth - Spacing.md * 2` — full width minus 32pt margins
- `height`: increase from `180` to `220` for better golden ratio feel
- Chart line color: change from `Palette.primary` (#1A3A20) to `Palette.primaryVivid` (#34C759)
- `chartConfig.color`: change to `(opacity) => \`rgba(52,199,89,${opacity})\`` for the line and gradient fill
- `chartConfig.labelColor`: keep legible gray `(opacity) => \`rgba(142,142,147,${opacity})\``
- `chartConfig.propsForBackgroundLines`: keep as-is (light dashes)
- `chartContainer` style: change `alignSelf: 'flex-end'` to `alignSelf: 'stretch'` so it fills width
- Add `fillShadowGradient: Palette.primaryVivid` and `fillShadowGradientOpacity: 0.18` to chartConfig for the gradient fill under the line
- Wrap chart in a container with `overflow: 'hidden'` and `borderRadius: Radius.md` for cinematic clipping
- `paddingLeft` in chartConfig: reduce from 50 to 40 to reclaim space

---

## 4. Link Button Contrast Fix

**Current:** `googleShoppingButton` has `borderColor: Palette.grey4` and text `colors.tint` (which was dark green = readable). The shop row "Bekijk" CTA uses `Palette.primary` (dark green) fill — actually fine.  
**Target:** Ensure both buttons have clear contrast with updated accent color.

### Changes in `app/product/[id].tsx`:
- `googleShoppingButton` text color: change from `colors.tint` to `Palette.primaryVivid` — ensures consistent accent green
- `googleShoppingButton` border: add `backgroundColor: 'rgba(52,199,89,0.06)'` for a subtle tinted background so the button reads as interactive
- Shop row "Bekijk" button: change `backgroundColor: Palette.primary` → `Palette.primaryVivid` — lighter, more modern green

---

## 5. Scroll-Aware Navigation Header

**Current:** Detail screens (`artikel/[id].tsx`, `product/[id].tsx`) use `BackButton` (floating pill) with `StatusBar hidden`. No blur-on-scroll behavior.  
**Target:** When scroll offset > 0, a blur header fades in behind the back button with the page title.

### New component: `components/scroll-aware-header.tsx`
A small component that:
- Takes `title: string`, `scrollY: SharedValue<number>`, `insetTop: number`
- Renders an `Animated.View` positioned absolutely at top-0, full-width, height = insetTop + 52
- Background: `BlurView` (intensity animated 0→24 based on scrollY) + `rgba(255,255,255,0)` → `rgba(255,255,255,0.85)` tint
- Title `Text`: animates opacity 0→1 and translateY 4→0 when scrollY > 20
- Threshold: blur and title start appearing at scrollY=1, fully visible at scrollY=40
- `BackButton` continues to render on top (zIndex 100) unchanged

### Changes in `app/artikel/[id].tsx`:
- Convert `ScrollView` to use `onScroll` + `scrollEventThrottle={16}` feeding a `useSharedValue`
- Add `<ScrollAwareHeader>` positioned above the scroll view
- Remove `StatusBar hidden` (let it be managed by the screen)

### Changes in `app/product/[id].tsx`:
- Same pattern: add scrollY SharedValue, wire to ScrollView, add `<ScrollAwareHeader>`

---

## 6. Profile Picture: Verify No Effects

**Current:** Profile screen uses `View` with `backgroundColor: Palette.primary` + initials text (no actual photo). No photo/avatar components apply effects.  
No changes needed — initials avatar is already clean.

---

## 7. Button Style: Pill Shape + Shadow

All primary CTA buttons should have:
- `borderRadius: 999` (pill)
- `paddingVertical: 14, paddingHorizontal: 28`
- Shadow: `shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: {width:0, height:4}`
- Press animation: scale 0.96 (already done in most places with spring)

This applies to:
- Auth screens (inloggen, registreren) — primary buttons
- Product screen "Bekijk" shop buttons — already pill-shaped via `borderRadius: 8`, update to `borderRadius: 999`
- Modal buttons

---

## 8. Back Buttons: Already Correct

`BackButton` is already a 40×40 circular `GlassCard` with `radius={999}` and a `chevron.left` icon. No changes needed.

---

## Implementation Files

| File | Change |
|------|--------|
| `constants/theme.ts` | Update `Colors.light.tint` + `Colors.light.tabIconSelected` to `primaryVivid` |
| `components/floating-tab-bar.tsx` | Frosted pill container, lighter pill color `#34C759` |
| `components/charts/price-history-chart.tsx` | Full-width, gradient fill, green accent |
| `app/product/[id].tsx` | Link button colors, scroll-aware header, CTA button colors |
| `app/artikel/[id].tsx` | Scroll-aware header |
| `components/scroll-aware-header.tsx` | New component |
| `app/(auth)/inloggen.tsx` | Pill shape + shadow on primary button |
| `app/(auth)/registreren.tsx` | Pill shape + shadow on primary button |

**Screens NOT changing:** All data logic, RSS feeds, alerts, navigation, auth flow, product DB, article store — zero changes.

---

## What Is NOT Changing

- All navigation structure and routing
- All data fetching, RSS, Supabase, Icecat integration
- LiquidScreen blob animations
- GlassCard component (already correct)
- BackButton component (already correct)
- All hooks, services, providers
- Dark mode support (all changes are additive/dual-mode)
- Tab structure and hidden tabs
- Spring physics in FloatingTabBar
