# Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `docs/index.html` hero into a centered, Apple-cinematic product showcase — pure black background, giant headline, real app screenshot in an iPhone 17-style shell with green glow and float animation.

**Architecture:** Single-file edit to `docs/index.html`. Remove the atmospheric orb/grain system and the old split-layout hero. Replace with a centered column: badge → headline → subline → phone → CTAs → scroll indicator. No new files needed.

**Tech Stack:** Vanilla HTML/CSS, no build step. All changes in the `<style>` block and hero HTML in `docs/index.html`.

---

### Task 1: Remove atmospheric background (orbs + grain)

**Files:**
- Modify: `docs/index.html`

- [ ] **Step 1: Delete the orb HTML**

Find and remove the `<!-- atmospheric orbs -->` block (lines 615–620):
```html
<!-- atmospheric orbs -->
<div class="atmo" aria-hidden="true">
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="orb orb-3"></div>
</div>
```

- [ ] **Step 2: Delete the grain HTML**

Remove line 621:
```html
<div class="grain" aria-hidden="true"></div>
```

- [ ] **Step 3: Remove the CSS for .atmo, .orb, .grain, and @keyframes orb-drift**

In the `<style>` block, delete the following sections entirely:
- `/* ─── fixed atmospheric background ──────────────────────── */` block (`.atmo`, `.orb`, `.orb-1`, `.orb-2`, `.orb-3`, `@keyframes orb-drift`)
- `/* ─── grain ──────────────────────────────────────────────── */` block (`.grain`)

- [ ] **Step 4: Verify in browser**

Open `docs/index.html` in a browser (or via the Cloudflare Pages preview). Background should be pure `#000000` — no green/blue/purple glows anywhere.

- [ ] **Step 5: Commit**
```bash
git add docs/index.html
git commit -m "feat: remove atmospheric orbs and grain from landing hero"
```

---

### Task 2: Rewrite hero CSS — centered column layout

**Files:**
- Modify: `docs/index.html` (style block, hero section only)

- [ ] **Step 1: Replace `#hero` rule**

Find:
```css
#hero {
  min-height: 100dvh;
  display: flex; align-items: center;
  padding-top: 7rem;
}
```
Replace with:
```css
#hero {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 6rem;
  padding-bottom: 3rem;
  text-align: center;
  position: relative;
}
```

- [ ] **Step 2: Replace `.hero-inner` rule**

Find:
```css
.hero-inner {
  max-width: 780px;
}
```
Replace with:
```css
.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 860px;
}
```

- [ ] **Step 3: Update `.hero-title` — bigger, centered**

Find:
```css
.hero-title {
  font-size: clamp(3.8rem, 10vw, 9rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 0.92;
  margin-bottom: 1.4rem;
  animation: fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both;
}
```
Replace with:
```css
.hero-title {
  font-size: clamp(4.5rem, 12vw, 10rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.88;
  margin-bottom: 1.2rem;
  text-align: center;
  animation: fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both;
}
```

- [ ] **Step 4: Update `.hero-sub` — shorter, centered**

Find:
```css
.hero-sub {
  font-size: clamp(1rem, 1.8vw, 1.15rem);
  color: var(--text-2); line-height: 1.75;
  max-width: 520px; margin-bottom: 2.2rem;
  animation: fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.32s both;
}
```
Replace with:
```css
.hero-sub {
  font-size: 1rem;
  color: rgba(255,255,255,0.50);
  line-height: 1.6;
  max-width: 420px;
  text-align: center;
  margin-bottom: 2.5rem;
  animation: fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.35s both;
}
```

- [ ] **Step 5: Update `.hero-btns` — centered**

Find:
```css
.hero-btns {
  display: flex; gap: 10px; flex-wrap: wrap;
  animation: fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.44s both;
}
```
Replace with:
```css
.hero-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  animation: fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.65s both;
}
```

- [ ] **Step 6: Update `.scroll-hint` — absolute bottom of viewport**

Find:
```css
.scroll-hint {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  margin-top: 4rem;
  animation: fade-up 1s ease 1s both;
}
```
Replace with:
```css
.scroll-hint {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  animation: fade-up 1s ease 1s both;
}
```

- [ ] **Step 7: Commit**
```bash
git add docs/index.html
git commit -m "feat: hero layout — centered column, updated typography and spacing"
```

---

### Task 3: Add iPhone 17-style phone mockup CSS

**Files:**
- Modify: `docs/index.html` (style block)

- [ ] **Step 1: Replace all old phone CSS**

Find the comment `/* floating phone mockup */` and remove everything from it through `@keyframes float { ... }` (the old float keyframe bakes in `translateY(-50%)` for the old absolute-positioned layout — it must be replaced).

The old block to remove spans from:
```css
/* floating phone mockup */
.hero-float { ... }
@media (max-width: 860px) { .hero-float { display: none; } }
.phone-shell { ... }
.phone-statusbar { ... }
.phone-notch { ... }
.phone-row { ... }
.phone-icon { ... }
.phone-label { ... }
.phone-label .ph-name { ... }
.phone-label .ph-price { ... }
.phone-badge-green { ... }
.phone-badge-red { ... }
.phone-chart { ... }
.ph-bar { ... }
@keyframes bar-grow { ... }
@keyframes float { ... }
@keyframes fade-in { ... }
```

- [ ] **Step 2: Insert new phone CSS in its place**

```css
/* ─── iPhone 17 phone mockup ─────────────────────────────── */
.hero-phone {
  height: min(58vh, 320px);
  width: auto;
  aspect-ratio: 9/19;
  border-radius: 44px;
  background: #0a0a0a;
  border: 0.5px solid rgba(255,255,255,0.14);
  overflow: hidden;
  transform: rotate(-8deg);
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.06),
    0 0 120px rgba(48,209,88,0.22),
    0 60px 100px rgba(0,0,0,0.80);
  margin-bottom: 2.5rem;
  position: relative;
  flex-shrink: 0;
  animation: phone-float 6s ease-in-out infinite, fade-in 1s ease 0.5s both;
}
/* Dynamic Island */
.hero-phone::before {
  content: '';
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 92px;
  height: 30px;
  background: #000;
  border-radius: 20px;
  z-index: 10;
}
.hero-phone img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
  display: block;
}
@keyframes phone-float {
  0%, 100% { transform: rotate(-8deg) translateY(0px); }
  50%       { transform: rotate(-8deg) translateY(-14px); }
}
@keyframes fade-in { from { opacity:0; } to { opacity:1; } }
```

- [ ] **Step 3: Commit**
```bash
git add docs/index.html
git commit -m "feat: iPhone 17 phone mockup CSS with Dynamic Island and green glow"
```

---

### Task 4: Rewrite hero HTML

**Files:**
- Modify: `docs/index.html` (hero section HTML)

- [ ] **Step 1: Replace the entire hero section HTML**

Find the `<section id="hero">` block (everything from `<section id="hero">` through its closing `</section>`) and replace it with:

```html
<!-- ── hero ─────────────────────────────────────────────────── -->
<section id="hero">
  <div class="hero-inner">
    <div class="hero-badge">
      <span class="badge-dot"></span>
      Nieuw — versie 2.0 beschikbaar
    </div>

    <h1 class="hero-title">
      Altijd de<br>
      <span class="line-2">beste prijs.</span>
    </h1>

    <p class="hero-sub">
      Prijsvergelijking die werkt terwijl jij slaapt.
    </p>

    <div class="hero-phone">
      <img src="v2-mobile-full.png" alt="Tweakly app screenshot">
    </div>

    <div class="hero-btns">
      <a href="#download" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v9M5 7l3 3 3-3M2 11v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Gratis downloaden
      </a>
      <a href="#demo" class="btn btn-ghost">Bekijk demo</a>
    </div>

    <div class="scroll-hint">
      <span>Scroll</span>
      <div class="scroll-chevron"></div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Remove the old `.container` wrapper inside hero**

The old hero had `<div class="container" style="position:relative;">` wrapping everything. The new HTML above uses `.hero-inner` directly — make sure no stray `.container` div remains inside `#hero`.

- [ ] **Step 3: Verify in browser**

Open `docs/index.html`. You should see:
- Pure black background
- Badge at top center
- Giant two-line headline, centered
- One-line subtext
- Phone mockup (tilted -8°, green glow, floating)
- Two buttons below
- "Scroll" indicator pinned to bottom of viewport

- [ ] **Step 4: Commit**
```bash
git add docs/index.html
git commit -m "feat: rewrite hero HTML — centered layout with iPhone 17 mockup and real screenshot"
```

---

### Task 5: Polish — remove dead CSS and verify full page

**Files:**
- Modify: `docs/index.html`

- [ ] **Step 1: Remove now-unused phone content CSS**

After the HTML rewrite, the following CSS classes are unused. Remove them from the style block:
- `.phone-statusbar`
- `.phone-notch`
- `.phone-row`
- `.phone-icon`
- `.phone-label`, `.phone-label .ph-name`, `.phone-label .ph-price`
- `.phone-badge-green`
- `.phone-badge-red`
- `.phone-chart`
- `.ph-bar`
- `@keyframes bar-grow`

- [ ] **Step 2: Verify all sections below the fold still render correctly**

Scroll through the full page and confirm:
- Stats row renders
- Features grid renders
- Live price demo renders
- Reviews section renders
- Download section renders
- Footer renders

- [ ] **Step 3: Check mobile (375px viewport)**

Resize browser to 375px width. Confirm:
- Headline wraps gracefully
- Phone mockup scales to fit (it uses `height: min(58vh, 320px)` so it should be ~320px tall on mobile)
- Buttons stack or wrap without overflow

- [ ] **Step 4: Final commit**
```bash
git add docs/index.html
git commit -m "chore: remove dead phone content CSS after hero rewrite"
```
