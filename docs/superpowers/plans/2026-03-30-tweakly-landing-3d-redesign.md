# Tweakly Landing Page — 3D Desk Scene Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `docs/index.html` with a cinematic landing page featuring a Three.js 3D desk scene where the camera dolly-scrolls through 6 keyframe stops, each paired with a glass UI card.

**Architecture:** A single `docs/index.html` with inline CSS and JS. Three.js (r160) renders a procedural 3D desk scene on a fixed full-viewport canvas. GSAP ScrollTrigger drives the camera path via a 500vh scroll driver div. All geometry is procedural — no `.glb` files. Below the scroll driver, a footer free-scrolls.

**Tech Stack:** Three.js r160 (CDN), GSAP 3 + ScrollTrigger (CDN), Inter font (Google Fonts), vanilla HTML/CSS/JS, Cloudflare Pages (static).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `docs/index.html` | Replace entirely | All HTML, CSS, JS — single self-contained file |

No other files are created or modified. All existing linked pages (`over-ons.html`, `contact.html`, `affiliate.html`, `privacy.html`, `voorwaarden.html`, `cookies.html`) remain untouched.

---

## Task 1: HTML Skeleton + CSS Tokens + CDN Imports

**Files:**
- Replace: `docs/index.html`

- [ ] **Step 1: Write the new index.html shell**

Replace the entire contents of `docs/index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tweakly — Smart Price Comparison</title>
  <meta name="description" content="Smart price comparison. Always the best deal. Track prices across 10+ stores and get notified the moment they drop.">
  <link rel="icon" href="logo.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- Three.js r160 -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js"></script>
  <!-- GSAP + ScrollTrigger -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

  <style>
    /* ═══════════════════════════════════════
       CSS CUSTOM PROPERTIES
    ═══════════════════════════════════════ */
    :root {
      --green:       #2d6a2d;
      --green-light: #4a9a4a;
      --green-dim:   rgba(45,106,45,0.12);
      --green-glow:  rgba(45,106,45,0.35);
      --bg:          #000000;
      --text:        #ffffff;
      --text-2:      rgba(255,255,255,0.55);
      --text-3:      rgba(255,255,255,0.25);
      --glass-bg:    rgba(255,255,255,0.05);
      --glass-bd:    rgba(255,255,255,0.10);
      --font:        'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --radius:      20px;
    }

    /* ═══════════════════════════════════════
       RESET
    ═══════════════════════════════════════ */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font);
      font-weight: 300;
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    a { text-decoration: none; color: inherit; }
    button { font-family: inherit; cursor: pointer; border: none; background: none; }
    img { display: block; }

    /* ═══════════════════════════════════════
       GRAIN OVERLAY
    ═══════════════════════════════════════ */
    .grain {
      position: fixed; inset: 0;
      pointer-events: none; z-index: 9999;
      opacity: 0.018;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 128px 128px;
    }

    /* ═══════════════════════════════════════
       LOADER
    ═══════════════════════════════════════ */
    #loader {
      position: fixed; inset: 0; z-index: 99998;
      background: #000;
      display: flex; align-items: center; justify-content: center;
    }
    .loader-wordmark {
      font-size: 1.1rem; font-weight: 600; letter-spacing: 0.06em;
      color: var(--green-light);
      opacity: 0;
    }

    /* ═══════════════════════════════════════
       THREE.JS CANVAS
    ═══════════════════════════════════════ */
    #scene-canvas {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 0;
      display: block;
    }

    /* ═══════════════════════════════════════
       SCENE SCROLL DRIVER
    ═══════════════════════════════════════ */
    #scene-scroll-driver {
      height: 500vh;
      position: relative;
      z-index: 1;
    }

    /* ═══════════════════════════════════════
       GLASS CARDS (shared)
    ═══════════════════════════════════════ */
    .glass-card {
      background: var(--glass-bg);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      border: 0.5px solid var(--glass-bd);
      border-radius: var(--radius);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 8px 32px rgba(0,0,0,0.6);
      padding: clamp(1.4rem, 3vw, 2rem);
      position: relative;
      overflow: hidden;
      transition: box-shadow 0.3s ease, transform 0.5s cubic-bezier(0.34,1.3,0.64,1);
      will-change: transform;
    }
    .glass-card::before {
      content: '';
      position: absolute; inset: -2px;
      border-radius: calc(var(--radius) + 2px);
      background: conic-gradient(
        from var(--border-angle, 0deg),
        transparent 0%,
        rgba(45,106,45,0.4) 10%,
        transparent 20%
      );
      opacity: 0;
      transition: opacity 0.3s;
      z-index: -1;
      pointer-events: none;
    }
    .glass-card:hover::before { opacity: 1; }
    .glass-card:hover {
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 8px 32px rgba(0,0,0,0.6),
        0 0 30px rgba(45,106,45,0.20);
    }

    /* Ripple */
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.15);
      transform: scale(0);
      animation: ripple-anim 0.6s linear forwards;
      pointer-events: none;
    }
    @keyframes ripple-anim {
      to { transform: scale(4); opacity: 0; }
    }

    /* Rotating border angle */
    @property --border-angle {
      syntax: '<angle>';
      inherits: false;
      initial-value: 0deg;
    }
    @keyframes rotate-border {
      to { --border-angle: 360deg; }
    }
    .glass-card:hover::before {
      animation: rotate-border 3s linear infinite;
      opacity: 1;
    }

    /* ═══════════════════════════════════════
       SCENE GLASS CARDS — positioned over canvas
    ═══════════════════════════════════════ */
    .scene-card {
      position: fixed;
      z-index: 10;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.3,0.64,1);
      max-width: 340px;
      width: calc(100% - 3rem);
    }
    .scene-card.visible {
      opacity: 1;
      pointer-events: auto;
    }

    /* card positions per keyframe */
    #card-0 { bottom: 12vh; left: clamp(1.5rem, 6vw, 6rem); }
    #card-1 { top: 50%; right: clamp(1.5rem, 5vw, 5rem); transform: translateY(-50%); }
    #card-1.visible { transform: translateY(-50%); }
    #card-2 { bottom: 15vh; left: 50%; transform: translateX(-50%); }
    #card-2.visible { transform: translateX(-50%); }
    #card-3 { top: 50%; right: clamp(1.5rem, 5vw, 5rem); transform: translateY(-50%); }
    #card-3.visible { transform: translateY(-50%); }
    #card-4 { bottom: 8vh; left: 50%; transform: translateX(-50%); max-width: 480px; }
    #card-4.visible { transform: translateX(-50%); }
    #card-5 { top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 480px; }
    #card-5.visible { transform: translate(-50%, -50%); }

    /* ═══════════════════════════════════════
       TYPOGRAPHY
    ═══════════════════════════════════════ */
    .eyebrow {
      font-size: 0.62rem; font-weight: 500;
      letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--green-light); margin-bottom: 0.75rem;
    }
    .card-title {
      font-size: clamp(1.2rem, 2.5vw, 1.6rem);
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
      margin-bottom: 0.75rem;
    }
    .card-sub {
      font-size: 0.84rem;
      color: var(--text-2);
      line-height: 1.65;
    }

    /* Gradient heading */
    .grad-text {
      background: linear-gradient(135deg, #ffffff 0%, var(--green-light) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ═══════════════════════════════════════
       HERO OVERLAY TEXT (camera stop 0)
    ═══════════════════════════════════════ */
    #hero-overlay {
      position: fixed;
      bottom: 12vh;
      left: clamp(1.5rem, 6vw, 6rem);
      z-index: 10;
      max-width: 700px;
      opacity: 0;
    }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 0.62rem; font-weight: 500;
      letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--green-light);
      padding: 6px 16px; border-radius: 9999px;
      background: var(--green-dim);
      border: 0.5px solid rgba(45,106,45,0.3);
      margin-bottom: 1.2rem;
    }
    .badge-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--green-light);
      box-shadow: 0 0 8px var(--green-glow);
      animation: pulse 2.2s ease-in-out infinite;
      flex-shrink: 0;
    }
    @keyframes pulse {
      0%,100% { opacity:1; transform:scale(1); }
      50%      { opacity:0.25; transform:scale(0.65); }
    }
    .hero-title {
      font-size: clamp(3.6rem, 11vw, 9.5rem);
      font-weight: 700;
      letter-spacing: -0.04em;
      line-height: 0.88;
      text-shadow: 0 0 40px rgba(45,106,45,0.4);
      margin-bottom: 0.6rem;
    }
    .hero-title .letter { display: inline-block; opacity: 0; }
    .hero-sub {
      font-size: clamp(0.95rem, 1.5vw, 1.1rem);
      color: var(--text-2);
      line-height: 1.75;
      margin-bottom: 1.8rem;
      min-height: 2.5em;
    }
    .hero-btns { display: flex; gap: 10px; flex-wrap: wrap; }

    /* ═══════════════════════════════════════
       BUTTONS
    ═══════════════════════════════════════ */
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 28px; border-radius: 9999px;
      font-size: 0.88rem; font-weight: 600;
      transition: all 0.22s cubic-bezier(0.34,1.3,0.64,1);
      cursor: pointer; border: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      position: relative; overflow: hidden;
    }
    .btn-green {
      background: var(--green); color: #fff;
      box-shadow: 0 4px 20px var(--green-glow);
      animation: glow-pulse 3s ease-in-out infinite;
    }
    @keyframes glow-pulse {
      0%,100% { box-shadow: 0 4px 20px var(--green-glow); }
      50%      { box-shadow: 0 4px 32px rgba(45,106,45,0.6); }
    }
    .btn-green:hover { opacity: 0.88; transform: translateY(-2px) scale(1.02); }
    .btn-green:active { transform: scale(0.97); }
    .btn-ghost {
      background: var(--glass-bg); color: var(--text);
      border: 0.5px solid var(--glass-bd);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.09); transform: translateY(-2px); }
    .btn-ghost:active { transform: scale(0.97); }

    /* ═══════════════════════════════════════
       NAV
    ═══════════════════════════════════════ */
    .nav-wrap {
      position: fixed; top: 1.25rem; left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      width: calc(100% - 2rem); max-width: 52rem;
      pointer-events: none;
    }
    .nav {
      pointer-events: auto;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 6px 0 20px; height: 52px;
      border-radius: 9999px;
      background: rgba(255,255,255,0.03);
      border: 0.5px solid rgba(255,255,255,0.12);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.5);
      transition: background 0.5s, border-color 0.5s;
    }
    .nav.scrolled {
      background: rgba(0,0,0,0.75);
      border-color: rgba(255,255,255,0.07);
    }
    .nav-brand {
      display: flex; align-items: center; gap: 9px;
      font-size: 1rem; font-weight: 600;
      color: var(--green-light); flex-shrink: 0;
    }
    .nav-brand img { width: 22px; height: 22px; border-radius: 6px; }
    .nav-links {
      display: flex; align-items: center; gap: 0; list-style: none;
    }
    .nav-links a {
      font-size: 0.82rem; font-weight: 400;
      color: var(--text-2);
      padding: 7px 13px; border-radius: 9999px;
      transition: color 0.2s;
      white-space: nowrap;
      position: relative;
    }
    .nav-links a::after {
      content: '';
      position: absolute; bottom: 4px; left: 13px; right: 13px;
      height: 1px; background: var(--green-light);
      transform: scaleX(0); transform-origin: left;
      transition: transform 0.25s ease;
    }
    .nav-links a:hover { color: var(--text); }
    .nav-links a:hover::after { transform: scaleX(1); }
    .nav-cta {
      background: var(--green); color: #fff;
      font-weight: 600; font-size: 0.82rem;
      padding: 9px 22px; border-radius: 9999px;
      transition: opacity 0.2s, transform 0.2s;
      white-space: nowrap;
      -webkit-tap-highlight-color: transparent;
    }
    .nav-cta:hover { opacity: 0.85; transform: scale(1.03); }
    .nav-cta:active { transform: scale(0.97); }
    .menu-btn {
      display: none; color: var(--text);
      font-size: 1.15rem; padding: 10px 14px;
      -webkit-tap-highlight-color: transparent;
    }
    .nav-links.open {
      display: flex; flex-direction: column;
      position: absolute; top: 60px; left: 0; right: 0;
      background: rgba(0,0,0,0.92);
      backdrop-filter: blur(40px);
      border: 0.5px solid var(--glass-bd);
      border-radius: 16px;
      padding: 12px 0;
    }

    /* ═══════════════════════════════════════
       FEATURE LIST (card-1)
    ═══════════════════════════════════════ */
    .feature-list { list-style: none; margin-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .feature-item {
      display: flex; align-items: flex-start; gap: 10px;
      font-size: 0.84rem; color: var(--text-2); line-height: 1.5;
    }
    .feature-icon {
      font-size: 1rem; flex-shrink: 0; margin-top: 1px;
    }
    .feature-item strong { color: var(--text); display: block; font-weight: 600; font-size: 0.88rem; }

    /* ═══════════════════════════════════════
       STEPS (card-2)
    ═══════════════════════════════════════ */
    .steps { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
    .step { display: flex; align-items: flex-start; gap: 12px; }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--green-dim);
      border: 0.5px solid rgba(45,106,45,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: var(--green-light);
      flex-shrink: 0;
    }
    .step-text strong { display: block; font-size: 0.88rem; font-weight: 600; color: var(--text); }
    .step-text span { font-size: 0.8rem; color: var(--text-2); }
    .step-connector {
      width: 1px; height: 20px;
      background: linear-gradient(to bottom, rgba(45,106,45,0.4), transparent);
      margin-left: 14px;
      position: relative;
      overflow: hidden;
    }
    .step-connector::after {
      content: '';
      position: absolute; top: -100%; left: 0;
      width: 100%; height: 100%;
      background: var(--green-light);
      animation: flow-down 2s ease-in-out infinite;
    }
    @keyframes flow-down {
      0% { top: -100%; opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }

    /* ═══════════════════════════════════════
       STORE BADGES (card-3)
    ═══════════════════════════════════════ */
    .store-badge {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 20px; border-radius: 12px;
      background: var(--glass-bg);
      border: 0.5px solid rgba(255,255,255,0.12);
      font-size: 0.82rem; font-weight: 500;
      color: var(--text-2);
      transition: background 0.2s, border-color 0.2s, transform 0.2s;
      -webkit-tap-highlight-color: transparent;
    }
    .store-badge:hover {
      background: rgba(255,255,255,0.09);
      border-color: rgba(255,255,255,0.22);
      transform: translateY(-2px);
    }
    .store-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 1rem; }

    /* ═══════════════════════════════════════
       MARQUEE (card-4)
    ═══════════════════════════════════════ */
    .marquee-outer {
      overflow: hidden; margin-top: 1.2rem;
      -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
      mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
    }
    .marquee-track {
      display: flex; align-items: center; gap: 2rem;
      animation: marquee 18s linear infinite;
      width: max-content; will-change: transform;
    }
    @keyframes marquee {
      from { transform: translateX(0); }
      to   { transform: translateX(-50%); }
    }
    .marquee-item { font-size: 0.88rem; font-weight: 500; color: var(--text-2); white-space: nowrap; }
    .marquee-sep  { color: var(--text-3); }

    /* ═══════════════════════════════════════
       EMAIL INPUT (card-5)
    ═══════════════════════════════════════ */
    .email-row {
      display: flex; gap: 0;
      background: rgba(255,255,255,0.05);
      border: 0.5px solid var(--glass-bd);
      border-radius: 9999px;
      padding: 5px 5px 5px 18px;
      margin-top: 1.2rem;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .email-row:focus-within {
      border-color: rgba(45,106,45,0.5);
      box-shadow: 0 0 0 3px rgba(45,106,45,0.08);
    }
    .email-input {
      flex: 1; min-width: 0;
      background: none; border: none; outline: none;
      color: var(--text); font-family: var(--font);
      font-size: 0.85rem; font-weight: 300;
    }
    .email-input::placeholder { color: var(--text-3); }
    .email-btn {
      background: var(--green); color: #fff;
      font-weight: 700; font-size: 0.8rem;
      padding: 10px 20px; border-radius: 9999px;
      white-space: nowrap; flex-shrink: 0;
      transition: opacity 0.2s, transform 0.15s;
      position: relative; overflow: hidden;
    }
    .email-btn:hover { opacity: 0.85; }
    .email-btn:active { transform: scale(0.96); }
    .email-fine { font-size: 0.72rem; color: var(--text-3); margin-top: 0.75rem; text-align: center; }

    /* ═══════════════════════════════════════
       FOOTER
    ═══════════════════════════════════════ */
    #footer {
      position: relative; z-index: 2;
      padding: clamp(2rem, 5vh, 3rem) clamp(1.5rem, 5vw, 4rem);
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      border-top: 0.5px solid rgba(255,255,255,0.07);
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 1.5rem;
    }
    .footer-copy { font-size: 0.78rem; color: var(--text-3); }
    .footer-links { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .footer-links a {
      font-size: 0.78rem; color: var(--text-3);
      transition: color 0.2s;
    }
    .footer-links a:hover { color: var(--text-2); }
    .footer-stores { display: flex; gap: 10px; }
    .footer-store-btn {
      font-size: 0.72rem; font-weight: 500; color: var(--text-3);
      padding: 6px 14px; border-radius: 8px;
      border: 0.5px solid rgba(255,255,255,0.08);
      background: var(--glass-bg);
      transition: border-color 0.2s, color 0.2s;
    }
    .footer-store-btn:hover { border-color: rgba(255,255,255,0.18); color: var(--text-2); }

    /* ═══════════════════════════════════════
       CUSTOM CURSOR
    ═══════════════════════════════════════ */
    #cursor {
      position: fixed;
      width: 40px; height: 40px;
      border: 1px solid rgba(45,106,45,0.6);
      border-radius: 50%;
      pointer-events: none;
      z-index: 99997;
      transform: translate(-50%, -50%);
      transition: width 0.2s ease, height 0.2s ease, opacity 0.2s ease;
      mix-blend-mode: difference;
      opacity: 0;
    }
    #cursor.expanded { width: 60px; height: 60px; }

    /* ═══════════════════════════════════════
       REDUCED MOTION
    ═══════════════════════════════════════ */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* ═══════════════════════════════════════
       MOBILE
    ═══════════════════════════════════════ */
    @media (max-width: 767px) {
      .grain { opacity: 0.010; }
      #cursor { display: none; }
      .menu-btn { display: block; }
      .nav-links:not(.open) { display: none; }
      .nav-links.open { position: fixed; top: 70px; }
      .scene-card {
        position: relative !important;
        top: auto !important; left: auto !important;
        right: auto !important; bottom: auto !important;
        transform: none !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        max-width: 100% !important;
        width: 100% !important;
        margin-bottom: 1rem;
      }
      #hero-overlay {
        position: relative;
        bottom: auto; left: auto;
        opacity: 1 !important;
        padding: 2rem 1.5rem 1rem;
      }
      #scene-scroll-driver { height: auto; }
      #scene-canvas { position: relative; height: 60vw; min-height: 260px; }
      .mobile-cards-wrap {
        padding: 1.5rem;
        display: flex; flex-direction: column; gap: 1rem;
        position: relative; z-index: 2;
      }
    }
    @media (min-width: 768px) {
      .mobile-cards-wrap { display: none; }
    }
  </style>
</head>
<body>

<!-- ── GRAIN ── -->
<div class="grain" aria-hidden="true"></div>

<!-- ── CUSTOM CURSOR ── -->
<div id="cursor" aria-hidden="true"></div>

<!-- ── LOADER ── -->
<div id="loader" aria-hidden="true">
  <span class="loader-wordmark">Tweakly</span>
</div>

<!-- ── NAV ── -->
<div class="nav-wrap">
  <nav class="nav" id="nav" role="navigation" aria-label="Main navigation">
    <a href="#" class="nav-brand">
      <img src="logo.png" alt="Tweakly logo" width="22" height="22">
      Tweakly
    </a>
    <ul class="nav-links" id="navLinks" role="list">
      <li><a href="#card-1">Features</a></li>
      <li><a href="#card-2">How It Works</a></li>
      <li><a href="#card-5">Download</a></li>
    </ul>
    <button class="nav-cta" id="navCta">Get Early Access</button>
    <button class="menu-btn" id="menuBtn" aria-label="Menu" aria-expanded="false">&#9776;</button>
  </nav>
</div>

<!-- ── THREE.JS CANVAS ── -->
<canvas id="scene-canvas" aria-hidden="true"></canvas>

<!-- ── HERO OVERLAY (desktop, camera stop 0) ── -->
<div id="hero-overlay" aria-label="Hero section">
  <div class="hero-badge">
    <span class="badge-dot" aria-hidden="true"></span>
    Now in Beta
  </div>
  <h1 class="hero-title grad-text" id="heroTitle" aria-label="Tweakly"></h1>
  <p class="hero-sub" id="heroSub" aria-label="Smart price comparison. Always the best deal."></p>
  <div class="hero-btns">
    <button class="btn btn-green" id="heroCta">Get Early Access</button>
    <button class="btn btn-ghost" id="heroLearn">Learn More</button>
  </div>
</div>

<!-- ── SCENE SCROLL DRIVER ── -->
<div id="scene-scroll-driver" aria-hidden="true">

  <!-- CARD 0: Hero (shown via hero-overlay above on desktop) -->

  <!-- CARD 1: Features -->
  <div class="glass-card scene-card" id="card-1" role="region" aria-label="Features">
    <p class="eyebrow">Features</p>
    <h2 class="card-title grad-text">Everything you need</h2>
    <ul class="feature-list">
      <li class="feature-item">
        <span class="feature-icon" aria-hidden="true">📈</span>
        <div><strong>Price Tracking</strong>Monitor price history across 10+ stores</div>
      </li>
      <li class="feature-item">
        <span class="feature-icon" aria-hidden="true">🔔</span>
        <div><strong>Instant Alerts</strong>Get notified the moment prices drop</div>
      </li>
      <li class="feature-item">
        <span class="feature-icon" aria-hidden="true">⚡</span>
        <div><strong>One-tap Compare</strong>Paste a link, see every price side by side</div>
      </li>
    </ul>
  </div>

  <!-- CARD 2: How It Works -->
  <div class="glass-card scene-card" id="card-2" role="region" aria-label="How it works">
    <p class="eyebrow">How It Works</p>
    <h2 class="card-title grad-text">Three steps. That's it.</h2>
    <div class="steps">
      <div class="step">
        <div class="step-num" aria-hidden="true">1</div>
        <div class="step-text">
          <strong>Search a product</strong>
          <span>Type a name or paste a link</span>
        </div>
      </div>
      <div class="step-connector" aria-hidden="true"></div>
      <div class="step">
        <div class="step-num" aria-hidden="true">2</div>
        <div class="step-text">
          <strong>We scan 10+ stores</strong>
          <span>Real-time price comparison</span>
        </div>
      </div>
      <div class="step-connector" aria-hidden="true"></div>
      <div class="step">
        <div class="step-num" aria-hidden="true">3</div>
        <div class="step-text">
          <strong>You save money</strong>
          <span>Always the best deal, guaranteed</span>
        </div>
      </div>
    </div>
  </div>

  <!-- CARD 3: Mobile -->
  <div class="glass-card scene-card" id="card-3" role="region" aria-label="Mobile app">
    <p class="eyebrow">Mobile</p>
    <h2 class="card-title grad-text">Always in your pocket</h2>
    <p class="card-sub">Tweakly on iOS &amp; Android. Never overpay again, wherever you are.</p>
    <div class="store-badges" style="margin-top:1.2rem;">
      <span class="store-badge" aria-label="App Store — Coming Soon">🍎 App Store <span style="color:var(--text-3);font-size:0.72rem;margin-left:4px;">Coming soon</span></span>
      <span class="store-badge" aria-label="Google Play — Coming Soon">▶ Google Play <span style="color:var(--text-3);font-size:0.72rem;margin-left:4px;">Coming soon</span></span>
    </div>
  </div>

  <!-- CARD 4: Shops -->
  <div class="glass-card scene-card" id="card-4" role="region" aria-label="Supported stores">
    <p class="eyebrow">Stores</p>
    <h2 class="card-title grad-text">10 stores. One search.</h2>
    <p class="card-sub">We compare prices at the biggest Dutch and international webshops, all in one place.</p>
    <div class="marquee-outer" aria-label="Supported stores list">
      <div class="marquee-track" aria-hidden="true">
        <span class="marquee-item">Bol.com</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Coolblue</span><span class="marquee-sep">·</span>
        <span class="marquee-item">MediaMarkt</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Amazon</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Alternate</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Azerty</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Paradigit</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Belsimpel</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Mobiel.nl</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Centralpoint</span><span class="marquee-sep">·</span>
        <!-- duplicate for seamless loop -->
        <span class="marquee-item">Bol.com</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Coolblue</span><span class="marquee-sep">·</span>
        <span class="marquee-item">MediaMarkt</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Amazon</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Alternate</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Azerty</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Paradigit</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Belsimpel</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Mobiel.nl</span><span class="marquee-sep">·</span>
        <span class="marquee-item">Centralpoint</span>
      </div>
    </div>
  </div>

  <!-- CARD 5: CTA -->
  <div class="glass-card scene-card" id="card-5" role="region" aria-label="Get early access">
    <p class="eyebrow">Early Access</p>
    <h2 class="card-title grad-text" style="font-size:clamp(1.4rem,3vw,2rem);">Get early access</h2>
    <p class="card-sub">Be among the first to try Tweakly. Free forever for beta users.</p>
    <form class="email-row" id="accessForm" onsubmit="return false;" aria-label="Email signup">
      <input
        class="email-input" id="emailInput" type="email"
        placeholder="your@email.com"
        autocomplete="email" aria-label="Email address"
      >
      <button class="email-btn" id="accessBtn" type="submit">Request Access</button>
    </form>
    <p class="email-fine">iOS &amp; Android · Free · No spam</p>
  </div>

</div><!-- /scene-scroll-driver -->

<!-- ── MOBILE CARDS (shown only on mobile, replaces fixed positioning) ── -->
<div class="mobile-cards-wrap" aria-label="Features overview">
  <div class="hero-badge" style="margin-bottom:0.5rem;">
    <span class="badge-dot" aria-hidden="true"></span>Now in Beta
  </div>
  <h1 style="font-size:clamp(2.8rem,9vw,4rem);font-weight:700;letter-spacing:-0.04em;line-height:0.9;margin-bottom:1rem;" class="grad-text">Tweakly</h1>
  <p style="font-size:0.92rem;color:var(--text-2);line-height:1.7;margin-bottom:1.5rem;">Smart price comparison. Always the best deal.</p>
  <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:2rem;">
    <button class="btn btn-green" id="heroCta2">Get Early Access</button>
    <button class="btn btn-ghost" id="heroLearn2">Learn More</button>
  </div>

  <div class="glass-card" style="margin-bottom:1rem;">
    <p class="eyebrow">Features</p>
    <h2 class="card-title grad-text">Everything you need</h2>
    <ul class="feature-list">
      <li class="feature-item"><span class="feature-icon" aria-hidden="true">📈</span><div><strong>Price Tracking</strong>Monitor price history across 10+ stores</div></li>
      <li class="feature-item"><span class="feature-icon" aria-hidden="true">🔔</span><div><strong>Instant Alerts</strong>Get notified the moment prices drop</div></li>
      <li class="feature-item"><span class="feature-icon" aria-hidden="true">⚡</span><div><strong>One-tap Compare</strong>Paste a link, see every price side by side</div></li>
    </ul>
  </div>

  <div class="glass-card" style="margin-bottom:1rem;">
    <p class="eyebrow">How It Works</p>
    <h2 class="card-title grad-text">Three steps. That's it.</h2>
    <div class="steps">
      <div class="step"><div class="step-num" aria-hidden="true">1</div><div class="step-text"><strong>Search a product</strong><span>Type a name or paste a link</span></div></div>
      <div class="step-connector" aria-hidden="true"></div>
      <div class="step"><div class="step-num" aria-hidden="true">2</div><div class="step-text"><strong>We scan 10+ stores</strong><span>Real-time price comparison</span></div></div>
      <div class="step-connector" aria-hidden="true"></div>
      <div class="step"><div class="step-num" aria-hidden="true">3</div><div class="step-text"><strong>You save money</strong><span>Always the best deal, guaranteed</span></div></div>
    </div>
  </div>

  <div class="glass-card" style="margin-bottom:1rem;">
    <p class="eyebrow">Early Access</p>
    <h2 class="card-title grad-text">Get early access</h2>
    <p class="card-sub">Be among the first to try Tweakly. Free forever for beta users.</p>
    <form class="email-row" id="accessFormMobile" onsubmit="return false;">
      <input class="email-input" id="emailInputMobile" type="email" placeholder="your@email.com" autocomplete="email" aria-label="Email address">
      <button class="email-btn" type="submit">Request Access</button>
    </form>
    <p class="email-fine">iOS &amp; Android · Free · No spam</p>
  </div>
</div>

<!-- ── FOOTER ── -->
<footer id="footer" role="contentinfo">
  <span class="footer-copy">© 2026 Alexander Ballet</span>
  <nav class="footer-links" aria-label="Footer links">
    <a href="over-ons.html">About</a>
    <a href="contact.html">Contact</a>
    <a href="affiliate.html">Affiliate</a>
    <a href="privacy.html">Privacy</a>
    <a href="voorwaarden.html">Terms</a>
    <a href="cookies.html">Cookies</a>
  </nav>
  <div class="footer-stores">
    <span class="footer-store-btn">🍎 App Store</span>
    <span class="footer-store-btn">▶ Google Play</span>
  </div>
</footer>

<script>
/* ════════════════════════════════════════════════════════════
   TWEAKLY — 3D DESK SCENE LANDING PAGE
   Three.js r160 + GSAP ScrollTrigger
════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── UTILS ── */
  const $ = id => document.getElementById(id);
  const isMobile = () => window.innerWidth < 768;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── CUSTOM CURSOR ── */
  function initCursor() {
    if (isMobile() || prefersReducedMotion) return;
    const cursor = $('cursor');
    let cx = 0, cy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; cursor.style.opacity = '1'; });
    document.querySelectorAll('a, button, .glass-card').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('expanded'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('expanded'));
    });
    function tick() {
      cx += (tx - cx) * 0.125;
      cy += (ty - cy) * 0.125;
      cursor.style.left = cx + 'px';
      cursor.style.top  = cy + 'px';
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ── RIPPLE ── */
  function addRipple(el) {
    el.addEventListener('click', e => {
      const r = document.createElement('span');
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      r.className = 'ripple';
      r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
      el.appendChild(r);
      setTimeout(() => r.remove(), 650);
    });
  }

  /* ── GLASS CARD 3D TILT ── */
  function initCardTilt() {
    if (prefersReducedMotion) return;
    document.querySelectorAll('.glass-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;
        card.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
      addRipple(card);
    });
    document.querySelectorAll('.btn, .email-btn').forEach(addRipple);
  }

  /* ── NAV ── */
  function initNav() {
    const nav = $('nav') || document.querySelector('.nav');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    }, { passive: true });

    $('menuBtn').addEventListener('click', () => {
      const links = $('navLinks');
      const open = links.classList.toggle('open');
      $('menuBtn').setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('#nav')) $('navLinks').classList.remove('open');
    });

    /* scroll nav anchors to CTA card */
    $('navCta').addEventListener('click', () => {
      $('card-5') && $('card-5').scrollIntoView({ behavior: 'smooth' });
    });
    $('heroCta') && $('heroCta').addEventListener('click', () => {
      $('card-5') && $('card-5').scrollIntoView({ behavior: 'smooth' });
    });
    $('heroLearn') && $('heroLearn').addEventListener('click', () => {
      $('card-1') && $('card-1').scrollIntoView({ behavior: 'smooth' });
    });
    $('heroCta2') && $('heroCta2').addEventListener('click', () => {
      $('accessFormMobile') && $('accessFormMobile').scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ── HERO TEXT REVEAL ── */
  function revealHeroText() {
    if (prefersReducedMotion) {
      $('heroTitle').textContent = 'Tweakly';
      $('heroSub').textContent = 'Smart price comparison. Always the best deal.';
      return;
    }

    /* letter-by-letter title */
    const title = $('heroTitle');
    const letters = 'Tweakly'.split('');
    title.innerHTML = letters.map(l => `<span class="letter">${l}</span>`).join('');
    gsap.to(title.querySelectorAll('.letter'), {
      opacity: 1, y: 0,
      stagger: 0.06,
      duration: 0.5,
      ease: 'power2.out',
      delay: 0.1
    });
    gsap.fromTo(title.querySelectorAll('.letter'),
      { y: 20 }, { y: 0, stagger: 0.06, duration: 0.5, ease: 'power2.out', delay: 0.1 }
    );

    /* typewriter subtitle */
    const sub = $('heroSub');
    const text = 'Smart price comparison. Always the best deal.';
    let i = 0;
    const delay = letters.length * 60 + 200;
    setTimeout(() => {
      const t = setInterval(() => {
        sub.textContent = text.slice(0, ++i);
        if (i >= text.length) clearInterval(t);
      }, 30);
    }, delay);
  }

  /* ── THREE.JS SCENE ── */
  function initScene() {
    const canvas = $('scene-canvas');
    const W = window.innerWidth, H = window.innerHeight;
    const mobile = isMobile();

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = !mobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    /* Scene */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.18);

    /* Camera */
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 50);

    /* Materials */
    const walnutMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.82, metalness: 0.08 });
    const blackMat  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35, metalness: 0.2 });
    const darkMat   = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5,  metalness: 0.1 });
    const padMat    = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.95, metalness: 0.0 });
    const phoneMat  = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2,  metalness: 0.5 });
    const kbdMat    = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.6,  metalness: 0.1 });
    const ledMat    = new THREE.MeshStandardMaterial({ color: 0x2d6a2d, emissive: new THREE.Color(0x2d6a2d), emissiveIntensity: mobile ? 0.4 : 0.9, roughness: 1 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0a1a0a, emissive: new THREE.Color(0x0a1a0a), emissiveIntensity: 0.6, roughness: 1 });

    /* ── DESK SURFACE ── */
    const desk = new THREE.Mesh(new THREE.BoxGeometry(4, 0.06, 1.8), walnutMat);
    desk.position.set(0, 0, 0);
    desk.receiveShadow = true;
    scene.add(desk);

    /* ── MONITOR SHELF ── */
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.04, 0.5), walnutMat);
    shelf.position.set(0, 0.05, -0.5);
    shelf.castShadow = true;
    scene.add(shelf);

    /* ── MONITOR BEZEL ── */
    const monBezel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.06), blackMat);
    monBezel.position.set(0, 0.65, -0.72);
    monBezel.castShadow = true;
    scene.add(monBezel);

    /* ── MONITOR SCREEN ── */
    const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.95), screenMat);
    monScreen.position.set(0, 0.65, -0.69);
    scene.add(monScreen);

    /* ── MONITOR STAND ── */
    const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8), blackMat);
    standPole.position.set(0, 0.075, -0.68);
    scene.add(standPole);
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.02, 0.22), blackMat);
    standBase.position.set(0, 0.04, -0.68);
    scene.add(standBase);

    /* ── PC TOWER ── */
    const pcBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.55), darkMat);
    pcBody.position.set(1.5, 0.52, -0.5);
    pcBody.castShadow = true;
    pcBody.receiveShadow = true;
    scene.add(pcBody);

    /* PC glass panel */
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x111122, transmission: 0.82, roughness: 0.05,
      metalness: 0.0, thickness: 0.02, transparent: true, opacity: 0.85
    });
    const pcGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 1.08), glassMat);
    pcGlass.position.set(1.3, 0.52, -0.5);
    pcGlass.rotation.y = Math.PI / 2;
    scene.add(pcGlass);

    /* Fan rings */
    const fanMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
    [-0.25, 0, 0.25].forEach(z => {
      const fan = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 24), fanMat);
      fan.position.set(1.29, 0.5, z - 0.5);
      fan.rotation.y = Math.PI / 2;
      scene.add(fan);
    });

    /* ── KEYBOARD ── */
    const kbd = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.025, 0.22), kbdMat);
    kbd.position.set(0.05, 0.043, 0.4);
    kbd.castShadow = true;
    scene.add(kbd);

    /* Wrist rest */
    const wrist = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.015, 0.08), walnutMat);
    wrist.position.set(0.05, 0.038, 0.57);
    scene.add(wrist);

    /* Keycap rows — subtle */
    const keycapMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 14; col++) {
        const key = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.01, 0.035), keycapMat);
        key.position.set(0.05 - 0.26 + col * 0.042, 0.058, 0.33 + row * 0.042);
        scene.add(key);
      }
    }

    /* ── MOUSEPAD + MOUSE ── */
    const mousepad = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.006, 0.32), padMat);
    mousepad.position.set(0.5, 0.033, 0.35);
    mousepad.receiveShadow = true;
    scene.add(mousepad);

    const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.028, 0.11), blackMat);
    mouse.position.set(0.65, 0.05, 0.3);
    mouse.castShadow = true;
    scene.add(mouse);

    /* ── PHONE + CHARGING DOCK ── */
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.008, 0.16), phoneMat);
    phone.position.set(-0.7, 0.037, 0.2);
    phone.castShadow = true;
    scene.add(phone);

    /* Phone screen glow */
    const phoneScreenMat = new THREE.MeshStandardMaterial({ color: 0x0a200a, emissive: new THREE.Color(0x0a200a), emissiveIntensity: 0.5, roughness: 1 });
    const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.145), phoneScreenMat);
    phoneScreen.position.set(-0.7, 0.042, 0.2);
    phoneScreen.rotation.x = -Math.PI / 2;
    scene.add(phoneScreen);

    const dock = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.014, 32), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4 }));
    dock.position.set(-0.7, 0.037, 0.2);
    scene.add(dock);

    /* ── MIC ARM + HEAD ── */
    const micArm = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.75, 8), blackMat);
    micArm.position.set(-1.7, 0.4, -0.2);
    micArm.rotation.z = Math.PI / 6;
    scene.add(micArm);

    const micHead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), darkMat);
    micHead.position.set(-1.45, 0.72, -0.2);
    scene.add(micHead);

    /* ── SPEAKERS ── */
    [-0.85, 0.85].forEach(x => {
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), blackMat);
      sp.scale.set(1, 0.7, 0.7);
      sp.position.set(x, 0.12, -0.72);
      scene.add(sp);
    });

    /* ── LED STRIP (behind monitor) ── */
    const led = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.01, 0.02), ledMat);
    led.position.set(0, 0.1, -0.97);
    scene.add(led);

    /* ── FLOOR ── */
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.9, metalness: 0.0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    /* ── DESK LEGS ── */
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
    [[-1.7, -0.6], [-1.7, 0.6], [1.7, -0.6], [1.7, 0.6]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), legMat);
      leg.position.set(x, -0.28, z);
      scene.add(leg);
    });

    /* ── LIGHTS ── */
    const ambient = new THREE.AmbientLight(0x111111, 0.4);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0xffaa55, 0, 8); /* start at 0, fade in */
    keyLight.position.set(-1.5, 1.8, 0.8);
    keyLight.castShadow = !mobile;
    if (!mobile) {
      keyLight.shadow.mapSize.set(512, 512);
      keyLight.shadow.camera.near = 0.1;
      keyLight.shadow.camera.far = 8;
    }
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0);
    fillLight.position.set(2, 3, 2);
    fillLight.castShadow = false;
    scene.add(fillLight);

    /* RectAreaLight — monitor backlight */
    let rectLight = null;
    if (THREE.RectAreaLight) {
      rectLight = new THREE.RectAreaLight(0xaaccff, 0, 2.0, 0.8);
      rectLight.position.set(0, 0.8, -0.95);
      rectLight.lookAt(0, 0.6, 0);
      scene.add(rectLight);
    }

    /* ── CAMERA KEYFRAMES ── */
    const KF = [
      { pos: new THREE.Vector3(0, 1.8, 3.2),   target: new THREE.Vector3(0, 0.3, 0) },
      { pos: new THREE.Vector3(-0.3, 0.9, 1.4), target: new THREE.Vector3(0, 0.6, 0) },
      { pos: new THREE.Vector3(0.1, 0.5, 0.9),  target: new THREE.Vector3(0.1, 0.35, 0.1) },
      { pos: new THREE.Vector3(0.6, 0.6, 1.0),  target: new THREE.Vector3(-0.7, 0.32, 0) },
      { pos: new THREE.Vector3(0, 2.5, 2.0),    target: new THREE.Vector3(0, 0.3, 0) },
      { pos: new THREE.Vector3(0, 1.4, 3.8),    target: new THREE.Vector3(0, 0.4, 0) },
    ];

    /* ── SCROLL-DRIVEN CAMERA STATE ── */
    let camProgress = 0; // 0 to KF.length-1
    const camPos    = KF[0].pos.clone();
    const camTarget = KF[0].target.clone();
    let activeCard  = -1;

    const LERP = prefersReducedMotion ? 1.0 : 0.06;

    /* ── GSAP SCROLL TRIGGER ── */
    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.create({
      trigger: '#scene-scroll-driver',
      start: 'top top',
      end: 'bottom bottom',
      scrub: prefersReducedMotion ? 0 : 1.2,
      onUpdate: self => {
        camProgress = self.progress * (KF.length - 1);
      }
    });

    /* ── CARD VISIBILITY ── */
    const cards = ['card-1','card-2','card-3','card-4','card-5'];
    /* card-0 is hero-overlay, handled separately */

    function updateCards(kfIndex) {
      const rounded = Math.round(kfIndex);
      if (rounded === activeCard) return;
      activeCard = rounded;

      /* hero overlay */
      const heroOverlay = $('hero-overlay');
      if (rounded === 0) {
        heroOverlay.style.opacity = '1';
        heroOverlay.style.pointerEvents = 'auto';
      } else {
        heroOverlay.style.opacity = '0';
        heroOverlay.style.pointerEvents = 'none';
      }

      /* scene cards */
      cards.forEach((id, i) => {
        const card = $(id);
        if (!card) return;
        const cardKf = i + 1; /* card-1 → kf1, etc. */
        const show = rounded === cardKf;
        card.classList.toggle('visible', show);
      });
    }

    /* ── RAF LOOP ── */
    let rafId;
    let paused = false;

    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
      if (!paused && !rafId) loop();
    });

    function loop() {
      rafId = requestAnimationFrame(loop);
      if (paused) return;

      /* interpolate camera */
      const kfLow  = Math.floor(camProgress);
      const kfHigh = Math.min(kfLow + 1, KF.length - 1);
      const t      = camProgress - kfLow;

      const targetPos = new THREE.Vector3().lerpVectors(KF[kfLow].pos,    KF[kfHigh].pos,    t);
      const targetLat = new THREE.Vector3().lerpVectors(KF[kfLow].target, KF[kfHigh].target, t);

      camPos.lerp(targetPos, LERP);
      camTarget.lerp(targetLat, LERP);

      camera.position.copy(camPos);
      camera.lookAt(camTarget);

      updateCards(camProgress);

      renderer.render(scene, camera);
    }

    /* ── RESIZE ── */
    window.addEventListener('resize', () => {
      const W2 = window.innerWidth, H2 = window.innerHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    }, { passive: true });

    /* ── LOADING SEQUENCE ── */
    function onSceneReady() {
      const loader = $('loader');
      const wordmark = loader.querySelector('.loader-wordmark');
      const heroOverlay = $('hero-overlay');

      if (prefersReducedMotion) {
        loader.style.display = 'none';
        heroOverlay.style.opacity = '1';
        heroOverlay.style.pointerEvents = 'auto';
        camera.position.copy(KF[0].pos);
        camera.lookAt(KF[0].target);
        revealHeroText();
        loop();
        return;
      }

      const tl = gsap.timeline();
      tl.to(wordmark, { opacity: 1, duration: 0.4 })
        .to(wordmark, { opacity: 1, duration: 0.3 })
        .to(loader,   { opacity: 0, scale: 1.04, duration: 0.5, onComplete: () => { loader.style.display = 'none'; } })
        .to(keyLight, { intensity: 1.5, duration: 1.2, ease: 'power1.inOut' }, '-=0.1')
        .to(fillLight,{ intensity: 0.3, duration: 1.2, ease: 'power1.inOut' }, '<')
        .add(() => {
          if (rectLight) gsap.to(rectLight, { intensity: 0.8, duration: 1.0 });
        }, '<')
        .add(() => {
          heroOverlay.style.opacity = '1';
          heroOverlay.style.pointerEvents = 'auto';
          revealHeroText();
        }, '-=0.3')
        .fromTo('.btn-green', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', delay: 1.0 });

      loop();
    }

    /* Allow a frame for scene to compile, then fire */
    renderer.render(scene, camera);
    requestAnimationFrame(() => requestAnimationFrame(onSceneReady));
  }

  /* ── INIT ── */
  window.addEventListener('DOMContentLoaded', () => {
    if (isMobile()) {
      /* On mobile: skip Three.js, show mobile cards directly */
      $('loader').style.display = 'none';
      $('scene-canvas').style.display = 'none';
      $('scene-scroll-driver').style.display = 'none';
      $('hero-overlay').style.display = 'none';
      return;
    }

    initScene();
    initCursor();
    initCardTilt();
    initNav();
  });

  /* Nav also works on mobile */
  window.addEventListener('DOMContentLoaded', initNav);

})();
</script>
</body>
</html>
```

- [ ] **Step 2: Open the file in a browser to do a visual sanity check**

Open `docs/index.html` directly in a Chromium browser (drag-drop or `file://` path). Verify:
- Page loads without JS errors in DevTools console
- Loader wordmark appears briefly then fades
- Three.js desk scene is visible (dark room, walnut desk, monitor, keyboard)
- Hero text "Tweakly" reveals letter-by-letter
- Typewriter subtitle appears
- Glass cards are not visible at scroll=0 (only hero overlay is)

- [ ] **Step 3: Scroll test**

Scroll slowly through the full page. Verify:
- Camera smoothly dolly-moves through all 6 stops
- At each stop, the correct glass card fades in
- Cards fade out when scrolling away
- Footer appears after the scroll driver ends

- [ ] **Step 4: Commit**

```bash
cd docs && git add index.html
git commit -m "feat: replace landing page with Three.js 3D desk scene

Cinematic landing page with scroll-driven camera dolly through a
procedural walnut desk scene. 6 keyframe stops with glass cards,
GSAP ScrollTrigger, loader sequence, and custom cursor.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Visual Polish & Micro-interaction Refinement

**Files:**
- Modify: `docs/index.html` (JS and CSS sections only)

After the basic scene works, apply these visual refinements:

- [ ] **Step 1: Verify card tilt works on all glass cards**

Hover over each `.glass-card` on desktop. Confirm:
- Card tilts up to ±8deg following mouse
- Releases smoothly back to flat
- Green glow appears on hover
- Rotating border gradient animates

- [ ] **Step 2: Verify ripple on buttons and cards**

Click each `.btn` and `.glass-card`. Confirm expanding circle ripple appears at click point and fades out within 600ms.

- [ ] **Step 3: Verify custom cursor**

On desktop, move mouse. Confirm:
- 40px circle follows with slight lag (lerp)
- Expands to 60px on hover over buttons/links/cards
- Cursor is hidden on mobile (`display:none`)

- [ ] **Step 4: Verify nav scroll behavior**

Scroll down. Confirm nav pill transitions from `rgba(255,255,255,0.03)` to `rgba(0,0,0,0.75)`.

- [ ] **Step 5: Verify reduced motion**

Open DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Reload page. Confirm:
- No typewriter
- No letter-by-letter reveal (title shows instantly)
- No card tilt
- Camera jumps to keyframe positions instead of lerping

- [ ] **Step 6: Commit**

```bash
git add docs/index.html
git commit -m "polish: verify and confirm all micro-interactions working

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Mobile Layout Verification

**Files:**
- Modify: `docs/index.html` (CSS `@media` block if fixes needed)

- [ ] **Step 1: Test mobile layout**

Open DevTools → toggle device toolbar → iPhone 14 (390×844). Confirm:
- Three.js canvas and scene scroll driver are hidden
- Mobile cards wrap is visible
- All content (hero, features, how it works, CTA email form) is readable
- No horizontal overflow

- [ ] **Step 2: Fix any overflow or layout issues**

If any element overflows horizontally, add `overflow-x: hidden` to the offending container or reduce padding.

- [ ] **Step 3: Test tablet (768px)**

Toggle to iPad Air (820×1180). Confirm the Three.js scene renders (not mobile layout). Glass cards are positioned correctly — none overlap the nav.

- [ ] **Step 4: Commit if changes made**

```bash
git add docs/index.html
git commit -m "fix: mobile layout adjustments for landing page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Deploy to Cloudflare Pages

**Files:** None — deploy only.

- [ ] **Step 1: Check Cloudflare deploy config**

Read `c:\Users\alexa\.claude\projects\c--Users-alexa-tweakly\memory\reference_cloudflare.md` for the exact deploy command and token.

- [ ] **Step 2: Commit all remaining changes**

```bash
cd c:/Users/alexa/tweakly
git add docs/index.html
git status
git diff --staged --stat
```

Confirm only `docs/index.html` is staged (and any other intentional changes).

```bash
git commit -m "feat: cinematic 3D desk scene landing page

Three.js procedural desk scene, scroll-driven camera dolly,
glass morphism cards, GSAP loader sequence, dark forest green
accent palette, custom cursor, full mobile fallback.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 3: Deploy**

Run the Cloudflare Pages deploy command from memory (reference_cloudflare.md). Expected output: a deployment URL and `Success` status.

- [ ] **Step 4: Verify live site**

Open `https://tweakly.pages.dev/` in a browser. Confirm:
- Loader appears
- 3D desk scene renders
- Scroll drives camera through all 6 stops
- Footer links (over-ons.html, contact.html etc.) still work
- No console errors

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Three.js r160 + GSAP ScrollTrigger via CDN
- ✅ Procedural geometry — no .glb files
- ✅ 6 camera keyframes with correct positions/targets
- ✅ All 6 glass cards with correct content
- ✅ Dark forest green `#2d6a2d` palette
- ✅ Gradient text (white → `#4a9a4a`)
- ✅ Text glow on hero title
- ✅ Walnut desk, monitor, PC tower with glass panel, keyboard, phone, mic, speakers, LED strip
- ✅ Warm amber key light, cool RectAreaLight, ambient, fill
- ✅ Shadows (PCFSoftShadowMap, disabled on mobile)
- ✅ Loader sequence with GSAP timeline
- ✅ Letter-by-letter hero title reveal
- ✅ Typewriter subtitle
- ✅ CTA button breathing pulse animation
- ✅ Glass card 3D tilt ±8deg
- ✅ Rotating conic-gradient border on hover
- ✅ Water ripple on click
- ✅ Custom cursor with lerp lag, scales on hover
- ✅ Noise grain overlay
- ✅ Nav glass pill, scroll opacity transition, mobile hamburger
- ✅ Footer with all existing legal links preserved
- ✅ `prefers-reduced-motion` support
- ✅ Mobile fallback (no Three.js, stacked cards)
- ✅ `devicePixelRatio` capped at 2
- ✅ RAF paused on tab hidden
- ✅ Marquee of 10 stores (doubled for seamless loop)
- ✅ Email input with green focus glow
- ✅ Underline slide animation on nav links
- ✅ Hero badge with pulsing dot
