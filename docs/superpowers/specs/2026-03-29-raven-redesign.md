# Tweakly Landing — Raven Trading Redesign Spec

## Goal
Rebuild `docs/index.html` as a Raven Trading-style site: dark background, Tweakly green accent, scroll-snap full-screen sections, GSAP scramble text, Lenis smooth scroll. No Three.js. Dutch copy throughout.

## Sections (6 scroll-snap screens)

1. **Hero** — Scramble headline, rotating word animator, download CTA, sticky glass nav
2. **Product Link** — Paste product URL → promo codes shown + product added to database
3. **Functies** — 3 feature cards (Prijsalerts, Vergelijken, Reviews)
4. **Winkels** — Marquee: Amazon · Coolblue · Bol.com · Alternate · MediaMarkt
5. **Waarom Tweakly** — 3 values: Gratis / Betrouwbaar / Snel (minimal text layout)
6. **Download** — Full-width CTA + App Store / Google Play buttons

## Visual Language
- Background: `#000`
- Accent: `#30D158` (Tweakly green)
- Text: white / rgba(255,255,255,0.6) secondary
- Font: Inter or system-ui (no serif) — matches Raven's sans-serif feel
- Scroll-snap: `scroll-snap-type: y mandatory`, each section `scroll-snap-align: start; height: 100vh`
- Section indicator dots: right edge, active dot glows green
- Grain overlay: subtle SVG noise fixed on top

## Interactions
- GSAP + ScrambleText: headline animates on section enter, custom charset (digits + symbols)
- Lenis: smooth kinetic scroll, integrated with GSAP ticker
- Intersection Observer: triggers scramble when section enters viewport (50% threshold)
- Marquee: CSS `@keyframes` infinite loop, hover pauses
- Nav: glass pill, scrolled state darkens
- Product link input: hover/focus states, submit → shows mock promo result (static HTML, no backend)
- Mobile (≤800px): scroll-snap off, normal flow, all sections visible

## Content
- Hero headline: "Slimme prijsvergelijking" (scrambles in)
- Rotating word: Snel → Gratis → Betrouwbaar → Slim
- Hero sub: "Plak een productlink. Wij zoeken de beste prijs en kortingscodes voor je."
- Stats (section 2 label): 5 winkels
- Product link placeholder: "https://www.coolblue.nl/product/..."
- Promo result mock: shows badge "ZOMER10 — 10% korting" + "✓ Product toegevoegd"

## Files
- `docs/index.html` — full rewrite (single file, all CSS + JS inline)

## Out of Scope
- Backend for product link feature
- Real promo code API
- App store badge image assets (use text buttons as fallback)
