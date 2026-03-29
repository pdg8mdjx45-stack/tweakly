# Tweakly Landing Page — 3D Desk Scene Redesign

**Date:** 2026-03-29
**Status:** Approved
**Language:** English

---

## Overview

Replace `docs/index.html` entirely with a cinematic, premium landing page built around an interactive 3D desk scene. As the user scrolls, the camera performs a pre-defined dolly path through the scene, stopping at key objects (monitor, keyboard, phone, full desk) with glass UI cards fading in at each stop. Below the 3D scroll experience, remaining sections free-scroll with Intersection Observer animations.

---

## Architecture & Tech Stack

- **File:** `docs/index.html` — single file, inline CSS + JS, no build step
- **Three.js r160** via CDN — 3D scene, geometry, materials, lighting, camera
- **GSAP + ScrollTrigger** via CDN — scroll-driven camera animation, loading sequence, text reveals
- **No external .glb files** — all geometry is procedural Three.js primitives
- **Deployment:** Cloudflare Pages (static, no functions)

### Scroll Architecture

1. `#scene-scroll-driver` — a `500vh` tall invisible div that sits in normal document flow
2. Three.js `<canvas>` is `position: fixed`, full-viewport, always rendering
3. GSAP ScrollTrigger pins/watches `#scene-scroll-driver`, maps scroll progress `0→1` to camera keyframe index
4. Below `#scene-scroll-driver`, normal sections free-scroll with IO-triggered animations
5. Nav and footer exist in normal flow above/below the pinned canvas

---

## Visual Identity & Color System

### Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--green` | `#2d6a2d` | Primary accent — CTAs, borders, glows, active states |
| `--green-dim` | `rgba(45,106,45,0.12)` | Badge backgrounds, subtle highlights |
| `--green-glow` | `rgba(45,106,45,0.35)` | Box shadows, text glow |
| `--bg` | `#000000` | Page background |
| `--text` | `#ffffff` | Primary text |
| `--text-2` | `rgba(255,255,255,0.55)` | Secondary text, descriptions |
| `--text-3` | `rgba(255,255,255,0.25)` | Tertiary text, placeholders |
| `--glass-bg` | `rgba(255,255,255,0.05)` | Glass card backgrounds |
| `--glass-bd` | `rgba(255,255,255,0.10)` | Glass card borders |

### Typography

- **Font:** Inter (Google Fonts, weights 300/400/500/600/700)
- **Hero title:** `clamp(3.6rem, 11vw, 9.5rem)`, weight 700, letter-spacing `-0.04em`
- **Gradient text:** `linear-gradient(135deg, #ffffff 0%, #4a9a4a 100%)`, `-webkit-background-clip: text`
- **Text glow:** `text-shadow: 0 0 40px rgba(45,106,45,0.4)` on hero title only
- **Section titles:** `clamp(2.4rem, 5vw, 4.8rem)`, weight 700

### Glass Cards

All section cards share `.glass-card`:
- `background: var(--glass-bg)`
- `backdrop-filter: blur(40px) saturate(180%)`
- `border: 0.5px solid var(--glass-bd)`
- `border-radius: 20px`
- `box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.5)`
- Hover: animated conic-gradient rotating border, green glow `0 0 30px rgba(45,106,45,0.2)`
- 3D tilt: `mousemove` → `rotateX/Y` ±8deg, `perspective: 1000px`
- Spring back: `transition: transform 0.5s cubic-bezier(0.34,1.3,0.64,1)`
- Click: water ripple overlay (expanding circle, 600ms fade-out)

### Custom Cursor

- 40px circle, `border: 1px solid rgba(45,106,45,0.6)`, `mix-blend-mode: difference`
- Scales to 60px on hoverable elements (`a`, `button`, `.glass-card`)
- Follows mouse with 8-frame lerp for smooth lag
- Hidden on touch devices

### Noise Grain

- Fixed overlay, `opacity: 0.018`, SVG fractalNoise, `z-index: 9999`, `pointer-events: none`

---

## Three.js Scene

### Scene Objects (all procedural)

| Object | Geometry | Material |
|--------|----------|----------|
| Desk surface | `BoxGeometry(4, 0.06, 1.8)` | MeshStandardMaterial, `#5c3a1e`, roughness 0.8, metalness 0.1 |
| Monitor shelf | `BoxGeometry(2.8, 0.04, 0.5)` | Same walnut material, raised +0.2 |
| Monitor bezel | `BoxGeometry(2.2, 1.1, 0.06)` | MeshStandardMaterial, `#111111`, roughness 0.3 |
| Monitor screen | `PlaneGeometry(2.1, 0.95)` | MeshStandardMaterial, emissive `#0a1a0a`, emissiveIntensity 0.6 |
| PC tower | `BoxGeometry(0.4, 1.1, 0.55)` | MeshStandardMaterial, `#0a0a0a` |
| PC glass panel | `PlaneGeometry(0.38, 1.08)` | MeshPhysicalMaterial, transmission 0.85, roughness 0.05 |
| Fan rings (×3) | `TorusGeometry(0.08, 0.015, 8, 24)` | MeshStandardMaterial, `#222222` |
| Keyboard | `BoxGeometry(0.65, 0.025, 0.22)` | MeshStandardMaterial, `#1a1a1a`, roughness 0.6 |
| Wrist rest | `BoxGeometry(0.65, 0.015, 0.08)` | MeshStandardMaterial, `#5c3a1e`, roughness 0.9 |
| Mouse | `BoxGeometry(0.07, 0.03, 0.12)` | MeshStandardMaterial, `#111111`, roughness 0.4 |
| Mousepad | `BoxGeometry(0.55, 0.008, 0.32)` | MeshStandardMaterial, `#0d0d0d`, roughness 0.95 |
| Phone | `BoxGeometry(0.075, 0.008, 0.16)` | MeshStandardMaterial, `#111111`, roughness 0.2, metalness 0.5 |
| Charging dock | `CylinderGeometry(0.055, 0.06, 0.015, 32)` | MeshStandardMaterial, `#222222` |
| Mic arm | `CylinderGeometry(0.008, 0.008, 0.8, 8)` | MeshStandardMaterial, `#111111` |
| Mic head | `SphereGeometry(0.045, 16, 12)` | MeshStandardMaterial, `#0a0a0a` |
| Speakers (×2) | `SphereGeometry(0.06, 16, 12)` | MeshStandardMaterial, `#111111` |
| LED strip | `BoxGeometry(2.2, 0.01, 0.02)` | MeshStandardMaterial, emissive `#2d6a2d`, emissiveIntensity 0.8 |

### Lighting

| Light | Type | Color | Intensity | Position |
|-------|------|-------|-----------|----------|
| Key light | PointLight | `#ffaa55` (warm amber) | 1.5 | (-1.5, 1.8, 0.8) |
| Monitor backlight | RectAreaLight | `#aaccff` (cool blue) | 0.8 | (0, 0.8, -0.5) |
| Ambient | AmbientLight | `#111111` | 0.4 | — |
| Fill | DirectionalLight | `#ffffff` | 0.3 | (2, 3, 2) |

Shadows enabled: `renderer.shadowMap.enabled = true`, `PCFSoftShadowMap`. Desk and floor receive shadows.

### Camera Keyframes

```js
const keyframes = [
  // 0 — Hero: full desk overview
  { pos: new THREE.Vector3(0, 1.8, 3.2),   target: new THREE.Vector3(0, 0.3, 0) },
  // 1 — Features: monitor close-up
  { pos: new THREE.Vector3(-0.3, 0.9, 1.4), target: new THREE.Vector3(0, 0.6, 0) },
  // 2 — How It Works: keyboard
  { pos: new THREE.Vector3(0.1, 0.5, 0.9),  target: new THREE.Vector3(0.1, 0.35, 0.1) },
  // 3 — Mobile: phone on dock
  { pos: new THREE.Vector3(0.6, 0.6, 1.0),  target: new THREE.Vector3(0.45, 0.32, 0) },
  // 4 — Shops: wide overhead
  { pos: new THREE.Vector3(0, 2.5, 2.0),    target: new THREE.Vector3(0, 0.3, 0) },
  // 5 — CTA: final dramatic pull-back
  { pos: new THREE.Vector3(0, 1.4, 3.8),    target: new THREE.Vector3(0, 0.4, 0) },
];
```

GSAP ScrollTrigger maps scroll progress `0→1` across `#scene-scroll-driver` (500vh). At each keyframe boundary, the paired glass card fades in. Camera position and lookAt lerp via `THREE.Vector3.lerp()` each frame using a smoothing factor of `0.06`.

### Performance

- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`
- Mobile (`< 768px`): shadows disabled, geometry segments halved, LED strip emissive intensity reduced
- `document.addEventListener('visibilitychange')` — pause RAF when tab hidden

---

## Loading Sequence

1. Black overlay (`#loader`) covers page
2. "Tweakly" wordmark fades in (green, 0.4s)
3. Three.js scene loads in background
4. On scene ready: wordmark holds 0.3s → overlay fades out + scales up (0.5s)
5. Camera starts far back in darkness
6. Lights fade on (1.2s GSAP tween)
7. Hero text: letters reveal staggered (`opacity 0→1` + `translateY 20px→0`, 60ms per letter)
8. Tagline: typewriter effect (30ms per character)
9. CTA button: scale spring in (`scale 0.8→1`, cubic-bezier spring)

---

## Section Content

### Hero (camera stop 0 — full desk)
- Badge: "● Now in Beta"
- Title: "Tweakly" (letter-by-letter reveal, gradient white→green)
- Subtitle: typewriter effect reveals "Smart price comparison. Always the best deal."
- Buttons: "Get Early Access" (dark green, glow pulse), "Learn More" (ghost glass)

### Features (camera stop 1 — monitor)
- Glass card floats right of monitor
- Title: "Everything you need"
- 3 feature items with icons:
  - Price Tracking — monitor price history across 10+ stores
  - Instant Alerts — get notified the moment prices drop
  - One-tap Compare — paste a link, see every price side by side

### How It Works (camera stop 2 — keyboard)
- Glass card floats above keyboard
- Title: "Three steps. That's it."
- Steps:
  1. Search a product
  2. We scan 10+ stores
  3. You save money
- Connected by animated flowing dots between steps

### Mobile (camera stop 3 — phone)
- Glass card beside phone
- Title: "Always in your pocket"
- Subtitle: "Tweakly on iOS & Android. Coming soon."
- App Store + Google Play badges (ghost glass style, "Coming Soon" state)

### Shops (camera stop 4 — wide overhead)
- Glass card center-bottom
- Title: "10 stores. One search."
- Animated marquee of store names: Bol.com · Coolblue · MediaMarkt · Amazon · Alternate · Azerty · Paradigit · Belsimpel · Mobiel.nl · Centralpoint

### CTA (camera stop 5 — final pull-back)
- Large centered glass card
- Title: "Get early access"
- Subtitle: "Be among the first to try Tweakly."
- Email input + "Request Access" button (dark green, breathing pulse animation)
- Below: "iOS & Android · Free · No spam"

---

## Post-Scene Sections (free scroll)

Below `#scene-scroll-driver`, these sections use normal document flow with IO reveal animations:

None — the 6 camera stops cover all content. The scene driver is immediately followed by the footer.

---

## Nav Bar

- Glass pill, fixed top, `max-width: 52rem`, centered
- Logo (Tweakly wordmark, dark green) + links: Features, How It Works, Download
- Right: "Get Early Access" CTA button (dark green, `#000` text)
- On scroll: `background` transitions to `rgba(0,0,0,0.75)`
- Mobile: hamburger menu, links stack in dropdown glass panel

---

## Footer

Minimal glass bar:
- Left: "© 2026 Alexander Ballet"
- Center: links — Over ons · Contact · Affiliate · Privacy · Voorwaarden · Cookies
- Right: App Store + Google Play icons (ghost style)

All existing legal/affiliate links preserved.

---

## Micro-interactions Summary

| Element | Interaction |
|---------|-------------|
| Buttons | Ripple on click, glow on hover, scale spring |
| Glass cards | 3D tilt on mousemove, water ripple on click, green glow on hover |
| Nav links | Underline slide animation |
| Custom cursor | 40px circle, scales on hover, lerp lag |
| CTA button | Breathing pulse `box-shadow` animation |
| Store badges | Hover lift + border highlight |
| Email input | Green border glow on focus, ripple on submit button click |

---

## Reduced Motion

`@media (prefers-reduced-motion: reduce)`:
- All CSS animations/transitions disabled
- Camera jumps instantly to keyframe (no lerp)
- No typewriter, no letter-by-letter reveal
- Loader skipped entirely

---

## Responsive

- Mobile `< 768px`: 3D scene still renders but shadows off, reduced geometry detail
- Camera path adjusted for portrait viewport (slightly higher, less lateral movement)
- Glass cards stack below the canvas as normal-flow divs on mobile (fixed overlay removed, each card scrolls into view with IO reveal)
- Custom cursor hidden on touch devices
- Grain opacity reduced to `0.010` on mobile for performance
