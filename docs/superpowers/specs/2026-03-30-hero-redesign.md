# Spec: Hero Redesign — Apple Cinematic, Centered Product Showcase

**Date:** 2026-03-30
**Scope:** `docs/index.html` — hero section only (`#hero` + background)

---

## Goal

Replace the current split-layout hero (text left, floating phone mockup right) with a centered, cinematic Apple-style hero. Pure black background, no atmospheric orbs, no grain. The phone screenshot and typography carry all the visual weight.

---

## Background

**Remove entirely:**
- `.atmo` element and all `.orb-*` styles
- `.grain` element and styles
- All `@keyframes orb-drift`

**Replace with:**
```css
body { background: #000000; }
```

No other background decoration.

---

## Hero Layout

Single centered column. `min-height: 100dvh`. Flex column, `align-items: center`, `justify-content: center`. `padding-top: 6rem` to clear the fixed nav.

Vertical order:
1. Badge
2. Headline (2 lines)
3. Subline
4. Phone mockup
5. CTA buttons
6. Scroll indicator (absolute bottom)

---

## Badge

Unchanged from current design:
- `★ NIEUW — VERSIE 2.0 BESCHIKBAAR`
- Green pill, `rgba(48,209,88,0.10)` bg, `0.5px` green border
- Entrance: `fade-up` 0.8s, delay `0.1s`

---

## Headline

```css
font-size: clamp(4.5rem, 12vw, 10rem);
font-weight: 900;
letter-spacing: -0.05em;
line-height: 0.88;
text-align: center;
margin-bottom: 1.2rem;
```

- Line 1: `"Altijd de"` — `color: #ffffff`
- Line 2: `"beste prijs."` — white-to-green gradient:
  ```css
  background: linear-gradient(130deg, #fff 30%, #30D158 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  ```

Entrance: `fade-up` 0.9s, delay `0.2s`.

---

## Subline

Single sentence, centered, replaces the current 3-sentence description:

> "Prijsvergelijking die werkt terwijl jij slaapt."

```css
font-size: 1rem;
color: rgba(255,255,255,0.50);
line-height: 1.6;
max-width: 420px;
text-align: center;
margin-bottom: 2.5rem;
```

Entrance: `fade-up` 0.9s, delay `0.35s`.

---

## Phone Mockup

### Shell iphone 17
```css
width: auto;
height: min(58vh, 320px);
aspect-ratio: 9/19;
border-radius: 36px;
border: 0.5px solid rgba(255,255,255,0.12);
background: rgba(255,255,255,0.03);
overflow: hidden;
transform: rotate(-8deg);
box-shadow:
  0 0 120px rgba(48,209,88,0.22),   /* green glow behind */
  0 40px 80px rgba(0,0,0,0.70);     /* depth shadow */
margin-bottom: 2.5rem;
```

### Screenshot inside

`<img src="v2-mobile-full.png">` — `width: 100%`, `height: 100%`, `object-fit: cover`, `object-position: top`.

### Animations

Float (continuous):
```css
@keyframes float {
  0%, 100% { transform: rotate(-8deg) translateY(0); }
  50%       { transform: rotate(-8deg) translateY(-14px); }
}
animation: float 6s ease-in-out infinite;
```

Entrance (once):
```css
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
animation: float 6s ease-in-out infinite, fade-in 1s ease 0.5s both;
```

Note: entrance is `fade-in` only (no translateY) — the phone just appears, not slides up.

---

## CTA Buttons

Horizontal flex row, centered, `gap: 10px`, `flex-wrap: wrap`.

- **Primary:** "⬇ Gratis downloaden" — `background: #30D158`, `color: #000`, pill, `box-shadow: 0 0 28px rgba(48,209,88,0.35)`
- **Ghost:** "Bekijk demo" — glass background `rgba(255,255,255,0.055)`, white text, `border: 0.5px solid rgba(255,255,255,0.09)`

Entrance: `fade-up` 0.9s, delay `0.65s`.

---

## Scroll Indicator

Position absolute, bottom `2rem`, left `50%`, `transform: translateX(-50%)`. Unchanged from current (SCROLL text + animated chevron). Entrance: `fade-up` 1s, delay `1s`.

---

## Entrance Animation Stagger Summary

| Element    | Animation | Duration | Delay |
|------------|-----------|----------|-------|
| Badge      | fade-up   | 0.8s     | 0.1s  |
| Headline   | fade-up   | 0.9s     | 0.2s  |
| Subline    | fade-up   | 0.9s     | 0.35s |
| Phone      | fade-in   | 1.0s     | 0.5s  |
| CTAs       | fade-up   | 0.9s     | 0.65s |
| Scroll     | fade-up   | 1.0s     | 1.0s  |

---

## What Does NOT Change

- Nav (floating pill, unchanged)
- Features section (`#features`)
- Prices section (`#prijzen`)
- All other sections below the fold
- Token values (colors, fonts)
- Glass mixin (`.glass`)
- Button styles (`.btn`, `.btn-primary`, `.btn-ghost`)
