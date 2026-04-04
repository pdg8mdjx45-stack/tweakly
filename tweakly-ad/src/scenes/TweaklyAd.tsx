import {Img, makeScene2D, Rect, Txt} from '@motion-canvas/2d';
import {createRef, waitFor} from '@motion-canvas/core';
import logoSrc from '../assets/logo.png';

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
    </>,
  );

  yield* waitFor(0.5);
});
