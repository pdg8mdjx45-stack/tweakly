import { Platform } from 'react-native';

// ─── Tweakly Design System ────────────────────────────────────────────────────
// White-first, iOS 26 liquid glass + superellipse shape language
// Accent: dark green (#1A3A20) — Tweakly brand
// Background: pure white (#FFFFFF)
// Cards: white with soft shadow, 24pt corner radius
// Floating tab bar: white frosted pill, dark green active state

export const Palette = {
  // ── Brand greens ──────────────────────────────────────────────────────────
  primary: '#1A3A20',        // Tweakly dark green — primary accent
  primaryDark: '#0F2414',    // Deeper green for pressed/active states
  primaryLight: '#2D5A35',   // Mid green — hover/secondary
  primarySoft: 'rgba(26,58,32,0.08)',  // Soft tint for pill backgrounds
  primaryVivid: '#34C759',   // iOS system green — positive / price-drop

  // ── Interactive / secondary ───────────────────────────────────────────────
  secondary: '#0A84FF',

  // Alias kept for backward compat
  blue: '#1A3A20',

  // ── Functional ────────────────────────────────────────────────────────────
  accent: '#1A3A20',         // Green — now uses brand dark green
  accentVivid: '#34C759',    // Vivid green for price drop badges
  accentSoft: 'rgba(26,58,32,0.08)',
  warning: '#FF3B30',
  danger: '#FF3B30',
  deal: '#FF9500',
  star: '#FFD60A',

  // ── Neutrals ──────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',

  // ── Dark mode (kept for compatibility) ────────────────────────────────────
  dark1: '#1C1C1E',
  dark2: '#2C2C2E',
  dark3: '#3A3A3C',
  dark4: '#48484A',
  dark5: '#636366',

  // ── Grays (iOS system) ────────────────────────────────────────────────────
  grey1: '#8E8E93',
  grey2: '#AEAEB2',
  grey3: '#C7C7CC',
  grey4: '#D1D1D6',
  grey5: '#E5E5EA',
  grey6: '#F2F2F7',
  grey7: '#FAFAFA',
} as const;

export const Colors = {
  light: {
    text: '#0A0A0A',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    background: '#FFFFFF',          // Pure white
    surface: '#FFFFFF',
    surfaceElevated: '#FAFAFA',
    surfaceGrouped: '#F2F2F7',      // Grouped lists
    tint: Palette.primaryVivid,
    icon: '#6C6C72',
    tabIconDefault: '#AEAEB2',
    tabIconSelected: Palette.primaryVivid,
    border: 'rgba(0,0,0,0.06)',
    borderProminent: 'rgba(0,0,0,0.12)',
    priceDown: Palette.primaryVivid,
    priceUp: Palette.warning,
    fill: 'rgba(0,0,0,0.04)',
  },
  dark: {
    text: '#F5F5F7',
    textSecondary: '#A0A0AC',
    textTertiary: '#6E6E78',
    background: '#0A0A0A',
    surface: '#161618',
    surfaceElevated: '#1C1C1E',
    surfaceGrouped: '#1C1C1E',
    tint: Palette.primaryVivid,
    icon: '#8E8E9A',
    tabIconDefault: '#6E6E78',
    tabIconSelected: Palette.primaryVivid,
    border: 'rgba(255,255,255,0.08)',
    borderProminent: 'rgba(255,255,255,0.15)',
    priceDown: Palette.primaryVivid,
    priceUp: Palette.warning,
    fill: 'rgba(255,255,255,0.06)',
  },
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,    // Primary card radius — iOS 26 superellipse
  xxl: 30,   // Hero cards, modals
  full: 999,
} as const;

// ─── Shadow System ─────────────────────────────────────────────────────────────
// White-background-first: softer, lighter shadows for clarity

export const Shadow = {
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  // Floating pill / tab bar
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  // Hero card prominent
  hero: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 32,
    elevation: 14,
  },
} as const;

// ─── Glass Material System ─────────────────────────────────────────────────────
// White-first: cards use white with subtle shadow instead of transparency

export const Glass = {
  // ── Card material — white with soft shadow ────────────────────────────────
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  cardDark: {
    backgroundColor: 'rgba(22,22,24,0.92)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.06)',
  },

  // ── Surface fill ──────────────────────────────────────────────────────────
  surface: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  surfaceLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  // ── Tinted accent glass ───────────────────────────────────────────────────
  accent: {
    backgroundColor: 'rgba(26,58,32,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(26,58,32,0.12)',
  },

  // ── Liquid glass ──────────────────────────────────────────────────────────
  liquid: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.85)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.95)',
      shadowColor: 'rgba(0,0,0,0.08)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 4,
    },
    dark: {
      backgroundColor: 'rgba(22,22,24,0.90)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.10)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.40,
      shadowRadius: 24,
      elevation: 10,
    },
  },

  // ── Thin glass ────────────────────────────────────────────────────────────
  thin: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.70)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.85)',
    },
    dark: {
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.09)',
    },
  },

  // ── Chrome ────────────────────────────────────────────────────────────────
  chrome: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.98)',
    },
    dark: {
      backgroundColor: 'rgba(18,18,20,0.92)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.09)',
    },
  },

  // ── Glassmorphic overlays ─────────────────────────────────────────────────
  glassmorphic: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.75)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.90)',
    },
    dark: {
      backgroundColor: 'rgba(18,18,20,0.80)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.08)',
    },
  },

  // ── Navigation header ─────────────────────────────────────────────────────
  header: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderBottomWidth: 0.33,
      borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    dark: {
      backgroundColor: 'rgba(10,10,10,0.92)',
      borderBottomWidth: 0.33,
      borderBottomColor: 'rgba(255,255,255,0.06)',
    },
  },

  // ── Tab bar — floating white pill ─────────────────────────────────────────
  tabBar: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderTopWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 12,
    },
    dark: {
      backgroundColor: 'rgba(18,18,20,0.92)',
      borderTopWidth: 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
      elevation: 12,
    },
  },

  // ── Modal / sheet ─────────────────────────────────────────────────────────
  modal: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.98)',
      borderWidth: 0.5,
      borderColor: 'rgba(0,0,0,0.06)',
    },
    dark: {
      backgroundColor: 'rgba(18,18,20,0.98)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.09)',
    },
  },

  // ── Specular rim ──────────────────────────────────────────────────────────
  specular: {
    light: 'rgba(255,255,255,0.95)',
    dark: 'rgba(255,255,255,0.10)',
    height: 0.5,
  },

  // ── Lens anatomy (kept for compatibility) ─────────────────────────────────
  lens: {
    rimTop: {
      light: 'rgba(255,255,255,1.00)',
      dark:  'rgba(255,255,255,0.60)',
    },
    caustic: {
      light: ['rgba(255,255,255,0.90)', 'rgba(255,255,255,0.40)', 'rgba(255,255,255,0.00)'] as const,
      dark:  ['rgba(255,255,255,0.30)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.00)'] as const,
    },
    blob: {
      light: 'rgba(255,255,255,0.40)',
      dark:  'rgba(255,255,255,0.12)',
    },
    innerShadow: {
      light: ['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.04)'] as const,
      dark:  ['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.24)'] as const,
    },
    edgeShadow: {
      light: 'rgba(0,0,0,0.03)',
      dark:  'rgba(0,0,0,0.20)',
    },
    glint: {
      light: ['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.50)', 'rgba(255,255,255,0.00)'] as const,
      dark:  ['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.00)'] as const,
    },
  },
} as const;

// ─── Organic Background Blobs ─────────────────────────────────────────────────
// Light: pure white bg + very subtle green blobs
// Dark: near-black bg + green blobs

export const BlobColors = {
  dark: {
    background: '#0A0A0A',
    blob1: ['rgba(26,58,32,0.70)', 'rgba(26,58,32,0.00)'] as const,
    blob2: ['rgba(45,90,53,0.50)', 'rgba(45,90,53,0.00)'] as const,
    blob3: ['rgba(52,199,89,0.14)', 'rgba(52,199,89,0.00)'] as const,
  },
  light: {
    background: '#FFFFFF',
    blob1: ['rgba(26,58,32,0.06)', 'rgba(26,58,32,0.00)'] as const,
    blob2: ['rgba(45,90,53,0.04)', 'rgba(45,90,53,0.00)'] as const,
    blob3: ['rgba(52,199,89,0.05)', 'rgba(52,199,89,0.00)'] as const,
  },
} as const;

// ─── Glass Tokens ──────────────────────────────────────────────────────────────

export const GlassTokens = {
  dark: {
    tint: 'rgba(18,18,20,0.60)',
    border: 'rgba(255,255,255,0.10)',
    specular: 'rgba(255,255,255,0.14)',
    blur: 24,
  },
  light: {
    tint: 'rgba(255,255,255,0.75)',
    border: 'rgba(0,0,0,0.05)',
    specular: 'rgba(255,255,255,0.98)',
    blur: 28,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
