import {blur, Circle, Img, makeScene2D, Rect, Txt} from '@motion-canvas/2d';
import {
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  easeOutCubic,
  linear,
  loop,
  sequence,
  spawn,
  waitFor,
} from '@motion-canvas/core';
import logoSrc from '../assets/logo.png';

// ─────────────────────────────────────────────
// Typing helper
// ─────────────────────────────────────────────
function* typeText(
  node: any,
  text: string,
  cps = 14,
): Generator<any, void, any> {
  for (let i = 1; i <= text.length; i++) {
    node().text(text.slice(0, i));
    yield* waitFor(1 / cps);
  }
}

// ─────────────────────────────────────────────
// Pill path for comet (kept for aurora dots)
// ─────────────────────────────────────────────
function pillPath(
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
  steps = 300,
): {x: number; y: number}[] {
  const pts: {x: number; y: number}[] = [];
  const sw = w - 2 * r;
  const sh = h - 2 * r;

  // Top edge L→R
  for (let i = 0; i < steps; i++)
    pts.push({x: cx - sw / 2 + sw * (i / steps), y: cy - h / 2});
  // Top-right corner
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / steps);
    pts.push({x: cx + sw / 2 + Math.cos(a) * r, y: cy - sh / 2 + Math.sin(a) * r});
  }
  // Right edge T→B
  for (let i = 0; i < steps; i++)
    pts.push({x: cx + w / 2, y: cy - sh / 2 + sh * (i / steps)});
  // Bottom-right corner
  for (let i = 0; i < steps; i++) {
    const a = (Math.PI / 2) * (i / steps);
    pts.push({x: cx + sw / 2 + Math.cos(a) * r, y: cy + sh / 2 + Math.sin(a) * r});
  }
  // Bottom edge R→L
  for (let i = 0; i < steps; i++)
    pts.push({x: cx + sw / 2 - sw * (i / steps), y: cy + h / 2});
  // Bottom-left corner
  for (let i = 0; i < steps; i++) {
    const a = Math.PI / 2 + (Math.PI / 2) * (i / steps);
    pts.push({x: cx - sw / 2 + Math.cos(a) * r, y: cy + sh / 2 + Math.sin(a) * r});
  }
  // Left edge B→T
  for (let i = 0; i < steps; i++)
    pts.push({x: cx - w / 2, y: cy + sh / 2 - sh * (i / steps)});
  // Top-left corner
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI + (Math.PI / 2) * (i / steps);
    pts.push({x: cx - sw / 2 + Math.cos(a) * r, y: cy - sh / 2 + Math.sin(a) * r});
  }
  return pts;
}

// ─────────────────────────────────────────────
// Aurora colors — green spectrum like Tweakly
// ─────────────────────────────────────────────
//  Top: warm lime-green → yellow-green
//  Bottom: teal → deep green
//  Corners: bright #30D158 green
const AURORA_COLORS = {
  topLeft:     '#a8ff78', // lime
  topRight:    '#78ffd6', // aqua-green
  bottomRight: '#0A84FF', // blue accent (contrast)
  bottomLeft:  '#30D158', // pure green
};

export default makeScene2D(function* (view) {
  // ── Constants ──────────────────────────────
  const W = 1920;
  const H = 1080;
  const WHITE = '#ffffff';
  const BLACK = '#000000';
  const GREEN = '#30D158';

  // Box is a tall rounded rect (NOT a pill) like Google's
  const BOX_W = 860;
  const BOX_H = 160;
  const BOX_R = 28;   // corner radius — matches Google style
  const BOX_CX = 0;
  const BOX_CY = 80;

  // ── Letter refs for neon intro ─────────────
  const letters = 'tweakly'.split('').map(() => createRef<Txt>());
  const LETTER_SPACING = 68; // px between letter centers
  const WORD_W = letters.length * LETTER_SPACING;

  // ── Main scene refs ────────────────────────
  const logoImg   = createRef<Img>();
  const logoTxt   = createRef<Txt>();
  const searchBox = createRef<Rect>();
  const queryTxt  = createRef<Txt>();
  const resultCard = createRef<Rect>();
  const resultSnip = createRef<Txt>();
  const cursorDot  = createRef<Circle>();
  const clickFlash = createRef<Rect>();
  const outroBg    = createRef<Rect>();
  const outroLogo  = createRef<Img>();

  // ── Aurora glow refs ───────────────────────
  // Four blurred circles — one per corner, always on
  const auroraTopLeft     = createRef<Circle>();
  const auroraTopRight    = createRef<Circle>();
  const auroraBottomLeft  = createRef<Circle>();
  const auroraBottomRight = createRef<Circle>();
  // Two horizontal beam Rects (top + bottom edges)
  const beamTop    = createRef<Rect>();
  const beamBottom = createRef<Rect>();

  // ── Comet (single green comet on top of aurora) ──
  const COMET_TAIL = 90;
  const ORBIT_DURATION = 10;
  const path = pillPath(BOX_CX, BOX_CY, BOX_W, BOX_H, BOX_R, 300);
  const N = path.length;
  const cometAngle = createSignal(0);
  const tailRefs = Array.from({length: COMET_TAIL}, () => createRef<Circle>());
  const cometContainer = createRef<Rect>();

  // ── Scene opacity wrapper ──────────────────
  const sceneRoot = createRef<Rect>();

  view.add(
    <>
      {/* ── Root wrapper ── */}
      <Rect ref={sceneRoot} width={W} height={H} fill={BLACK} />

      {/* ── Neon intro letters (hidden after intro) ── */}
      {'tweakly'.split('').map((char, i) => (
        <Txt
          ref={letters[i]}
          key={String(i)}
          text={char}
          fontSize={160}
          fontWeight={300}
          fontFamily={'Google Sans, SF Pro Display, system-ui, sans-serif'}
          fill={WHITE}
          x={-WORD_W / 2 + i * LETTER_SPACING + LETTER_SPACING / 2}
          y={0}
          opacity={0}
        />
      ))}

      {/* ── Aurora glow blobs (corners) ── */}
      <Circle
        ref={auroraTopLeft}
        size={320}
        fill={AURORA_COLORS.topLeft}
        x={BOX_CX - BOX_W / 2}
        y={BOX_CY - BOX_H / 2}
        opacity={0}
        filters={[blur(60)]}
        zIndex={2}
      />
      <Circle
        ref={auroraTopRight}
        size={320}
        fill={AURORA_COLORS.topRight}
        x={BOX_CX + BOX_W / 2}
        y={BOX_CY - BOX_H / 2}
        opacity={0}
        filters={[blur(60)]}
        zIndex={2}
      />
      <Circle
        ref={auroraBottomRight}
        size={320}
        fill={AURORA_COLORS.bottomRight}
        x={BOX_CX + BOX_W / 2}
        y={BOX_CY + BOX_H / 2}
        opacity={0}
        filters={[blur(60)]}
        zIndex={2}
      />
      <Circle
        ref={auroraBottomLeft}
        size={320}
        fill={AURORA_COLORS.bottomLeft}
        x={BOX_CX - BOX_W / 2}
        y={BOX_CY + BOX_H / 2}
        opacity={0}
        filters={[blur(60)]}
        zIndex={2}
      />

      {/* ── Beam streaks (top and bottom edges) ── */}
      <Rect
        ref={beamTop}
        width={BOX_W + 40}
        height={4}
        x={BOX_CX}
        y={BOX_CY - BOX_H / 2 - 2}
        opacity={0}
        filters={[blur(8)]}
        zIndex={2}
        fill={'#a8ff78'}
      />
      <Rect
        ref={beamBottom}
        width={BOX_W + 40}
        height={4}
        x={BOX_CX}
        y={BOX_CY + BOX_H / 2 + 2}
        opacity={0}
        filters={[blur(8)]}
        zIndex={2}
        fill={'#0A84FF'}
      />

      {/* ── Comet container ── */}
      <Rect ref={cometContainer} width={0} height={0} x={0} y={0} opacity={0} zIndex={3}>
        {tailRefs.map((ref, i) => (
          <Circle
            key={String(i)}
            ref={ref}
            size={0}
            fill={GREEN}
            opacity={0}
          />
        ))}
      </Rect>

      {/* ── Logo row ── */}
      <Img
        ref={logoImg}
        src={logoSrc}
        width={80}
        height={80}
        x={-220}
        y={-120}
        opacity={0}
        scale={0.9}
        zIndex={5}
      />
      <Txt
        ref={logoTxt}
        text={'tweakly'}
        fontSize={72}
        fontWeight={700}
        fontFamily={'Google Sans, SF Pro Display, system-ui, sans-serif'}
        fill={WHITE}
        letterSpacing={-2}
        x={70}
        y={-120}
        opacity={0}
        scale={0.9}
        zIndex={5}
      />

      {/* ── Search box ── */}
      <Rect
        ref={searchBox}
        width={BOX_W}
        height={BOX_H}
        radius={BOX_R}
        fill={'#111114'}
        x={BOX_CX}
        y={BOX_CY}
        opacity={0}
        zIndex={4}
      >
        <Txt
          ref={queryTxt}
          text={''}
          fontSize={24}
          fontWeight={400}
          fontFamily={'Google Sans, SF Pro Display, system-ui, sans-serif'}
          fill={WHITE}
          x={-(BOX_W / 2) + 36}
          y={-(BOX_H / 2) + 36}
          textAlign={'left'}
          offsetX={-1}
          offsetY={-1}
          width={BOX_W - 72}
          textWrap={true}
        />
      </Rect>

      {/* ── Result card ── */}
      <Rect
        ref={resultCard}
        width={BOX_W}
        height={120}
        radius={20}
        fill={'#18181c'}
        stroke={'rgba(255,255,255,0.07)'}
        lineWidth={1}
        x={0}
        y={280}
        opacity={0}
        zIndex={5}
      >
        <Txt
          text={'tweakly.app › prijzen'}
          fontSize={14}
          fill={GREEN}
          fontFamily={'Google Sans, SF Pro Display, system-ui, sans-serif'}
          x={-(BOX_W / 2) + 28}
          y={-32}
          textAlign={'left'}
          offsetX={-1}
        />
        <Txt
          text={'tweakly — Altijd de beste prijs'}
          fontSize={18}
          fontWeight={600}
          fill={WHITE}
          fontFamily={'Google Sans, SF Pro Display, system-ui, sans-serif'}
          x={-(BOX_W / 2) + 28}
          y={-6}
          textAlign={'left'}
          offsetX={-1}
        />
        <Txt
          ref={resultSnip}
          text={''}
          fontSize={13}
          fill={'rgba(255,255,255,0.4)'}
          fontFamily={'Google Sans, SF Pro Display, system-ui, sans-serif'}
          x={-(BOX_W / 2) + 28}
          y={22}
          textAlign={'left'}
          offsetX={-1}
        />
      </Rect>

      {/* ── Cursor dot ── */}
      <Circle ref={cursorDot} size={14} fill={WHITE} opacity={0} zIndex={10} x={0} y={BOX_CY} />

      {/* ── Click flash ── */}
      <Rect ref={clickFlash} width={W} height={H} fill={WHITE} opacity={0} zIndex={20} />

      {/* ── Outro overlay ── */}
      <Rect ref={outroBg} width={W} height={H} fill={BLACK} opacity={0} zIndex={30} />

      {/* ── Outro logo (small T, centered) ── */}
      <Img
        ref={outroLogo}
        src={logoSrc}
        width={64}
        height={64}
        x={0}
        y={0}
        opacity={0}
        zIndex={31}
      />
    </>,
  );

  // ════════════════════════════════════════════
  // BEAT 1 — Intro: "tweakly" white text, large, centered
  // ════════════════════════════════════════════
  yield* waitFor(0.3);

  // All letters fade in together
  yield* all(...letters.map(l => l().opacity(1, 0.6, easeOutCubic)));
  yield* waitFor(0.8);

  // Each letter gets a neon green glow (simulated via fill color shift + shadow)
  // In Motion Canvas we approximate glow by animating fill toward bright green
  yield* sequence(
    0.06,
    ...letters.map(l =>
      all(
        l().fill('#30D158', 0.3, easeInOutCubic),
        l().fontSize(164, 0.3, easeOutCubic),
      ),
    ),
  );
  yield* waitFor(0.5);

  // Letters shrink and fade out upward as logo intro begins
  yield* all(
    ...letters.map(l =>
      all(
        l().opacity(0, 0.5, easeInOutCubic),
        l().y(-30, 0.5, easeInOutCubic),
      ),
    ),
  );

  // ════════════════════════════════════════════
  // BEAT 2 — Logo + search box fade in
  // ════════════════════════════════════════════
  yield* all(
    logoImg().opacity(1, 0.7, easeOutCubic),
    logoImg().scale(1, 0.7, easeOutCubic),
    logoTxt().opacity(1, 0.7, easeOutCubic),
    logoTxt().scale(1, 0.7, easeOutCubic),
    searchBox().opacity(1, 0.7, easeOutCubic),
  );
  yield* waitFor(0.2);

  // ════════════════════════════════════════════
  // BEAT 3 — Aurora border fades in
  // ════════════════════════════════════════════
  yield* all(
    auroraTopLeft().opacity(0.75, 1.2, easeInOutCubic),
    auroraTopRight().opacity(0.6, 1.2, easeInOutCubic),
    auroraBottomRight().opacity(0.65, 1.2, easeInOutCubic),
    auroraBottomLeft().opacity(0.75, 1.2, easeInOutCubic),
    beamTop().opacity(0.8, 1.2, easeInOutCubic),
    beamBottom().opacity(0.8, 1.2, easeInOutCubic),
    cometContainer().opacity(1, 0.8, easeInOutCubic),
  );

  // ── Comet orbits forever in background ──
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
        tailRefs[i]().size(isHead ? 20 : 5 + frac * 12);
        tailRefs[i]().opacity(isHead ? 1 : Math.pow(frac, 1.1) * 0.9);
        tailRefs[i]().fill(isHead ? '#ffffff' : i < 6 ? '#d4ffea' : GREEN);
      }
      yield;
    }),
  );

  // ── Aurora breathing animation ──
  spawn(
    loop(Infinity, function* () {
      yield* all(
        auroraTopLeft().scale(1.15, 2.5, easeInOutCubic),
        auroraBottomRight().scale(1.1, 2.5, easeInOutCubic),
      );
      yield* all(
        auroraTopLeft().scale(1, 2.5, easeInOutCubic),
        auroraBottomRight().scale(1, 2.5, easeInOutCubic),
      );
    }),
  );
  spawn(
    loop(Infinity, function* () {
      yield* waitFor(1.2);
      yield* all(
        auroraTopRight().scale(1.12, 2.5, easeInOutCubic),
        auroraBottomLeft().scale(1.08, 2.5, easeInOutCubic),
      );
      yield* all(
        auroraTopRight().scale(1, 2.5, easeInOutCubic),
        auroraBottomLeft().scale(1, 2.5, easeInOutCubic),
      );
    }),
  );

  // ════════════════════════════════════════════
  // BEAT 4 — Query 1 types in
  // ════════════════════════════════════════════
  yield* waitFor(0.4);
  yield* typeText(queryTxt, 'goedkoopste RTX 4080 vinden');
  yield* waitFor(0.7);

  // Result card slides up
  resultSnip().text('Vergelijk prijzen · RTX 4080 vanaf €799 · Meldingen instellen');
  yield* all(
    resultCard().opacity(1, 0.45, easeOutCubic),
    resultCard().position.y(260, 0.45, easeOutCubic),
  );
  yield* waitFor(0.4);

  // Cursor travels to result
  cursorDot().opacity(1);
  cursorDot().position({x: 0, y: BOX_CY});
  yield* cursorDot().position({x: -180, y: 260}, 0.55, easeInOutCubic);
  yield* all(
    cursorDot().scale(1.6, 0.12, easeOutCubic),
    clickFlash().opacity(0.1, 0.08),
  );
  yield* all(
    cursorDot().scale(1, 0.12, easeOutCubic),
    clickFlash().opacity(0, 0.18),
  );
  yield* waitFor(0.15);
  yield* all(
    resultCard().opacity(0, 0.3),
    cursorDot().opacity(0, 0.2),
    resultCard().position.y(280, 0.3),
  );
  queryTxt().text('');

  // ════════════════════════════════════════════
  // BEAT 5 — Query 2
  // ════════════════════════════════════════════
  yield* waitFor(0.3);
  yield* typeText(queryTxt, 'prijs iPhone 16 in de gaten houden');
  yield* waitFor(0.7);

  resultSnip().text('Prijsalert instellen · iPhone 16 128GB vanaf €799');
  resultCard().position.y(280);
  yield* all(
    resultCard().opacity(1, 0.45, easeOutCubic),
    resultCard().position.y(260, 0.45, easeOutCubic),
  );
  yield* waitFor(0.4);
  cursorDot().opacity(1);
  cursorDot().position({x: 0, y: BOX_CY});
  yield* cursorDot().position({x: -180, y: 260}, 0.55, easeInOutCubic);
  yield* all(
    cursorDot().scale(1.6, 0.12, easeOutCubic),
    clickFlash().opacity(0.1, 0.08),
  );
  yield* all(
    cursorDot().scale(1, 0.12, easeOutCubic),
    clickFlash().opacity(0, 0.18),
  );
  yield* waitFor(0.15);
  yield* all(
    resultCard().opacity(0, 0.3),
    cursorDot().opacity(0, 0.2),
    resultCard().position.y(280, 0.3),
  );
  queryTxt().text('');

  // ════════════════════════════════════════════
  // BEAT 6 — Query 3
  // ════════════════════════════════════════════
  yield* waitFor(0.3);
  yield* typeText(queryTxt, 'reviews vergelijken voor laptops');
  yield* waitFor(0.7);

  resultSnip().text('Lees reviews · vergelijk specs · tot 20 laptops naast elkaar');
  resultCard().position.y(280);
  yield* all(
    resultCard().opacity(1, 0.45, easeOutCubic),
    resultCard().position.y(260, 0.45, easeOutCubic),
  );
  yield* waitFor(0.4);
  cursorDot().opacity(1);
  cursorDot().position({x: 0, y: BOX_CY});
  yield* cursorDot().position({x: -180, y: 260}, 0.55, easeInOutCubic);
  yield* all(
    cursorDot().scale(1.6, 0.12, easeOutCubic),
    clickFlash().opacity(0.1, 0.08),
  );
  yield* all(
    cursorDot().scale(1, 0.12, easeOutCubic),
    clickFlash().opacity(0, 0.18),
  );
  yield* waitFor(0.15);
  yield* all(
    resultCard().opacity(0, 0.3),
    cursorDot().opacity(0, 0.2),
    resultCard().position.y(280, 0.3),
  );
  queryTxt().text('');

  // ════════════════════════════════════════════
  // BEAT 7 — Outro
  // ════════════════════════════════════════════
  yield* waitFor(0.3);

  // Everything fades to black
  yield* all(
    logoImg().opacity(0, 0.8, easeInOutCubic),
    logoTxt().opacity(0, 0.8, easeInOutCubic),
    searchBox().opacity(0, 0.8, easeInOutCubic),
    auroraTopLeft().opacity(0, 0.8, easeInOutCubic),
    auroraTopRight().opacity(0, 0.8, easeInOutCubic),
    auroraBottomLeft().opacity(0, 0.8, easeInOutCubic),
    auroraBottomRight().opacity(0, 0.8, easeInOutCubic),
    beamTop().opacity(0, 0.8, easeInOutCubic),
    beamBottom().opacity(0, 0.8, easeInOutCubic),
    cometContainer().opacity(0, 0.8, easeInOutCubic),
  );

  // Small T logo fades in centered
  yield* waitFor(0.3);
  yield* outroLogo().opacity(1, 1.0, easeInOutCubic);
  yield* waitFor(2.5);

  // Final fade to black
  yield* outroBg().opacity(1, 1.5, easeInOutCubic);
  yield* waitFor(0.5);
});
