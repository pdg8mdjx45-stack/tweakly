# iOS 26 Settings Aesthetic Redesign — Design Spec

**Datum:** 2026-04-05  
**Status:** Goedgekeurd

## Samenvatting

Tweakly volledig restylen naar de iOS 26 Settings-app esthetiek — voor zowel light als dark mode. Light mode wordt airy wit frosted glass op `#F2F2F7` base. Dark mode verschuift van near-black OLED (`#08080D`) naar iOS 26 donkergrijs (`#1C1C1E`). Beide modes krijgen: grouped card sections, grote bold titels, dunne separators, en liquid glass via `@callstack/liquid-glass` op iOS 26, Skia blur op Android, expo-blur fallback elders.

---

## 1. Design Tokens

### 1.1 Palette updates (`constants/theme.ts`)

**Dark mode Palette waarden vervangen:**

| Token | Oud | Nieuw |
|---|---|---|
| `dark1` | `#08080D` | `#1C1C1E` |
| `dark2` | `#121218` | `#2C2C2E` |
| `dark3` | `#1C1C24` | `#3A3A3C` |
| `dark4` | `#28283A` | `#48484A` |
| `dark5` | `#3C3C4A` | `#636366` |

**Light mode Palette — geen wijzigingen** (grey1–grey6, white, primary etc. ongewijzigd)

### 1.2 Colors map updates (`Colors.dark`)

| Token | Oud | Nieuw |
|---|---|---|
| `background` | `Palette.dark1` (`#08080D`) | `#1C1C1E` |
| `surface` | `Palette.dark2` (`#121218`) | `#2C2C2E` |
| `surfaceElevated` | `Palette.dark3` (`#1C1C24`) | `#3A3A3C` |
| `border` | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.10)` |
| `borderProminent` | `rgba(255,255,255,0.16)` | `rgba(255,255,255,0.18)` |
| `fill` | `rgba(120,120,128,0.24)` | `rgba(120,120,128,0.20)` |

**`Colors.light` — geen wijzigingen** (al correct voor iOS 26)

### 1.3 Glass token updates (`Glass`)

**`Glass.card` (dark):**
```ts
backgroundColor: 'rgba(44,44,46,0.85)'   // was rgba(255,255,255,0.06)
borderColor: 'rgba(255,255,255,0.10)'
```

**`Glass.liquid.dark`:**
```ts
backgroundColor: 'rgba(44,44,46,0.82)'   // was rgba(36,36,46,0.75)
borderColor: 'rgba(255,255,255,0.12)'
shadowOpacity: 0.45                        // was 0.50
shadowRadius: 28                           // was 32
```

**`Glass.liquid.light`:**
```ts
backgroundColor: 'rgba(255,255,255,0.72)' // was 0.58 — meer opaque/wit
borderColor: 'rgba(255,255,255,0.95)'
```

**`Glass.chrome.dark`:**
```ts
backgroundColor: 'rgba(28,28,30,0.90)'   // was rgba(26,26,34,0.82)
```

**`Glass.header.dark`:**
```ts
backgroundColor: 'rgba(28,28,30,0.92)'   // was rgba(8,8,14,0.85)
borderBottomColor: 'rgba(255,255,255,0.08)' // was 0.06
```

**`Glass.header.light`:**
```ts
backgroundColor: 'rgba(242,242,247,0.92)' // was 0.88 — iets meer opaque
```

**`Glass.tabBar.dark`:**
```ts
backgroundColor: 'rgba(28,28,30,0.90)'   // was rgba(16,16,22,0.90)
borderTopColor: 'rgba(255,255,255,0.09)' // was 0.07
```

**`Glass.modal.dark`:**
```ts
backgroundColor: 'rgba(28,28,30,0.97)'   // was rgba(26,26,34,0.97)
```

**`Glass.glassmorphic.dark`:**
```ts
backgroundColor: 'rgba(28,28,30,0.72)'   // was rgba(20,20,28,0.70)
```

**`Glass.thin.dark`:**
```ts
backgroundColor: 'rgba(255,255,255,0.07)' // was 0.06
```

---

## 2. Component Updates

### 2.1 `GlassBlur`

**Light mode tint** (default `resolvedTint` wanneer `!isDark`):
- Van: `'rgba(255,255,255,0.52)'`
- Naar: `'rgba(255,255,255,0.72)'`

**Light mode blur intensity:**
- Van: `72`
- Naar: `80`

**Dark mode tint** (default wanneer `isDark`):
- Van: `'rgba(10,10,18,0.42)'`
- Naar: `'rgba(28,28,30,0.52)'`

**Dark mode blur intensity:**
- Van: `58`
- Naar: `62`

**`AndroidGlassBlur` — dark tintColor:**
- Fallback solid: `rgba(28,28,30,0.72)` (was `rgba(10,10,18,0.xx)`)

### 2.2 `ClearLiquidGlass`

**Light mode tint:**
- Van: `'rgba(255,255,255,0.18)'`
- Naar: `'rgba(255,255,255,0.32)'`

**Dark mode tint:**
- Van: `'rgba(255,255,255,0.03)'`
- Naar: `'rgba(44,44,46,0.45)'`

### 2.3 `GlassPageHeader`

**Light mode GlassBlur tint:**
- Van: `'rgba(255,255,255,0.50)'`
- Naar: `'rgba(255,255,255,0.78)'`

**Dark mode GlassBlur tint:**
- Van: `'rgba(255,255,255,0.03)'`
- Naar: `'rgba(28,28,30,0.60)'`

### 2.4 `FloatingTabBar`

**`GLASS.dark` token updates:**
- `barTint`: `'rgba(28,28,30,0.88)'` (was `'rgba(10,10,18,0.52)'`)
- `barSpecTop`: `'rgba(255,255,255,0.10)'` (was `0.14`)
- `barEdgeTop`: `'rgba(255,255,255,0.14)'` (was `0.18`)
- `pillFill`: `'rgba(255,255,255,0.08)'` (was `0.09`)
- `barBorder`: `'rgba(255,255,255,0.10)'` (was `0.12`)

**`GLASS.light` — ongewijzigd** (al correct)

### 2.5 `ProductCard`

**Light mode card achtergrond** (inline `backgroundColor`):
- Gebruik `colors.surface` (`#FFFFFF`) + `colors.border` (`rgba(0,0,0,0.06)`) als borderColor
- Verwijder eventuele handmatige dark-tinted achtergronden in light mode

**Dark mode card:**
- `colors.surface` (`#2C2C2E`) + `colors.border` (`rgba(255,255,255,0.10)`)

### 2.6 `ArticleCard`

Zelfde patroon als ProductCard: `colors.surface` + `colors.border` voor beide modes.

### 2.7 `LiquidButton`

**Light mode label kleur** (al correct: `'#1A1A1A'`): ongewijzigd  
**Dark mode label kleur** (al correct: `'#F2F2F7'`): ongewijzigd  
Glass tint erft van `ClearLiquidGlass` (zie 2.2).

### 2.8 `LiquidSwitch`

ON state kleur: `Palette.primaryVivid` (`#34C759`) — behouden  
Track achtergrond dark: update naar `rgba(44,44,46,0.90)`

---

## 3. Screen Layout — Grouped Sections Pattern

### 3.1 Structuur (geldt voor alle schermen)

Elk scherm volgt dit patroon:

```
[SafeAreaView]
  [GlassPageHeader title="..." subtitle="..."]
  [ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}]
    [SectionLabel text="SECTIE NAAM"]        ← 13px uppercase grijs
    [GroupedCard]                            ← wit/#2C2C2E, radius 16, border
      [Row] [Separator] [Row] [Separator] [Row]
    [SectionLabel text="VOLGENDE SECTIE"]
    [GroupedCard]
      ...
```

### 3.2 `GroupedCard` stijl

```ts
{
  backgroundColor: colors.surface,          // #FFFFFF / #2C2C2E
  borderRadius: Radius.lg,                  // 16
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.border,               // rgba(0,0,0,0.06) / rgba(255,255,255,0.10)
  overflow: 'hidden',
  ...Shadow.sm,
}
```

### 3.3 Row separator

```ts
{
  height: StyleSheet.hairlineWidth,
  backgroundColor: colors.border,
  marginLeft: 16,                           // inset, niet full-width
}
```

### 3.4 Section label

```ts
{
  fontSize: 13,
  fontWeight: '400',
  color: colors.textTertiary,              // #6C6C70
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginLeft: 16,
  marginBottom: 8,
}
```

### 3.5 Accentkleur gebruik

Brand groen (`#34C759`) uitsluitend voor:
- Actief tab-icoon
- Prijs-dalings badge (`-X%`)
- Primaire CTA knop
- Toggle ON state
- Prijs omlaag indicator

Alle andere interactieve elementen: `Colors.light/dark.text` of secundaire gray.

---

## 4. Screen-by-screen scope

Alle volgende schermen worden bijgewerkt:

**Tabs:**
- `app/(tabs)/index.tsx` — home hero card, categorieën chips, product carousels
- `app/(tabs)/nieuws.tsx` — artikel lijst
- `app/(tabs)/reviews.tsx` — reviews lijst
- `app/(tabs)/prijzen.tsx` — product grid, category chips
- `app/(tabs)/profiel.tsx` — grouped settings rows
- `app/(tabs)/bladwijzers.tsx`
- `app/(tabs)/zoeken.tsx`

**Product/artikel:**
- `app/product/[id].tsx`
- `app/artikel/[id].tsx`
- `app/vergelijk.tsx`
- `app/link-scanner.tsx`
- `app/categorieen.tsx`
- `app/recommender/index.tsx`
- `app/pc-builder.tsx`

**Instellingen:**
- `app/instellingen/bladwijzers.tsx`
- `app/instellingen/prijsalerts.tsx`
- `app/instellingen/zoeken.tsx`
- `app/instellingen/meldingen.tsx`

**Auth:**
- `app/(auth)/inloggen.tsx`
- `app/(auth)/registreren.tsx`
- `app/(auth)/profiel-instellen.tsx`
- `app/(auth)/wachtwoord-vergeten.tsx`
- `app/(auth)/telefoon.tsx`
- `app/(auth)/onboarding.tsx`

**Juridisch:**
- `app/cookies.tsx`
- `app/privacy.tsx`
- `app/terms.tsx`
- `app/affiliate.tsx`

---

## 5. Wat NIET verandert

- Routing, navigatiestructuur, tab-namen
- Data/services laag (product-db, alerts-store, etc.)
- `FloatingTabBar` gedrag (pill animatie, pan gesture, haptics)
- `GlassPageHeader` structuur (alleen kleurtokens)
- Font sizes en spacing scale (Spacing, Radius, Fonts — ongewijzigd)
- `@callstack/liquid-glass` integratie op iOS 26 (blijft)
- Skia `BackdropBlur` op Android (blijft)
- expo-blur fallback (blijft)

---

## 6. Implementatievolgorde

1. **`constants/theme.ts`** — alle token updates (Palette, Colors, Glass)
2. **`components/glass-blur.tsx`** — tint + intensity updates
3. **`components/clear-liquid-glass.tsx`** — tint updates
4. **`components/glass-page-header.tsx`** — tint updates
5. **`components/floating-tab-bar.tsx`** — GLASS.dark token updates
6. **`components/product-card.tsx`** + **`components/article-card.tsx`** — surface/border
7. **Tab screens** (index, nieuws, reviews, prijzen, profiel, bladwijzers, zoeken)
8. **Product/artikel screens**
9. **Instellingen screens**
10. **Auth screens**
11. **Juridisch screens**
