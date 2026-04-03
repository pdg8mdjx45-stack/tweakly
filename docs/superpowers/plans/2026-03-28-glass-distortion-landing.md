# Glass Distortion Landing Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply SVG chromatic-aberration displacement filters + premium frontend-design upgrades to `docs/index.html` so every glass surface (nav, cards, bento cells, buttons, marquee pills, download buttons, cookie bar) uses the `GlassSurface` distortion system, and a sticky scroll pill floats over the full-page sections — making the site feel like a $50,000 product.

**Architecture:** All changes are confined to `docs/index.html` (vanilla HTML/CSS/JS, no build step). A `createGlassFilter(id, opts)` helper injects unique SVG `<defs>` filters into a shared `<svg>` sprite at the top of `<body>`. Each glass element gets `backdrop-filter: url(#id)` via an inline CSS variable. A `GlassSurface.css`-equivalent is merged into the existing `<style>` block. A sticky pill is added using `position:sticky; height:0; overflow:visible` so it floats without affecting layout.

**Tech Stack:** Vanilla HTML5, CSS3, ES5-compatible JS (no build, no CDN additions). SVG `feDisplacementMap` + `feColorMatrix` + `feBlend` for chromatic aberration. ResizeObserver for live displacement map updates. Chromium-only effect; non-Chromium browsers fall back to existing blur-only glass silently.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `docs/index.html` | Modify | All CSS, HTML, JS changes — single file |

---

## Task 1: Add the glass filter infrastructure (CSS + SVG sprite + JS helper)

**Files:**
- Modify: `docs/index.html` — `<style>` block + opening `<body>` tag + bottom `<script>` block

### What to add

**A) Inside `<style>` block, after the last existing rule (before `</style>`):**

```css
/* ═══════════════════════════════════════════════
   SVG GLASS DISTORTION — Chromatic Aberration
   Chromium only; non-Chromium falls back to existing blur silently.
═══════════════════════════════════════════════ */
.gf-svg-sprite {
  position: absolute;
  width: 0; height: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Applied to any element that gets the SVG filter */
.gf {
  --gf-id: none;
  backdrop-filter: url(var(--gf-id)) saturate(var(--gf-sat, 1.2));
  -webkit-backdrop-filter: url(var(--gf-id)) saturate(var(--gf-sat, 1.2));
}
```

**B) First child of `<body>` — SVG sprite container:**

```html
<svg class="gf-svg-sprite" id="gf-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs id="gf-defs"></defs>
</svg>
```

**C) In the bottom `<script>` block, at the very top inside the IIFE (before the WebGL shader code), add the glass filter factory:**

```js
// ── SVG Glass Distortion Factory ────────────────────────────────────────
var gfDefs = document.getElementById('gf-defs');
var gfCounter = 0;

function createGlassFilter(el, opts) {
  var id = 'gf-' + (++gfCounter);
  var w = el.offsetWidth || 200;
  var h = el.offsetHeight || 60;
  var br = opts.borderRadius != null ? opts.borderRadius : 16;
  var bw = opts.borderWidth != null ? opts.borderWidth : 0.07;
  var brightness = opts.brightness != null ? opts.brightness : 50;
  var opacity = opts.opacity != null ? opts.opacity : 0.93;
  var blur = opts.blur != null ? opts.blur : 11;
  var ds = opts.distortionScale != null ? opts.distortionScale : -120;
  var ro = opts.redOffset != null ? opts.redOffset : 0;
  var go = opts.greenOffset != null ? opts.greenOffset : 10;
  var bo = opts.blueOffset != null ? opts.blueOffset : 20;
  var xCh = opts.xChannel || 'R';
  var yCh = opts.yChannel || 'G';
  var blend = opts.mixBlendMode || 'difference';
  var displace = opts.displace != null ? opts.displace : 0.7;

  function buildMap() {
    var ew = el.offsetWidth || w;
    var eh = el.offsetHeight || h;
    var edge = Math.min(ew, eh) * bw * 0.5;
    var rgId = id + '-rg';
    var bgId = id + '-bg';
    var s = '<svg viewBox="0 0 ' + ew + ' ' + eh + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<defs>';
    s += '<linearGradient id="' + rgId + '" x1="100%" y1="0%" x2="0%" y2="0%">';
    s += '<stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="red"/>';
    s += '</linearGradient>';
    s += '<linearGradient id="' + bgId + '" x1="0%" y1="0%" x2="0%" y2="100%">';
    s += '<stop offset="0%" stop-color="#0000"/><stop offset="100%" stop-color="blue"/>';
    s += '</linearGradient></defs>';
    s += '<rect width="' + ew + '" height="' + eh + '" fill="black"/>';
    s += '<rect width="' + ew + '" height="' + eh + '" rx="' + br + '" fill="url(#' + rgId + ')"/>';
    s += '<rect width="' + ew + '" height="' + eh + '" rx="' + br + '" fill="url(#' + bgId + ')" style="mix-blend-mode:' + blend + '"/>';
    s += '<rect x="' + edge + '" y="' + edge + '" width="' + (ew - edge*2) + '" height="' + (eh - edge*2) + '" rx="' + br + '" fill="hsl(0 0% ' + brightness + '% / ' + opacity + ')" style="filter:blur(' + blur + 'px)"/>';
    s += '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }

  // Build SVG filter element
  var ns = 'http://www.w3.org/2000/svg';
  var filt = document.createElementNS(ns, 'filter');
  filt.setAttribute('id', id);
  filt.setAttribute('color-interpolation-filters', 'sRGB');
  filt.setAttribute('x', '0%'); filt.setAttribute('y', '0%');
  filt.setAttribute('width', '100%'); filt.setAttribute('height', '100%');

  var feImg = document.createElementNS(ns, 'feImage');
  feImg.setAttribute('x', '0'); feImg.setAttribute('y', '0');
  feImg.setAttribute('width', '100%'); feImg.setAttribute('height', '100%');
  feImg.setAttribute('preserveAspectRatio', 'none');
  feImg.setAttribute('result', 'map');
  feImg.setAttribute('href', buildMap());

  function mkDisplace(result, scale) {
    var d = document.createElementNS(ns, 'feDisplacementMap');
    d.setAttribute('in', 'SourceGraphic'); d.setAttribute('in2', 'map');
    d.setAttribute('result', result);
    d.setAttribute('scale', scale);
    d.setAttribute('xChannelSelector', xCh);
    d.setAttribute('yChannelSelector', yCh);
    return d;
  }
  function mkMatrix(inName, vals, result) {
    var m = document.createElementNS(ns, 'feColorMatrix');
    m.setAttribute('in', inName); m.setAttribute('type', 'matrix');
    m.setAttribute('values', vals); m.setAttribute('result', result);
    return m;
  }
  function mkBlend(in1, in2, mode, result) {
    var b = document.createElementNS(ns, 'feBlend');
    b.setAttribute('in', in1); b.setAttribute('in2', in2);
    b.setAttribute('mode', mode); b.setAttribute('result', result);
    return b;
  }

  var dR = mkDisplace('dispRed', ds + ro);
  var mR = mkMatrix('dispRed', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0', 'red');
  var dG = mkDisplace('dispGreen', ds + go);
  var mG = mkMatrix('dispGreen', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0', 'green');
  var dB = mkDisplace('dispBlue', ds + bo);
  var mB = mkMatrix('dispBlue', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0', 'blue');
  var blRG = mkBlend('red', 'green', 'screen', 'rg');
  var blFinal = mkBlend('rg', 'blue', 'screen', 'output');
  var gauss = document.createElementNS(ns, 'feGaussianBlur');
  gauss.setAttribute('in', 'output');
  gauss.setAttribute('stdDeviation', displace);

  filt.appendChild(feImg);
  filt.appendChild(dR); filt.appendChild(mR);
  filt.appendChild(dG); filt.appendChild(mG);
  filt.appendChild(dB); filt.appendChild(mB);
  filt.appendChild(blRG); filt.appendChild(blFinal);
  filt.appendChild(gauss);
  gfDefs.appendChild(filt);

  // Apply to element
  el.style.setProperty('--gf-id', '"#' + id + '"');
  el.classList.add('gf');

  // Live-update displacement map on resize
  var ro2 = new ResizeObserver(function() {
    setTimeout(function() { feImg.setAttribute('href', buildMap()); }, 0);
  });
  ro2.observe(el);
}
// ── End SVG Glass Distortion Factory ────────────────────────────────────
```

- [ ] **Step 1: Add `.gf-svg-sprite` and `.gf` CSS rules** into `docs/index.html` inside the `<style>` block, after the last existing rule (the `.rv` and `.d1–.d4` delay rules, just before `</style>`).

- [ ] **Step 2: Add `<svg class="gf-svg-sprite" id="gf-sprite">` as first child of `<body>`** (right after `<body>`, before `<div class="orbs">`).

- [ ] **Step 3: Add the `createGlassFilter` factory JS** at the top of the bottom `<script>` block, inside the IIFE, before the WebGL shader code (before `var fsSrc = ...`).

- [ ] **Step 4: Verify the page still loads without errors** — open `docs/index.html` with Live Server in Chrome. Console should be clean.

- [ ] **Step 5: Commit**
```bash
git add docs/index.html
git commit -m "feat: add SVG glass distortion filter factory infrastructure"
```

---

## Task 2: Apply glass filter to the nav bar

**Files:**
- Modify: `docs/index.html` — bottom `<script>` block (after the factory, before WebGL code)

The nav is a full-width strip. Use a low distortion scale so it's subtle but premium.

- [ ] **Step 1: Add nav filter call** in the script, after the factory definition block:

```js
// ── Apply glass distortion to nav ───────────────────────────────────────
(function() {
  var nav = document.getElementById('nav');
  if (!nav) return;
  createGlassFilter(nav, {
    borderRadius: 0,
    borderWidth: 0.04,
    brightness: 45,
    opacity: 0.88,
    blur: 8,
    distortionScale: -110,
    redOffset: 0,
    greenOffset: 8,
    blueOffset: 16,
    displace: 0.5,
    mixBlendMode: 'difference'
  });
})();
```

- [ ] **Step 2: Remove the redundant `backdrop-filter` from `.nav`** in the CSS — the `.gf` class now handles it. Find `.nav` in the style block and change:
  ```css
  backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
  ```
  to:
  ```css
  /* backdrop-filter handled by .gf SVG filter */
  ```
  Keep everything else on `.nav` unchanged.

- [ ] **Step 3: Open in Chrome, scroll slowly.** Nav should show chromatic aberration on whatever is behind it. Verify no layout shift.

- [ ] **Step 4: Commit**
```bash
git add docs/index.html
git commit -m "feat: apply SVG glass distortion to nav bar"
```

---

## Task 3: Apply glass filter to feature cards (.gc, .nc, .nwc)

**Files:**
- Modify: `docs/index.html` — bottom `<script>` block

These are the price-comparison card (`#priceCard`), iOS notification cards (`.nc`), and news cards (`.nwc`).

- [ ] **Step 1: Add card filter calls** in the script, after the nav filter block:

```js
// ── Apply glass distortion to feature cards ──────────────────────────────
document.querySelectorAll('.gc, .nc, .nwc').forEach(function(card) {
  // Detect border radius from card type
  var br = card.classList.contains('gc') ? 28 :
           card.classList.contains('nc') ? 22 : 16;
  createGlassFilter(card, {
    borderRadius: br,
    borderWidth: 0.06,
    brightness: 52,
    opacity: 0.92,
    blur: 10,
    distortionScale: -150,
    redOffset: 0,
    greenOffset: 10,
    blueOffset: 20,
    displace: 0.7,
    mixBlendMode: 'difference'
  });
});
```

- [ ] **Step 2: Remove redundant `backdrop-filter` from `.gc` in CSS:**
  Find `.gc` rule and change:
  ```css
  backdrop-filter:var(--glass-blur-lg); -webkit-backdrop-filter:var(--glass-blur-lg);
  ```
  to:
  ```css
  /* backdrop-filter handled by .gf */
  ```

- [ ] **Step 3: Remove redundant `backdrop-filter` from `.nc` in CSS:**
  Find `.nc` rule and change:
  ```css
  backdrop-filter:blur(32px) saturate(180%); -webkit-backdrop-filter:blur(32px) saturate(180%);
  ```
  to:
  ```css
  /* backdrop-filter handled by .gf */
  ```

- [ ] **Step 4: Open in Chrome.** Scroll to features section. Cards should show the lens-distortion/chromatic-aberration effect. Hover 3D tilt should still work.

- [ ] **Step 5: Commit**
```bash
git add docs/index.html
git commit -m "feat: apply SVG glass distortion to feature cards"
```

---

## Task 4: Apply glass filter to bento cards (.bc)

**Files:**
- Modify: `docs/index.html` — bottom `<script>` block

Bento cards have tilt on hover. Filter must not break that.

- [ ] **Step 1: Add bento filter calls** after the feature card block:

```js
// ── Apply glass distortion to bento cards ────────────────────────────────
document.querySelectorAll('.bc').forEach(function(card) {
  createGlassFilter(card, {
    borderRadius: 22,
    borderWidth: 0.05,
    brightness: 48,
    opacity: 0.90,
    blur: 9,
    distortionScale: -130,
    redOffset: 0,
    greenOffset: 9,
    blueOffset: 18,
    displace: 0.6,
    mixBlendMode: 'difference'
  });
});
```

- [ ] **Step 2: Open in Chrome.** Scroll to bento section. Hover a card — tilt should still work, green spotlight radial gradient should still appear via `::after`. Cards should have chromatic aberration.

- [ ] **Step 3: Commit**
```bash
git add docs/index.html
git commit -m "feat: apply SVG glass distortion to bento grid cards"
```

---

## Task 5: Apply glass filter to buttons (.bl, .ab, .st, .sb badge)

**Files:**
- Modify: `docs/index.html` — bottom `<script>` block

Buttons are small. Use a tighter distortion scale.

- [ ] **Step 1: Add button filter calls** after the bento block:

```js
// ── Apply glass distortion to glass buttons ───────────────────────────────
// Ghost/outline buttons (.bl), nav arrow buttons (.ab), store buttons (.st), hero badge (.sb)
document.querySelectorAll('.bl, .ab, .st').forEach(function(btn) {
  createGlassFilter(btn, {
    borderRadius: 9999,
    borderWidth: 0.10,
    brightness: 55,
    opacity: 0.90,
    blur: 7,
    distortionScale: -80,
    redOffset: 0,
    greenOffset: 8,
    blueOffset: 16,
    displace: 0.4,
    mixBlendMode: 'difference'
  });
});
document.querySelectorAll('.sb').forEach(function(badge) {
  createGlassFilter(badge, {
    borderRadius: 9999,
    borderWidth: 0.12,
    brightness: 50,
    opacity: 0.88,
    blur: 6,
    distortionScale: -60,
    redOffset: 0,
    greenOffset: 6,
    blueOffset: 12,
    displace: 0.4,
    mixBlendMode: 'difference'
  });
});
```

- [ ] **Step 2: Remove redundant `backdrop-filter` from `.bl` in CSS:**
  Find `.bl` rule and change:
  ```css
  backdrop-filter:var(--glass-blur-sm); -webkit-backdrop-filter:var(--glass-blur-sm);
  ```
  to:
  ```css
  /* backdrop-filter handled by .gf */
  ```

- [ ] **Step 3: Remove redundant `backdrop-filter` from `.st` in CSS:**
  Find `.st` rule and change:
  ```css
  backdrop-filter:var(--glass-blur-sm); -webkit-backdrop-filter:var(--glass-blur-sm);
  ```
  to:
  ```css
  /* backdrop-filter handled by .gf */
  ```

- [ ] **Step 4: Remove redundant `backdrop-filter` from `.sb` in CSS:**
  Find `.sb` rule and change:
  ```css
  backdrop-filter:var(--glass-blur-sm); -webkit-backdrop-filter:var(--glass-blur-sm);
  ```
  to:
  ```css
  /* backdrop-filter handled by .gf */
  ```

- [ ] **Step 5: Open in Chrome. Hover each button type** — buttons should show subtle chromatic aberration. CTA green buttons (`.bg`) keep their gradient and are unaffected (they don't have the filter). `.ab` arrows in the slider should distort.

- [ ] **Step 6: Commit**
```bash
git add docs/index.html
git commit -m "feat: apply SVG glass distortion to ghost buttons and badges"
```

---

## Task 6: Apply glass filter to marquee pills (.mp)

**Files:**
- Modify: `docs/index.html` — bottom `<script>` block

Marquee duplicates elements; both sets of pills get the filter.

- [ ] **Step 1: Add marquee pill filter calls** after the button block:

```js
// ── Apply glass distortion to marquee pills ───────────────────────────────
document.querySelectorAll('.mp').forEach(function(pill) {
  createGlassFilter(pill, {
    borderRadius: 9999,
    borderWidth: 0.14,
    brightness: 52,
    opacity: 0.88,
    blur: 6,
    distortionScale: -55,
    redOffset: 0,
    greenOffset: 6,
    blueOffset: 12,
    displace: 0.3,
    mixBlendMode: 'difference'
  });
});
```

- [ ] **Step 2: Open in Chrome.** Marquee section should show each shop-name pill with a subtle glass lens effect.

- [ ] **Step 3: Commit**
```bash
git add docs/index.html
git commit -m "feat: apply SVG glass distortion to marquee pills"
```

---

## Task 7: Apply glass filter to cookie banner + arrow buttons

**Files:**
- Modify: `docs/index.html` — bottom `<script>` block

Cookie bar is a full-width strip fixed to the bottom.

- [ ] **Step 1: Add cookie bar + arrow button filter calls** after the marquee block:

```js
// ── Apply glass distortion to cookie bar ─────────────────────────────────
(function() {
  var ckb = document.getElementById('ckb');
  if (!ckb) return;
  // Apply after it shows (it starts hidden via transform:translateY(100%))
  setTimeout(function() {
    createGlassFilter(ckb, {
      borderRadius: 0,
      borderWidth: 0.03,
      brightness: 42,
      opacity: 0.85,
      blur: 10,
      distortionScale: -100,
      redOffset: 0,
      greenOffset: 8,
      blueOffset: 16,
      displace: 0.5,
      mixBlendMode: 'difference'
    });
  }, 1300); // matches the 1200ms cookie delay + buffer
})();
```

- [ ] **Step 2: Remove redundant `backdrop-filter` from `#ckb` in CSS:**
  Find `#ckb` rule and change:
  ```css
  backdrop-filter:var(--glass-blur-lg); -webkit-backdrop-filter:var(--glass-blur-lg);
  ```
  to:
  ```css
  /* backdrop-filter handled by .gf */
  ```

- [ ] **Step 3: Open in Chrome** (clear localStorage so cookie banner appears). Banner should have chromatic aberration on its glass surface.

- [ ] **Step 4: Commit**
```bash
git add docs/index.html
git commit -m "feat: apply SVG glass distortion to cookie banner"
```

---

## Task 8: Add the sticky scroll pill

**Files:**
- Modify: `docs/index.html` — `<style>` block + HTML body + `<script>` block

This is the centerpiece feature from the master prompt: a pill pinned `calc(100vh - 200px)` from the top, floating over all scrolling sections.

**CSS to add** (inside `<style>`, after the `.gf` rules from Task 1):

```css
/* ── STICKY GLASS PILL ─────────────────────────────────────────── */
.pill-wrapper {
  position: sticky;
  top: calc(100vh - 180px);
  z-index: 200;
  display: flex;
  justify-content: center;
  pointer-events: none;
  height: 0;
  overflow: visible;
}
.pill-inner {
  pointer-events: auto;
  width: clamp(280px, 45vw, 520px);
  height: 64px;
  border-radius: 9999px;
  background: rgba(255,255,255,0.04);
  border: 0.5px solid rgba(255,255,255,0.18);
  box-shadow:
    inset 0 0.5px 0 rgba(255,255,255,0.22),
    inset 0 -0.5px 0 rgba(0,0,0,0.18),
    0 8px 40px rgba(0,0,0,0.48),
    0 2px 8px rgba(0,0,0,0.32),
    0 0 0 0.5px rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 0 16px;
  gap: 12px;
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.3s;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.3,0.64,1);
}
.pill-inner.visible {
  opacity: 1;
  transform: translateY(0);
}
.pill-inner:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow:
    inset 0 0.5px 0 rgba(255,255,255,0.32),
    0 16px 56px rgba(0,0,0,0.56),
    0 0 40px rgba(48,209,88,0.12),
    0 0 0 0.5px rgba(255,255,255,0.10);
}
.pill-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pill-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--green-bright);
  box-shadow: 0 0 10px var(--green-glow);
  animation: dotPulse 2s ease-in-out infinite;
}
.pill-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: rgba(255,255,255,0.92);
  letter-spacing: -0.01em;
}
.pill-sub {
  font-size: 0.62rem;
  color: var(--text-3);
  font-weight: 500;
}
.pill-cta {
  background: linear-gradient(135deg, var(--green), var(--green-mid));
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 7px 16px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  box-shadow: inset 0 0.5px 0 rgba(255,255,255,0.18), 0 4px 16px rgba(48,209,88,0.30);
  transition: filter 0.15s, transform 0.15s;
  flex-shrink: 0;
}
.pill-cta:hover { filter: brightness(1.14); transform: scale(1.06); }
```

**HTML to add** — insert this `<div class="pill-wrapper">` block **between the hero `</div>` closing tag and the `<!-- MARQUEE -->` comment**, so it sits at the top of the scrollable content:

```html
<!-- STICKY GLASS PILL -->
<div class="pill-wrapper" id="pillWrapper">
  <div class="pill-inner" id="pillInner">
    <div class="pill-left">
      <span class="pill-dot"></span>
      <div>
        <div class="pill-label">Tweakly vergelijkt nu</div>
        <div class="pill-sub">50.000+ producten · 20+ webshops</div>
      </div>
    </div>
    <button class="pill-cta" onclick="document.getElementById('download').scrollIntoView({behavior:'smooth'})">Download gratis</button>
  </div>
</div>
```

**JS to add** — after the cookie bar filter block, add:

```js
// ── Sticky pill: show after hero is passed, apply glass filter ────────────
(function() {
  var pillInner = document.getElementById('pillInner');
  if (!pillInner) return;

  // Show pill once user has passed the hero section
  var shown = false;
  window.addEventListener('scroll', function() {
    if (!shown && scrollY > window.innerHeight * 0.6) {
      shown = true;
      pillInner.classList.add('visible');
      // Apply glass distortion after it's visible and has dimensions
      setTimeout(function() {
        createGlassFilter(pillInner, {
          borderRadius: 9999,
          borderWidth: 0.08,
          brightness: 50,
          opacity: 0.93,
          blur: 11,
          distortionScale: -180,
          redOffset: 0,
          greenOffset: 10,
          blueOffset: 20,
          displace: 0.5,
          mixBlendMode: 'difference'
        });
      }, 100);
    }
    // Hide pill in download section to avoid overlap
    if (shown) {
      var dlSection = document.getElementById('download');
      if (dlSection) {
        var dlTop = dlSection.getBoundingClientRect().top;
        pillInner.style.opacity = dlTop < window.innerHeight * 0.6 ? '0' : '';
      }
    }
  }, { passive: true });
})();
```

- [ ] **Step 1: Add pill CSS** into the `<style>` block (after `.gf` rules, before `</style>`).

- [ ] **Step 2: Add pill HTML** between `</div><!-- closes #hero -->` and `<!-- MARQUEE -->`.

- [ ] **Step 3: Add pill JS** after the cookie bar block, before the closing `})();` of the main IIFE.

- [ ] **Step 4: Open in Chrome. Scroll past the hero.** The pill should fade in near the bottom of the viewport. Content should scroll behind it. It should show chromatic aberration on whatever is behind it. Hovering should lift it.

- [ ] **Step 5: Verify on mobile** (DevTools device emulation). Pill should use `clamp(280px, 45vw, 520px)` width and remain usable.

- [ ] **Step 6: Commit**
```bash
git add docs/index.html
git commit -m "feat: add sticky glass pill with chromatic aberration scroll effect"
```

---

## Task 9: Premium polish — typography, spacing, micro-interactions

**Files:**
- Modify: `docs/index.html` — `<style>` block + `<script>` block

These finishing touches push the site from "nice" to "$50,000 site" territory.

### A) Improve heading kerning and line-height precision

In the CSS, find `.sh` (hero heading) and change `letter-spacing:-0.048em` to `letter-spacing:-0.055em`. Find `.h2` and change `letter-spacing:-0.04em` to `letter-spacing:-0.048em`. Find `.dlh` and change `letter-spacing:-0.05em` to `letter-spacing:-0.058em`.

### B) Add a shimmer/specular sweep animation to cards on hover

Add inside `<style>`:
```css
/* Specular light sweep on glass card hover */
.gc::after, .bc::after {
  content: '';
  position: absolute;
  top: -100%; left: -60%;
  width: 40%; height: 300%;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%);
  transform: skewX(-20deg);
  transition: left 0s;
  pointer-events: none;
  z-index: 2;
}
.gc:hover::after, .bc:hover::after {
  left: 130%;
  transition: left 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

Note: `.bc` already uses `::after` for the radial green spotlight. Change `.bc::after` in the new rule to `.bc .bc-sweep` instead, and add `<span class="bc-sweep" aria-hidden="true"></span>` as first child of each `.bc` element in the HTML. The `.bc::after` existing rule handles the mouse-tracking spotlight and must remain unchanged. Only `.gc` gets the `::after` sweep; bento uses the `.bc-sweep` span approach.

Updated CSS (replaces the paragraph above):
```css
.gc::after {
  content: '';
  position: absolute;
  top: -100%; left: -60%;
  width: 40%; height: 300%;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%);
  transform: skewX(-20deg);
  transition: left 0s;
  pointer-events: none;
  z-index: 2;
}
.gc:hover::after {
  left: 130%;
  transition: left 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.bc-sweep {
  position: absolute;
  top: -100%; left: -60%;
  width: 40%; height: 300%;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%);
  transform: skewX(-20deg);
  transition: left 0s;
  pointer-events: none;
  z-index: 2;
}
.bc:hover .bc-sweep {
  left: 130%;
  transition: left 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### C) Add `.bc-sweep` span to each bento card in HTML

Find the 5 `.bc` divs in the bento grid and add `<span class="bc-sweep" aria-hidden="true"></span>` as first child of each. Example:
```html
<div class="bc bc-1 rv d1"><span class="bc-sweep" aria-hidden="true"></span><span class="bci">🏪</span>...
```

### D) Improve download buttons — add a subtle green top-light on `.st`

Add in CSS:
```css
.st::after {
  content: '';
  position: absolute;
  top: 0; left: 20%; right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(48,209,88,0.35), transparent);
  border-radius: 0 0 1px 1px;
  pointer-events: none;
}
```

- [ ] **Step 1: Apply heading kerning tweaks** — find and update `.sh`, `.h2`, `.dlh` letter-spacing values as described above.

- [ ] **Step 2: Add specular sweep CSS** (`.gc::after`, `.bc-sweep`, `.bc:hover .bc-sweep`) to `<style>`.

- [ ] **Step 3: Add `.bc-sweep` spans** to the 5 `.bc` bento card divs in the HTML.

- [ ] **Step 4: Add `.st::after` green top-light CSS** to `<style>`.

- [ ] **Step 5: Open in Chrome. Hover each card type.** Light sweep should animate across. Bento tilt + radial spotlight should still work. Download buttons should have a subtle green top edge.

- [ ] **Step 6: Commit**
```bash
git add docs/index.html
git commit -m "feat: add specular sweep, heading kerning polish, download button glow"
```

---

## Task 10: Final QA + deploy

**Files:**
- `docs/index.html` — final review only

- [ ] **Step 1: Full page audit in Chrome (Chromium).**
  - Nav: chromatic aberration ✓
  - Marquee pills: subtle lens distortion ✓
  - Feature cards: strong distortion on scroll + 3D tilt ✓
  - Notification cards: distortion ✓
  - News cards: distortion ✓
  - Bento cards: distortion + tilt + radial spotlight ✓
  - Ghost buttons: subtle distortion ✓
  - Store download buttons: distortion + green top light ✓
  - Sticky pill: visible after hero scroll, distortion, disappears near download ✓
  - Cookie banner: distortion when visible ✓
  - Hero entrance animation: unaffected ✓
  - Scroll reveal: unaffected ✓

- [ ] **Step 2: Firefox smoke test.** Page must not show errors. Glass surfaces should fall back to their pre-existing `background: rgba(...)` style (the `.gf` `backdrop-filter: url(...)` simply has no effect in Firefox — that's correct and expected).

- [ ] **Step 3: Mobile check (DevTools → iPhone 14 Pro).** Sticky pill width, card layout, nav — all must render correctly at 390px wide.

- [ ] **Step 4: Final commit**
```bash
git add docs/index.html
git commit -m "feat: complete glass distortion system — premium landing site"
```

- [ ] **Step 5: Deploy to Cloudflare Pages** (per project memory: `wrangler pages deploy docs/` or via the Cloudflare dashboard).
