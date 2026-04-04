import {Circle, Img, makeScene2D, Rect, Txt} from '@motion-canvas/2d';
import {all, createRef, createSignal, easeInOutCubic, easeOutCubic, linear, loop, spawn, waitFor} from '@motion-canvas/core';
import {Reference, ThreadGenerator} from '@motion-canvas/core';
import logoSrc from '../assets/logo.png';

// ── Helpers ────────────────────────────────────────────────

function* typeText(node: Reference<Txt>, text: string, cps = 18): ThreadGenerator {
  for (let i = 1; i <= text.length; i++) {
    node().text(text.slice(0, i));
    yield* waitFor(1 / cps);
  }
}

function* showResult(
  resultCard: Reference<Rect>,
  resultSnip: Reference<Txt>,
  cursorDot: Reference<Circle>,
  clickFlash: Reference<Rect>,
  queryTxt: Reference<Txt>,
  snippet: string,
): ThreadGenerator {
  resultSnip().text(snippet);
  yield* all(
    resultCard().opacity(1, 0.5, easeOutCubic),
    resultCard().position.y(200, 0.5, easeOutCubic),
  );
  yield* waitFor(0.5);
  cursorDot().opacity(1);
  cursorDot().position({x: 0, y: 60});
  yield* cursorDot().position({x: -200, y: 200}, 0.6, easeInOutCubic);
  yield* all(
    cursorDot().scale(1.5, 0.15, easeOutCubic),
    clickFlash().opacity(0.12, 0.1),
  );
  yield* all(
    cursorDot().scale(1, 0.15, easeOutCubic),
    clickFlash().opacity(0, 0.2),
  );
  yield* waitFor(0.2);
  yield* all(
    resultCard().opacity(0, 0.35),
    cursorDot().opacity(0, 0.2),
    resultCard().position.y(220, 0.35),
  );
  queryTxt().text('');
  resultCard().position.y(220);
}

/** Returns evenly-spaced points clockwise around a pill shape. */
function pillPath(cx: number, cy: number, w: number, h: number, steps = 300): {x: number; y: number}[] {
  const r = h / 2;
  const pts: {x: number; y: number}[] = [];
  const straightW = w - 2 * r;

  // Top edge: left→right
  for (let i = 0; i < steps; i++) {
    pts.push({x: cx - straightW / 2 + straightW * (i / steps), y: cy - r});
  }
  // Right semicircle: top→bottom
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI / 2 + Math.PI * (i / steps);
    pts.push({x: cx + straightW / 2 + Math.cos(a) * r, y: cy + Math.sin(a) * r});
  }
  // Bottom edge: right→left
  for (let i = 0; i < steps; i++) {
    pts.push({x: cx + straightW / 2 - straightW * (i / steps), y: cy + r});
  }
  // Left semicircle: bottom→top
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI / 2 + Math.PI * (i / steps);
    pts.push({x: cx - straightW / 2 + Math.cos(a) * r, y: cy + Math.sin(a) * r});
  }
  return pts;
}

export default makeScene2D(function* (view) {
  // ── Constants ──────────────────────────────────────────
  const W = 1920;
  const H = 1080;
  const GREEN = '#30D158';
  const WHITE = '#ffffff';
  const BOX_W = 900;
  const BOX_H = 120;
  const BOX_RADIUS = BOX_H / 2; // full pill

  // ── Refs ───────────────────────────────────────────────
  const logoImg   = createRef<Img>();
  const logoTxt   = createRef<Txt>();
  const searchBox = createRef<Rect>();
  const queryTxt  = createRef<Txt>();

  // Comet
  const COMET_TAIL = 80;
  const ORBIT_DURATION = 9;
  const BOX_CX = 0;
  const BOX_CY = 60;
  const cometAngle = createSignal(0);
  const path = pillPath(BOX_CX, BOX_CY, BOX_W, BOX_H, 400);
  const N = path.length;
  const tailRefs = Array.from({length: COMET_TAIL}, () => createRef<Circle>());
  const cometContainer = createRef<Rect>();

  // Result card
  const resultCard  = createRef<Rect>();
  const resultUrl   = createRef<Txt>();
  const resultTitle = createRef<Txt>();
  const resultSnip  = createRef<Txt>();
  const cursorDot   = createRef<Circle>();
  const clickFlash  = createRef<Rect>();

  // Outro
  const tagline = createRef<Txt>();
  const outroBg = createRef<Rect>();

  // ── Layout ─────────────────────────────────────────────
  view.add(
    <>
      {/* Background */}
      <Rect width={W} height={H} fill={'#000000'} />

      {/* Logo row — centered, 160px above center */}
      <Img
        ref={logoImg}
        src={logoSrc}
        width={90}
        height={90}
        x={-260}
        y={-160}
        opacity={0}
        scale={0.95}
      />
      <Txt
        ref={logoTxt}
        text={'tweakly'}
        fontSize={76}
        fontWeight={800}
        fontFamily={'SF Pro Display, system-ui, sans-serif'}
        fill={WHITE}
        letterSpacing={-3}
        x={60}
        y={-160}
        opacity={0}
        scale={0.95}
      />

      {/* Search box */}
      <Rect
        ref={searchBox}
        width={BOX_W}
        height={BOX_H}
        radius={BOX_RADIUS}
        fill={'#0d0d0d'}
        y={60}
        opacity={0}
      >
        <Txt
          ref={queryTxt}
          text={''}
          fontSize={26}
          fontWeight={400}
          fontFamily={'SF Pro Display, system-ui, sans-serif'}
          fill={WHITE}
          x={-(BOX_W / 2) + 56}
          textAlign={'left'}
          offsetX={-1}
        />
      </Rect>

      {/* Comet tail dots */}
      <Rect ref={cometContainer} width={0} height={0} x={0} y={0}>
        {tailRefs.map((ref, i) => (
          <Circle
            key={i}
            ref={ref}
            size={0}
            fill={GREEN}
            opacity={0}
            zIndex={1}
          />
        ))}
      </Rect>

      {/* Result card */}
      <Rect
        ref={resultCard}
        width={BOX_W}
        height={110}
        radius={20}
        fill={'#111111'}
        stroke={'rgba(255,255,255,0.08)'}
        lineWidth={1}
        x={0}
        y={220}
        opacity={0}
      >
        <Txt
          ref={resultUrl}
          text={'tweakly.app › prijzen'}
          fontSize={15}
          fill={GREEN}
          fontFamily={'SF Pro Display, system-ui, sans-serif'}
          x={-(BOX_W / 2) + 32}
          y={-28}
          textAlign={'left'}
          offsetX={-1}
        />
        <Txt
          ref={resultTitle}
          text={'tweakly — Altijd de beste prijs'}
          fontSize={20}
          fontWeight={600}
          fill={WHITE}
          fontFamily={'SF Pro Display, system-ui, sans-serif'}
          x={-(BOX_W / 2) + 32}
          y={0}
          textAlign={'left'}
          offsetX={-1}
        />
        <Txt
          ref={resultSnip}
          text={''}
          fontSize={14}
          fill={'rgba(255,255,255,0.4)'}
          fontFamily={'SF Pro Display, system-ui, sans-serif'}
          x={-(BOX_W / 2) + 32}
          y={26}
          textAlign={'left'}
          offsetX={-1}
        />
      </Rect>

      {/* Cursor dot */}
      <Circle ref={cursorDot} size={16} fill={WHITE} opacity={0} zIndex={10} x={0} y={60} />

      {/* Click flash */}
      <Rect ref={clickFlash} width={W} height={H} fill={WHITE} opacity={0} zIndex={20} />

      {/* Tagline */}
      <Txt
        ref={tagline}
        text={'Prijsvergelijking voor Nederland.'}
        fontSize={22}
        fontFamily={'SF Pro Display, system-ui, sans-serif'}
        fill={'rgba(255,255,255,0.5)'}
        letterSpacing={2}
        y={-90}
        opacity={0}
      />

      {/* Outro overlay */}
      <Rect ref={outroBg} width={W} height={H} fill={'#000000'} opacity={0} zIndex={30} />
    </>,
  );

  // ── Beat 1: Intro (0–1.5s) ────────────────────────────
  yield* waitFor(0.3);
  yield* all(
    logoImg().opacity(1, 0.8, easeInOutCubic),
    logoImg().scale(1, 0.8, easeInOutCubic),
    logoTxt().opacity(1, 0.8, easeInOutCubic),
    logoTxt().scale(1, 0.8, easeInOutCubic),
    searchBox().opacity(1, 0.8, easeInOutCubic),
  );

  // ── Comet (background, loops forever) ─────────────────
  spawn(
    loop(Infinity, function* () {
      yield* cometAngle(cometAngle() + 1, ORBIT_DURATION, linear);
    }),
  );

  spawn(
    loop(Infinity, function* () {
      const headIdx = Math.floor((cometAngle() % 1) * N);
      for (let i = 0; i < COMET_TAIL; i++) {
        const tailPos = ((headIdx - i) % N + N) % N;
        const pt = path[tailPos];
        const frac = 1 - i / COMET_TAIL;
        const isHead = i === 0;
        tailRefs[i]().position({x: pt.x, y: pt.y});
        tailRefs[i]().size(isHead ? 22 : 6 + frac * 14);
        tailRefs[i]().opacity(isHead ? 1 : Math.pow(frac, 1.2) * 0.95);
        tailRefs[i]().fill(isHead ? '#ffffff' : i < 8 ? '#c8ffe0' : GREEN);
      }
      yield; // single yield outside loop — updates all 80 nodes every frame
    }),
  );

  // ── Beat 2: Query 1 types in ───────────────────────────
  yield* waitFor(0.5);
  yield* typeText(queryTxt, 'goedkoopste RTX 4080 vinden');
  yield* waitFor(0.8);

  // ── Beat 3+4: Result 1 + click ─────────────────────────
  yield* showResult(
    resultCard, resultSnip, cursorDot, clickFlash, queryTxt,
    'Vergelijk prijzen, volg deals en ontvang meldingen · RTX 4080 vanaf €799',
  );
  yield* waitFor(0.4);

  // ── Beat 5: pause ─────────────────────────────────────
  yield* waitFor(0.3);

  // ── Beat 6: Query 2 ───────────────────────────────────
  yield* typeText(queryTxt, 'prijs iPhone 16 in de gaten houden');
  yield* waitFor(0.8);
  yield* showResult(
    resultCard, resultSnip, cursorDot, clickFlash, queryTxt,
    'Stel een prijsalert in · iPhone 16 128GB vanaf €799',
  );
  yield* waitFor(0.3);

  // ── Beat 7: Query 3 ───────────────────────────────────
  yield* typeText(queryTxt, 'reviews vergelijken voor laptops');
  yield* waitFor(0.8);
  yield* showResult(
    resultCard, resultSnip, cursorDot, clickFlash, queryTxt,
    'Lees reviews en vergelijk specs · tot 20 laptops naast elkaar',
  );
  yield* waitFor(0.3);

  // ── Beat 8: Outro ─────────────────────────────────────
  yield* all(
    searchBox().opacity(0, 0.6, easeInOutCubic),
    cometContainer().opacity(0, 0.6, easeInOutCubic),
  );
  yield* tagline().opacity(1, 0.8, easeInOutCubic);
  yield* waitFor(3.5);
  yield* outroBg().opacity(1, 2, easeInOutCubic);
  yield* waitFor(0.5);
});
