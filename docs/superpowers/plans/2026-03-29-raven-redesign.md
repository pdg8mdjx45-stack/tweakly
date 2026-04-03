# Tweakly Landing — Raven Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `docs/index.html` as a Raven Trading-style landing page themed for Tweakly — scroll-snap sections, GSAP scramble text, Lenis smooth scroll, Tweakly green on black, Dutch copy.

**Architecture:** Single self-contained HTML file with all CSS and JS inline. Six full-viewport scroll-snap sections. GSAP + ScrambleText loaded via CDN. Lenis smooth scroll integrated with GSAP ticker. No backend — product link feature is static UI only.

**Tech Stack:** HTML/CSS/JS (no build), GSAP 3 + ScrambleText plugin (CDN), Lenis (CDN), CSS scroll-snap

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `docs/index.html` | **Rewrite** | Entire landing page — all CSS + JS inline |

---

### Task 1: HTML skeleton + CSS tokens + scroll-snap structure

**Files:**
- Rewrite: `docs/index.html`

- [ ] **Step 1: Write the full HTML skeleton**

Replace the entire contents of `docs/index.html` with this:

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tweakly — Slimme prijsvergelijking</title>
  <meta name="description" content="Plak een productlink. Wij zoeken de beste prijs en kortingscodes voor je.">
  <link rel="icon" href="logo.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    /* TOKENS */
    :root {
      --green: #30D158;
      --green-dim: rgba(48,209,88,0.15);
      --green-glow: rgba(48,209,88,0.35);
      --bg: #000;
      --text: #fff;
      --text-2: rgba(255,255,255,0.55);
      --text-3: rgba(255,255,255,0.28);
      --glass-bg: rgba(255,255,255,0.04);
      --glass-border: rgba(255,255,255,0.10);
      --font: 'Inter', -apple-system, sans-serif;
    }

    /* RESET */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: auto; } /* Lenis handles smooth scroll */
    body {
      font-family: var(--font);
      font-weight: 300;
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }
    a { text-decoration: none; color: inherit; }
    button { font-family: inherit; cursor: pointer; border: none; }

    /* GRAIN */
    .grain {
      position: fixed; inset: 0; pointer-events: none; z-index: 9999;
      opacity: 0.022;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 128px 128px;
    }

    /* SCROLL CONTAINER */
    .scroll-container {
      height: 100vh;
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
    }

    /* SECTIONS */
    .section {
      height: 100vh;
      scroll-snap-align: start;
      display: flex;
      align-items: center;
      padding: 0 clamp(24px, 6vw, 100px);
      position: relative;
    }

    /* NAV */
    .nav-wrap {
      position: fixed; top: 1.25rem; left: 50%; transform: translateX(-50%);
      z-index: 1000; width: calc(100% - 2rem); max-width: 52rem;
    }
    .nav {
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
      background: rgba(0,0,0,0.7);
      border-color: rgba(255,255,255,0.08);
    }
    .nav-brand {
      display: flex; align-items: center; gap: 10px;
      font-size: 1.05rem; font-weight: 600;
      color: var(--green);
    }
    .nav-brand img { width: 22px; height: 22px; }
    .nav-links {
      display: flex; align-items: center; gap: 2px; list-style: none;
    }
    .nav-links a {
      font-size: 0.82rem; font-weight: 400;
      color: var(--text-2);
      padding: 7px 14px; border-radius: 9999px;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: var(--text); }
    .nav-cta {
      background: var(--green); color: #000;
      font-weight: 600; font-size: 0.82rem;
      padding: 8px 20px; border-radius: 9999px;
      transition: opacity 0.2s, transform 0.2s;
    }
    .nav-cta:hover { opacity: 0.88; transform: scale(1.03); }
    .menu-btn {
      display: none; background: none; color: var(--text);
      font-size: 1.2rem; padding: 8px 14px;
    }

    /* SECTION DOTS */
    .section-dots {
      position: fixed; right: clamp(16px, 2vw, 32px); top: 50%;
      transform: translateY(-50%);
      z-index: 100; display: flex; flex-direction: column;
      gap: 12px; align-items: center;
    }
    .section-dot {
      width: 4px; height: 4px; border-radius: 50%;
      background: rgba(255,255,255,0.18);
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.34,1.3,0.64,1);
      border: none;
    }
    .section-dot.active {
      background: var(--green);
      transform: scale(2.2);
      box-shadow: 0 0 8px var(--green-glow);
    }

    /* BUTTONS */
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 13px 28px; border-radius: 9999px;
      font-size: 0.88rem; font-weight: 500;
      transition: all 0.22s cubic-bezier(0.34,1.3,0.64,1);
    }
    .btn-green {
      background: var(--green); color: #000; font-weight: 600;
      box-shadow: 0 6px 24px var(--green-glow);
    }
    .btn-green:hover { opacity: 0.88; transform: translateY(-2px) scale(1.02); }
    .btn-ghost {
      background: var(--glass-bg); color: var(--text);
      border: 0.5px solid var(--glass-border);
      backdrop-filter: blur(20px);
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }

    /* ── HERO ── */
    #s1 { align-items: flex-end; padding-bottom: clamp(6rem, 12vh, 10rem); }
    .hero-content { max-width: 720px; }
    .hero-badge {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 0.65rem; font-weight: 500;
      letter-spacing: 0.16em; text-transform: uppercase;
      color: var(--green); padding: 6px 16px;
      border-radius: 9999px;
      background: var(--green-dim);
      border: 0.5px solid rgba(48,209,88,0.25);
      margin-bottom: 1.5rem;
    }
    .badge-dot {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green-glow);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:0.3;transform:scale(0.7);} }

    .hero-title {
      font-size: clamp(3.8rem, 11vw, 9rem);
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 0.9;
      margin-bottom: 0.1em;
    }
    .hero-title .scramble-word {
      display: block;
      color: var(--green);
      min-height: 1em;
    }
    .hero-sub {
      font-size: clamp(0.95rem, 1.5vw, 1.1rem);
      font-weight: 300;
      color: var(--text-2);
      line-height: 1.75;
      max-width: 460px;
      margin-top: 1.5rem;
    }
    .hero-btns {
      display: flex; gap: 10px; flex-wrap: wrap;
      margin-top: 2.2rem;
    }

    /* ── PRODUCT LINK ── */
    #s2 { justify-content: center; text-align: center; }
    .link-section { max-width: 640px; width: 100%; }
    .section-eyebrow {
      font-size: 0.62rem; font-weight: 500;
      letter-spacing: 0.18em; text-transform: uppercase;
      color: var(--green); margin-bottom: 1rem;
    }
    .section-heading {
      font-size: clamp(2.2rem, 5vw, 4.5rem);
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 0.92;
      margin-bottom: 1.2rem;
    }
    .section-sub {
      font-size: clamp(0.9rem, 1.3vw, 1.05rem);
      color: var(--text-2); line-height: 1.75;
      margin-bottom: 2rem;
    }
    .link-input-wrap {
      display: flex; gap: 0;
      background: rgba(255,255,255,0.05);
      border: 0.5px solid var(--glass-border);
      border-radius: 9999px;
      padding: 4px 4px 4px 20px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .link-input-wrap:focus-within {
      border-color: rgba(48,209,88,0.45);
      box-shadow: 0 0 0 3px rgba(48,209,88,0.08);
    }
    .link-input {
      flex: 1; background: none; border: none; outline: none;
      color: var(--text); font-family: var(--font);
      font-size: 0.88rem; font-weight: 300;
    }
    .link-input::placeholder { color: var(--text-3); }
    .link-submit {
      background: var(--green); color: #000;
      font-weight: 600; font-size: 0.82rem;
      padding: 10px 22px; border-radius: 9999px;
      transition: opacity 0.2s, transform 0.15s;
      white-space: nowrap;
    }
    .link-submit:hover { opacity: 0.88; transform: scale(1.03); }
    .link-result {
      margin-top: 1.2rem;
      display: none;
      flex-direction: column; gap: 8px;
      align-items: center;
    }
    .link-result.show { display: flex; }
    .promo-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(48,209,88,0.12);
      border: 0.5px solid rgba(48,209,88,0.3);
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 0.82rem; font-weight: 500;
      color: var(--green);
    }
    .added-badge {
      font-size: 0.78rem; color: var(--text-2);
    }

    /* ── FUNCTIES ── */
    #s3 { justify-content: center; }
    .functies-layout { max-width: 1000px; width: 100%; }
    .functies-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      background: rgba(255,255,255,0.08);
      border-radius: 20px; overflow: hidden;
      border: 0.5px solid rgba(255,255,255,0.12);
      margin-top: 2.5rem;
    }
    .functie-item {
      padding: 2.5rem 2rem;
      background: rgba(8,8,8,0.9);
      backdrop-filter: blur(40px);
    }
    .functie-icon {
      font-size: 1.5rem; margin-bottom: 1rem;
      display: block;
    }
    .functie-title {
      font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;
    }
    .functie-desc {
      font-size: 0.82rem; color: var(--text-2); line-height: 1.6;
    }

    /* ── WINKELS ── */
    #s4 { justify-content: center; flex-direction: column; text-align: center; }
    .winkels-layout { max-width: 1000px; width: 100%; }
    .marquee-wrap {
      overflow: hidden; margin-top: 3rem;
      -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
      mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
    }
    .marquee-track {
      display: flex; gap: 4rem; align-items: center;
      animation: marquee 18s linear infinite;
      width: max-content;
    }
    .marquee-wrap:hover .marquee-track { animation-play-state: paused; }
    @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    .shop-name {
      font-size: 1.1rem; font-weight: 500;
      color: var(--text-2);
      white-space: nowrap;
      transition: color 0.2s;
    }
    .shop-name:hover { color: var(--text); }
    .shop-sep { color: var(--text-3); font-size: 1rem; }

    /* ── WAAROM ── */
    #s5 { justify-content: center; }
    .waarom-layout { max-width: 900px; width: 100%; }
    .waarom-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 4rem; margin-top: 3rem;
    }
    .waarde-num {
      font-size: 2.5rem; font-weight: 600;
      color: rgba(255,255,255,0.08);
      letter-spacing: -0.05em;
      margin-bottom: 0.5rem;
      font-variant-numeric: tabular-nums;
    }
    .waarde-title {
      font-size: 1.2rem; font-weight: 600; margin-bottom: 0.6rem;
    }
    .waarde-desc {
      font-size: 0.85rem; color: var(--text-2); line-height: 1.65;
    }

    /* ── DOWNLOAD ── */
    #s6 { justify-content: center; text-align: center; flex-direction: column; }
    .download-layout { max-width: 700px; }
    .download-title {
      font-size: clamp(3rem, 8vw, 7rem);
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 0.9;
      margin-bottom: 1.5rem;
    }
    .download-title .green { color: var(--green); }
    .download-btns {
      display: flex; gap: 12px; justify-content: center;
      flex-wrap: wrap; margin-top: 2rem;
    }
    .store-btn {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 14px 28px; border-radius: 16px;
      font-size: 0.88rem; font-weight: 500;
      background: rgba(255,255,255,0.06);
      border: 0.5px solid rgba(255,255,255,0.15);
      color: var(--text);
      transition: background 0.2s, transform 0.2s;
    }
    .store-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
    .store-btn .store-icon { font-size: 1.3rem; }
    .store-btn-label { text-align: left; }
    .store-btn-sub { font-size: 0.65rem; color: var(--text-2); display: block; }
    .store-btn-name { font-size: 0.92rem; font-weight: 600; }

    /* FADE-UP ANIMATION */
    .fade-up {
      opacity: 0; transform: translateY(32px);
      transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1);
    }
    .fade-up.visible { opacity: 1; transform: translateY(0); }
    .fd1 { transition-delay: 0.05s; }
    .fd2 { transition-delay: 0.15s; }
    .fd3 { transition-delay: 0.28s; }
    .fd4 { transition-delay: 0.42s; }
    .fd5 { transition-delay: 0.55s; }

    /* MOBILE */
    @media (max-width: 800px) {
      .scroll-container {
        scroll-snap-type: none;
        height: auto; overflow-y: auto;
      }
      .section {
        height: auto; min-height: 100vh;
        scroll-snap-align: none;
        padding: clamp(5rem, 10vw, 8rem) clamp(16px, 5vw, 32px);
      }
      #s1 { min-height: 100vh; align-items: flex-end; padding-bottom: 4rem; }
      .section-dots { display: none; }
      .functies-grid { grid-template-columns: 1fr; }
      .waarom-grid { grid-template-columns: 1fr; gap: 2rem; }
      .nav-links { display: none; }
      .menu-btn { display: block; }
      .nav-links.open {
        display: flex; flex-direction: column;
        position: fixed; top: 76px; left: 1rem; right: 1rem;
        background: rgba(0,0,0,0.92);
        backdrop-filter: blur(40px);
        border-radius: 20px;
        border: 0.5px solid var(--glass-border);
        padding: 0.5rem 0;
      }
      .nav-links.open a { padding: 14px 20px; color: var(--text); font-size: 0.95rem; }
      .fade-up { opacity: 1; transform: none; }
    }

    /* COOKIE BAR */
    #cookie-bar {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 9998;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(30px);
      border-top: 0.5px solid var(--glass-border);
      padding: 1.2rem 1.8rem;
      display: flex; align-items: center; gap: 1.2rem; flex-wrap: wrap;
      transform: translateY(100%);
      transition: transform 0.5s cubic-bezier(0.34,1.1,0.64,1);
    }
    #cookie-bar.show { transform: translateY(0); }
    .cookie-text { flex: 1; min-width: 220px; font-size: 0.78rem; color: var(--text-2); line-height: 1.6; }
    .cookie-text strong { color: var(--text); }
    .cookie-text a { color: var(--green); text-decoration: underline; }
    .cookie-btns { display: flex; gap: 7px; }
    .cookie-btn { padding: 9px 18px; border-radius: 9999px; font-size: 0.76rem; font-weight: 500; transition: all 0.18s; }
    .cookie-accept { background: var(--green); color: #000; font-weight: 600; }
    .cookie-accept:hover { opacity: 0.88; }
    .cookie-essential { background: var(--glass-bg); color: var(--text); border: 0.5px solid var(--glass-border); }
    .cookie-essential:hover { background: rgba(255,255,255,0.08); }
  </style>
</head>
<body>

<div class="grain" aria-hidden="true"></div>

<!-- NAV -->
<div class="nav-wrap">
  <nav class="nav" id="nav">
    <a href="/" class="nav-brand"><img src="logo.png" alt="Tweakly"> Tweakly</a>
    <ul class="nav-links" id="navLinks">
      <li><a href="#s2" data-section="1">Productlink</a></li>
      <li><a href="#s3" data-section="2">Functies</a></li>
      <li><a href="#s4" data-section="3">Winkels</a></li>
      <li><a href="over-ons.html">Over ons</a></li>
      <li><a href="contact.html">Contact</a></li>
    </ul>
    <button class="nav-cta" id="navCta">Download</button>
    <button class="menu-btn" id="menuBtn">&#9776;</button>
  </nav>
</div>

<!-- SECTION DOTS -->
<div class="section-dots" id="sectionDots">
  <button class="section-dot active" data-index="0"></button>
  <button class="section-dot" data-index="1"></button>
  <button class="section-dot" data-index="2"></button>
  <button class="section-dot" data-index="3"></button>
  <button class="section-dot" data-index="4"></button>
  <button class="section-dot" data-index="5"></button>
</div>

<!-- SCROLL CONTAINER -->
<div class="scroll-container" id="scrollContainer">

  <!-- S1: HERO -->
  <section class="section" id="s1">
    <div class="hero-content">
      <div class="hero-badge fade-up fd1"><span class="badge-dot"></span>Nu gratis beschikbaar</div>
      <h1 class="hero-title">
        <span class="fade-up fd2">Slimme</span>
        <span class="scramble-word fade-up fd3" id="scrambleWord">prijsvergelijking</span>
      </h1>
      <p class="hero-sub fade-up fd4">Plak een productlink. Wij zoeken de beste prijs en kortingscodes voor je — bij 5 winkels tegelijk.</p>
      <div class="hero-btns fade-up fd5">
        <button class="btn btn-green" onclick="document.getElementById('s2').scrollIntoView({behavior:'smooth'})">Probeer het nu &rarr;</button>
        <button class="btn btn-ghost" id="navCtaHero">Download app</button>
      </div>
    </div>
  </section>

  <!-- S2: PRODUCT LINK -->
  <section class="section" id="s2">
    <div class="link-section">
      <p class="section-eyebrow fade-up fd1">Nieuw</p>
      <h2 class="section-heading fade-up fd2">Plak.<br>Wij regelen<br>de rest.</h2>
      <p class="section-sub fade-up fd3">Kopieer een productpagina van elke webshop. Tweakly zoekt kortingscodes en voegt het product direct toe aan de database.</p>
      <div class="fade-up fd4">
        <div class="link-input-wrap">
          <input class="link-input" id="linkInput" type="url" placeholder="https://www.coolblue.nl/product/..." autocomplete="off" spellcheck="false">
          <button class="link-submit" id="linkSubmit">Zoeken</button>
        </div>
        <div class="link-result" id="linkResult">
          <div class="promo-badge">🏷 ZOMER10 &mdash; 10% korting</div>
          <p class="added-badge">✓ Product toegevoegd aan de database</p>
        </div>
      </div>
    </div>
  </section>

  <!-- S3: FUNCTIES -->
  <section class="section" id="s3">
    <div class="functies-layout">
      <p class="section-eyebrow fade-up fd1">Functies</p>
      <h2 class="section-heading fade-up fd2">Alles wat je<br>nodig hebt.</h2>
      <div class="functies-grid">
        <div class="functie-item fade-up fd3">
          <span class="functie-icon">🔔</span>
          <div class="functie-title">Prijsalerts</div>
          <div class="functie-desc">Stel een doelprijs in. Wij sturen een melding zodra het product goedkoper wordt.</div>
        </div>
        <div class="functie-item fade-up fd4">
          <span class="functie-icon">⚖️</span>
          <div class="functie-title">Vergelijken</div>
          <div class="functie-desc">Bekijk prijzen bij Amazon, Coolblue, Bol.com, Alternate en MediaMarkt naast elkaar.</div>
        </div>
        <div class="functie-item fade-up fd5">
          <span class="functie-icon">📰</span>
          <div class="functie-title">Reviews &amp; Nieuws</div>
          <div class="functie-desc">Het laatste technieuws en reviews direct in de app, zodat je altijd goed geïnformeerd koopt.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- S4: WINKELS -->
  <section class="section" id="s4">
    <div class="winkels-layout">
      <p class="section-eyebrow fade-up fd1">Ondersteunde winkels</p>
      <h2 class="section-heading fade-up fd2">5 winkels.<br>Één app.</h2>
      <p class="section-sub fade-up fd3">We vergelijken prijzen bij de grootste Nederlandse en internationale webshops.</p>
      <div class="marquee-wrap fade-up fd4">
        <div class="marquee-track" id="marqueeTrack">
          <!-- duplicated for seamless loop -->
          <span class="shop-name">Amazon</span><span class="shop-sep">·</span>
          <span class="shop-name">Coolblue</span><span class="shop-sep">·</span>
          <span class="shop-name">Bol.com</span><span class="shop-sep">·</span>
          <span class="shop-name">Alternate</span><span class="shop-sep">·</span>
          <span class="shop-name">MediaMarkt</span><span class="shop-sep">·</span>
          <span class="shop-name">Amazon</span><span class="shop-sep">·</span>
          <span class="shop-name">Coolblue</span><span class="shop-sep">·</span>
          <span class="shop-name">Bol.com</span><span class="shop-sep">·</span>
          <span class="shop-name">Alternate</span><span class="shop-sep">·</span>
          <span class="shop-name">MediaMarkt</span><span class="shop-sep">·</span>
        </div>
      </div>
    </div>
  </section>

  <!-- S5: WAAROM -->
  <section class="section" id="s5">
    <div class="waarom-layout">
      <p class="section-eyebrow fade-up fd1">Waarom Tweakly</p>
      <h2 class="section-heading fade-up fd2">Gebouwd voor<br>slimme kopers.</h2>
      <div class="waarom-grid">
        <div class="fade-up fd3">
          <div class="waarde-num">01</div>
          <div class="waarde-title">Gratis</div>
          <div class="waarde-desc">Tweakly is volledig gratis. Geen abonnement, geen verborgen kosten. Altijd.</div>
        </div>
        <div class="fade-up fd4">
          <div class="waarde-num">02</div>
          <div class="waarde-title">Betrouwbaar</div>
          <div class="waarde-desc">Prijzen direct van de winkels. Geen misleidende "was-prijzen" of nep-aanbiedingen.</div>
        </div>
        <div class="fade-up fd5">
          <div class="waarde-num">03</div>
          <div class="waarde-title">Snel</div>
          <div class="waarde-desc">Resultaten in seconden. Geen eindeloos tabbladen vergelijken — wij doen het werk.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- S6: DOWNLOAD -->
  <section class="section" id="s6">
    <div class="download-layout">
      <p class="section-eyebrow fade-up fd1">Download</p>
      <h2 class="download-title fade-up fd2">Bespaar meer.<br><span class="green">Begin vandaag.</span></h2>
      <p class="section-sub fade-up fd3">Gratis te downloaden. Geen account vereist om te starten.</p>
      <div class="download-btns fade-up fd4">
        <a href="#" class="store-btn">
          <span class="store-icon">🍎</span>
          <span class="store-btn-label">
            <span class="store-btn-sub">Download in de</span>
            <span class="store-btn-name">App Store</span>
          </span>
        </a>
        <a href="#" class="store-btn">
          <span class="store-icon">▶</span>
          <span class="store-btn-label">
            <span class="store-btn-sub">Beschikbaar op</span>
            <span class="store-btn-name">Google Play</span>
          </span>
        </a>
      </div>
    </div>
  </section>

</div><!-- /scroll-container -->

<!-- COOKIE BAR -->
<div id="cookie-bar">
  <div class="cookie-text"><strong>We gebruiken cookies</strong> om de site te verbeteren. <a href="cookies.html">Meer info</a></div>
  <div class="cookie-btns">
    <button class="cookie-btn cookie-accept" id="cookieAccept">Accepteren</button>
    <button class="cookie-btn cookie-essential" id="cookieEssential">Alleen noodzakelijk</button>
  </div>
</div>

<!-- GSAP + ScrambleText -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://assets.codepen.io/16327/ScrambleTextPlugin.min.js"></script>
<!-- Lenis -->
<script src="https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>

<script>
  // ── GSAP ScrambleText setup ──────────────────────────────────────────
  gsap.registerPlugin(ScrambleTextPlugin);

  // ── Lenis smooth scroll ──────────────────────────────────────────────
  const scrollEl = document.getElementById('scrollContainer');
  const lenis = new Lenis({ wrapper: scrollEl, content: scrollEl, smoothWheel: true, duration: 1.2 });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // ── Section tracking via IntersectionObserver ───────────────────────
  const sections = Array.from(document.querySelectorAll('.section'));
  const dots = Array.from(document.querySelectorAll('.section-dot'));
  let scrambleDone = false;

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = sections.indexOf(entry.target);

      // Update dots
      dots.forEach((d, i) => d.classList.toggle('active', i === idx));

      // Fade-up children
      entry.target.querySelectorAll('.fade-up').forEach(el => el.classList.add('visible'));

      // Scramble hero word on first hero visit
      if (idx === 0 && !scrambleDone) {
        scrambleDone = true;
        const words = ['prijsvergelijking', 'kortingscodes', 'prijsalerts', 'vergelijker'];
        let wi = 0;
        const scrambleNext = () => {
          gsap.to('#scrambleWord', {
            duration: 1.2,
            scrambleText: { text: words[wi % words.length], chars: '!<>-_\\/[]{}—=+*^?#01234', revealDelay: 0.4, speed: 0.6 },
            onComplete: () => { wi++; setTimeout(scrambleNext, 2800); }
          });
        };
        setTimeout(scrambleNext, 400);
      }
    });
  }, { root: scrollEl, threshold: 0.45 });

  sections.forEach(s => sectionObserver.observe(s));

  // Trigger hero immediately
  document.querySelectorAll('#s1 .fade-up').forEach(el => el.classList.add('visible'));

  // ── Dot navigation ───────────────────────────────────────────────────
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index);
      sections[idx].scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ── Nav CTA → download section ───────────────────────────────────────
  document.getElementById('navCta').addEventListener('click', () => {
    document.getElementById('s6').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('navCtaHero').addEventListener('click', () => {
    document.getElementById('s6').scrollIntoView({ behavior: 'smooth' });
  });

  // ── Nav scroll state ──────────────────────────────────────────────────
  scrollEl.addEventListener('scroll', () => {
    document.getElementById('nav').classList.toggle('scrolled', scrollEl.scrollTop > 60);
  }, { passive: true });

  // ── Mobile menu ───────────────────────────────────────────────────────
  document.getElementById('menuBtn').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });

  // ── Product link demo ─────────────────────────────────────────────────
  document.getElementById('linkSubmit').addEventListener('click', () => {
    const val = document.getElementById('linkInput').value.trim();
    if (!val) return;
    const result = document.getElementById('linkResult');
    result.classList.add('show');
  });
  document.getElementById('linkInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('linkSubmit').click();
  });

  // ── Cookie bar ────────────────────────────────────────────────────────
  if (!localStorage.getItem('tw_cookie')) {
    setTimeout(() => document.getElementById('cookie-bar').classList.add('show'), 1200);
  }
  document.getElementById('cookieAccept').addEventListener('click', () => {
    localStorage.setItem('tw_cookie', '1');
    document.getElementById('cookie-bar').classList.remove('show');
  });
  document.getElementById('cookieEssential').addEventListener('click', () => {
    localStorage.setItem('tw_cookie', 'essential');
    document.getElementById('cookie-bar').classList.remove('show');
  });
</script>
</body>
</html>
```

- [ ] **Step 2: Verify the file was written correctly**

Open `docs/index.html` in a browser (or `npx serve docs`) and check:
- 6 sections scroll-snap correctly (desktop)
- Hero scramble text animates on load
- Section dots update as you scroll
- Product link input → submit → result badge shows
- Nav "Download" button scrolls to section 6
- Mobile (≤800px): normal flow, all sections visible, no scroll-snap

- [ ] **Step 3: Commit**

```bash
git add docs/index.html
git commit -m "feat: redesign landing page — Raven Trading style, Tweakly themed"
```

Expected output: `1 file changed` with a large diff (full rewrite from ~1944 lines to new file).

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Hero with scramble text + rotating words
- ✅ Product link section with input + mock promo result
- ✅ Functies — 3 cards
- ✅ Winkels marquee — all 5 shops
- ✅ Waarom Tweakly — 3 values
- ✅ Download CTA
- ✅ Sticky glass nav + section dots
- ✅ Lenis smooth scroll + GSAP
- ✅ Dutch copy throughout
- ✅ Mobile responsive fallback
- ✅ Cookie bar preserved

**No placeholders:** All code is complete and ready to paste.

**Type consistency:** Single-file, no cross-file dependencies.
