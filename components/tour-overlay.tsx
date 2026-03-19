/**
 * Tour Overlay — spotlight-based onboarding tour.
 *
 * Spotlight: four dark rects around a transparent hole + pulsing border.
 * Tab positions are geometric (5 equal slots).
 * Search bar position is measured via TourContext ref.
 * Navigation happens via onNavigate callback (called from outside Modal).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Palette, Radius, Spacing } from '@/constants/theme';
import { useTour, type SpotlightRect } from '@/hooks/use-tour';
import { useThemeContext } from '@/hooks/use-theme-context';
import Svg, { Path, Rect } from 'react-native-svg';

const { width: SW, height: SH } = Dimensions.get('window');
const TAB_BAR_H = Platform.OS === 'ios' ? 88 : 72;
const TAB_W = SW / 5;
const STATUS_BAR_H = Platform.OS === 'ios' ? 54 : 28;
const CARD_MARGIN = Spacing.md;
const ARROW_SIZE = 13;

function tabRect(index: number): SpotlightRect {
  const pad = 8;
  return {
    x: index * TAB_W + pad,
    y: SH - TAB_BAR_H + 6,
    width: TAB_W - pad * 2,
    height: TAB_BAR_H - 12,
  };
}

// ─── Step definitions ─────────────────────────────────────────────────────────

interface TourStep {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  spotlightKey: string | null; // 'tab:N', 'searchBar', or null
  spotlightPad?: number;
  navigateTo: string | null;   // route to navigate to before showing step
}

const STEPS: TourStep[] = [
  {
    icon: 'house.fill',
    iconColor: Palette.primary,
    title: 'Welkom bij Tweakly! 👋',
    description: 'Jouw persoonlijke gids voor tech nieuws, prijsvergelijking en productreviews. Laten we een rondleiding doen.',
    spotlightKey: null,
    navigateTo: null,
  },
  {
    icon: 'tag.fill',
    iconColor: '#10B981',
    title: 'Prijzen vergelijken',
    description: 'Tik hier om alle productcategorieën te zien en prijzen per winkel te vergelijken.',
    spotlightKey: 'tab:3',
    spotlightPad: 6,
    navigateTo: null,
  },
  {
    icon: 'magnifyingglass',
    iconColor: '#0A84FF',
    title: 'Zoekbalk',
    description: 'Tik hier om snel producten, merken of categorieën te vinden.',
    spotlightKey: 'searchBar',
    spotlightPad: 6,
    navigateTo: '/(tabs)',
  },
  {
    icon: 'cpu',
    iconColor: '#FF9500',
    title: 'PC Builder',
    description: 'Ga naar Home en scroll omlaag naar "PC Builder" om automatisch een pc-configuratie te laten samenstellen op basis van je budget.',
    spotlightKey: 'tab:0',
    spotlightPad: 6,
    navigateTo: '/(tabs)',
  },
  {
    icon: 'newspaper.fill',
    iconColor: '#007AFF',
    title: 'Nieuws',
    description: 'Tik hier voor het laatste tech-nieuws rechtstreeks van Tweakers.net.',
    spotlightKey: 'tab:1',
    spotlightPad: 6,
    navigateTo: null,
  },
  {
    icon: 'star.fill',
    iconColor: '#F59E0B',
    title: 'Reviews',
    description: 'Tik hier voor onafhankelijke productreviews en vergelijkingstests.',
    spotlightKey: 'tab:2',
    spotlightPad: 6,
    navigateTo: null,
  },
  {
    icon: 'plusminus',
    iconColor: '#5856D6',
    title: 'Producten vergelijken',
    description: 'Open een product via Prijzen en tik op "+ Vergelijk" om maximaal 3 producten naast elkaar te vergelijken.',
    spotlightKey: 'tab:3',
    spotlightPad: 6,
    navigateTo: null,
  },
  {
    icon: 'bell.badge.fill',
    iconColor: Palette.primary,
    title: 'Prijsalert instellen',
    description: 'Open een product en tik op het ♡-icoon om een alert in te stellen. Je krijgt een melding zodra de prijs daalt.',
    spotlightKey: 'tab:3',
    spotlightPad: 6,
    navigateTo: null,
  },
  {
    icon: 'gearshape.fill',
    iconColor: '#8E8E93',
    title: 'Instellingen',
    description: 'Tik hier voor je profiel, meldingen, donkere modus en opgeslagen bladwijzers.',
    spotlightKey: 'tab:4',
    spotlightPad: 6,
    navigateTo: null,
  },
  {
    icon: 'checkmark.circle.fill',
    iconColor: '#10B981',
    title: 'Je bent er klaar voor!',
    description: 'Gebruik de tabs onderaan om te navigeren. Veel plezier met Tweakly!',
    spotlightKey: null,
    navigateTo: null,
  },
];

// ─── Spotlight hole via SVG ───────────────────────────────────────────────────
//
// SVG Path with evenodd fill rule: outer rect = full screen (dark),
// inner rounded rect = transparent hole. Perfect rounded cutout.

const OVERLAY_COLOR = 'rgba(0,0,0,0.75)';
const HOLE_RADIUS = 20;

function roundedRectPath(x: number, y: number, w: number, h: number, r: number) {
  // Clockwise rounded rect path
  return [
    `M ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `Q ${x} ${y + h} ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `Z`,
  ].join(' ');
}

function SpotlightHole({
  rect, pad, color, pulseAnim,
}: {
  rect: SpotlightRect; pad: number; color: string; pulseAnim: Animated.Value;
}) {
  // Hole = exact element bounds, no padding. Rings grow outward.
  const x = rect.x;
  const y = rect.y;
  const w = rect.width;
  const h = rect.height;
  const R = HOLE_RADIUS;

  // Ring starts at exact hole size (scale=1) and grows outward to scale=1.2
  // Since transform scale is symmetric, the ring never shrinks inward — it starts at 1.0
  const ringScale   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.2] });
  const ringOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

  // SVG hole = exact x,y,w,h. Border draws inward so hole edge stays exact.
  const screenPath = `M 0 0 L ${SW} 0 L ${SW} ${SH} L 0 ${SH} Z`;
  const holePath   = roundedRectPath(x, y, w, h, R);

  return (
    <>
      <Svg width={SW} height={SH} style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Dark overlay with hole */}
        <Path
          d={`${screenPath} ${holePath}`}
          fill="rgba(0,0,0,0.75)"
          fillRule="evenodd"
        />
        {/* Colored border around hole */}
        <Rect x={x} y={y} width={w} height={h} rx={R} ry={R} fill="none" stroke={color} strokeWidth={3} />
      </Svg>

      {/* Pulsing ring — grows outward from hole edge */}
      <Animated.View style={{
        position: 'absolute',
        top: y, left: x,
        width: w, height: h,
        borderRadius: R,
        borderWidth: 2,
        borderColor: color,
        opacity: ringOpacity,
        transform: [{ scale: ringScale }],
      }} />
    </>
  );
}

// ─── Main tour component ──────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onComplete: () => void;
  onNavigate: (route: string) => void;
}

export function TourSpotlight({ visible, onComplete, onNavigate }: Props) {
  const { resolvedTheme } = useThemeContext();
  const colors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';
  const { measureRef } = useTour();

  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const contentSlide = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const cardBg = isDark ? '#1E1E26' : '#FFFFFF';

  // ── Resolve spotlight ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    async function resolve() {
      const key = current.spotlightKey;
      if (!key) { setSpotlight(null); return; }
      if (key.startsWith('tab:')) {
        setSpotlight(tabRect(parseInt(key.split(':')[1], 10)));
        return;
      }
      // measureInWindow needs a small delay after navigation settles
      await new Promise(r => setTimeout(r, 120));
      if (cancelled) return;
      const rect = await measureRef(key);
      if (!cancelled) setSpotlight(rect);
    }

    resolve();
    return () => { cancelled = true; };
  }, [step, visible]);

  // ── Pulse loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    pulseLoop.current?.stop();
    if (spotlight) {
      pulseAnim.setValue(0);
      pulseLoop.current = Animated.loop(
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, useNativeDriver: true })
      );
      pulseLoop.current.start();
    }
    return () => { pulseLoop.current?.stop(); };
  }, [spotlight]);

  // ── Entrance ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setStep(0);
      setSpotlight(null);
      fadeAnim.setValue(0);
      cardSlide.setValue(60);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(cardSlide, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  // ── Navigation + step change ───────────────────────────────────────────────
  const goToStep = useCallback((next: number, direction: 1 | -1) => {
    const nextStep = STEPS[next];
    if (nextStep?.navigateTo) {
      onNavigate(nextStep.navigateTo);
    }
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: -18 * direction, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      contentSlide.setValue(18 * direction);
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.spring(contentSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start();
    });
  }, [contentFade, contentSlide, onNavigate]);

  const handleNext = useCallback(() => {
    if (isLast) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 60, duration: 200, useNativeDriver: true }),
      ]).start(() => { setStep(0); onComplete(); });
    } else {
      goToStep(step + 1, 1);
    }
  }, [isLast, step, goToStep, onComplete]);

  const handleBack = useCallback(() => {
    if (!isFirst) goToStep(step - 1, -1);
  }, [isFirst, step, goToStep]);

  const handleSkip = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 60, duration: 180, useNativeDriver: true }),
    ]).start(() => { setStep(0); onComplete(); });
  }, [onComplete]);

  if (!visible) return null;

  // ── Card position ──────────────────────────────────────────────────────────
  let cardStyle: object;
  let arrowUp = false;
  let arrowDown = false;
  let arrowLeft = SW / 2 - ARROW_SIZE;

  if (spotlight) {
    const holeTop = spotlight.y;
    const holeBottom = spotlight.y + spotlight.height;
    const spaceAbove = holeTop - STATUS_BAR_H - 8;
    const spaceBelow = SH - holeBottom - TAB_BAR_H - 8;

    arrowLeft = Math.max(CARD_MARGIN + 8, Math.min(
      spotlight.x + spotlight.width / 2 - ARROW_SIZE,
      SW - CARD_MARGIN - 8 - ARROW_SIZE * 2
    ));

    if (spaceAbove > spaceBelow) {
      cardStyle = { bottom: SH - holeTop + 16, top: undefined };
      arrowDown = true;
    } else {
      cardStyle = { top: holeBottom + 16, bottom: undefined };
      arrowUp = true;
    }
  } else {
    cardStyle = { top: SH / 2 - 190 };
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]} pointerEvents="box-none">

        {/* Overlay */}
        {spotlight ? (
          <SpotlightHole
            rect={spotlight}
            pad={current.spotlightPad ?? 6}
            color={current.iconColor}
            pulseAnim={pulseAnim}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fullDark]} />
        )}

        {/* Tap anywhere to advance */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleNext} />

        {/* Arrow down (card is above spotlight) */}
        {arrowDown && (
          <View pointerEvents="none" style={{
            position: 'absolute',
            bottom: SH - spotlight!.y + (current.spotlightPad ?? 6) - 8,
            left: arrowLeft,
            width: 0, height: 0,
            borderLeftWidth: ARROW_SIZE,
            borderRightWidth: ARROW_SIZE,
            borderTopWidth: ARROW_SIZE,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: cardBg,
          }} />
        )}

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: cardBg },
            { left: CARD_MARGIN, right: CARD_MARGIN, position: 'absolute' },
            cardStyle,
            { transform: [{ translateY: cardSlide }] },
          ]}
          pointerEvents="box-none"
        >
          {/* Arrow up (card is below spotlight) */}
          {arrowUp && (
            <View pointerEvents="none" style={[styles.arrowUp, {
              borderBottomColor: cardBg,
              left: arrowLeft - CARD_MARGIN,
            }]} />
          )}

          <View style={styles.cardInner}>
            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2A2A35' : '#EBEBF0' }]}>
              <View style={[styles.progressFill, {
                backgroundColor: current.iconColor,
                width: `${((step + 1) / STEPS.length) * 100}%`,
              }]} />
            </View>

            {/* Top row */}
            <View style={styles.topRow}>
              <Text style={[styles.counterText, { color: colors.textSecondary }]}>
                {step + 1} / {STEPS.length}
              </Text>
              {!isLast && (
                <Pressable onPress={handleSkip} hitSlop={12}>
                  <Text style={[styles.skipText, { color: colors.textSecondary }]}>Overslaan</Text>
                </Pressable>
              )}
            </View>

            {/* Animated content */}
            <Animated.View style={[styles.content, {
              opacity: contentFade,
              transform: [{ translateX: contentSlide }],
            }]}>
              {/* Icon */}
              <View style={[styles.iconCircle, { backgroundColor: current.iconColor + '20' }]}>
                <View style={[styles.iconInner, { backgroundColor: current.iconColor }]}>
                  <IconSymbol name={current.icon as any} size={22} color="#fff" />
                </View>
              </View>

              <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
              <Text style={[styles.desc, { color: colors.textSecondary }]}>{current.description}</Text>
            </Animated.View>

            {/* Dots */}
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <Pressable key={i} hitSlop={8} onPress={() => i !== step && goToStep(i, i > step ? 1 : -1)}>
                  <View style={[styles.dot, {
                    width: i === step ? 20 : 7,
                    backgroundColor: i === step
                      ? current.iconColor
                      : (isDark ? '#2A2A35' : '#DCDCE0'),
                  }]} />
                </Pressable>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable
                onPress={handleBack}
                disabled={isFirst}
                style={[styles.backBtn, {
                  borderColor: isDark ? '#2A2A35' : '#E0E0E5',
                  opacity: isFirst ? 0 : 1,
                }]}
              >
                <IconSymbol name="chevron.left" size={15} color={colors.textSecondary} />
                <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>Terug</Text>
              </Pressable>

              <Pressable
                onPress={handleNext}
                style={[styles.nextBtn, { backgroundColor: current.iconColor }]}
              >
                <Text style={styles.nextBtnText}>{isLast ? 'Beginnen' : 'Volgende'}</Text>
                <IconSymbol name={isLast ? 'checkmark' : 'chevron.right'} size={15} color="#fff" />
              </Pressable>
            </View>
          </View>
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

// ─── AppTour wrapper (handles navigation outside Modal) ───────────────────────

export function AppTour({
  onDismiss,
  onNavigate,
}: {
  onDismiss: () => void;
  onNavigate: (route: string) => void;
}) {
  const [visible, setVisible] = useState(true);

  const handleComplete = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 280);
  }, [onDismiss]);

  return (
    <TourSpotlight
      visible={visible}
      onComplete={handleComplete}
      onNavigate={onNavigate}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullDark: { backgroundColor: OVERLAY_COLOR },

  arrowUp: {
    position: 'absolute',
    top: -ARROW_SIZE,
    width: 0, height: 0,
    borderLeftWidth: ARROW_SIZE,
    borderRightWidth: ARROW_SIZE,
    borderBottomWidth: ARROW_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },

  card: {
    borderRadius: Radius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  cardInner: {
    padding: Spacing.md,
    paddingTop: Spacing.sm + 2,
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },

  progressTrack: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counterText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  skipText: { fontSize: 13, fontWeight: '400' },

  content: { gap: Spacing.sm },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  iconInner: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  title: { fontSize: 19, fontWeight: '700', letterSpacing: 0.1 },
  desc: { fontSize: 14, lineHeight: 20 },

  dots: { flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  dot: { height: 7, borderRadius: 4 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: 11,
    borderRadius: Radius.md, borderWidth: 1,
  },
  backBtnText: { fontSize: 14, fontWeight: '500' },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 13, borderRadius: Radius.md,
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
