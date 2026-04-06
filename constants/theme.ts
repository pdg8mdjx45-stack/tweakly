import { Platform } from 'react-native';

// ─── iOS 26 Liquid Glass Design System ──────────────────────────────────────
// Deeply translucent materials, vivid specular highlights, frosted chrome.

export const Palette = {
  // Primary brand: Tweakly donkergroen
  primary: '#1A3A20',
  primaryDark: '#0F2414',
  primaryLight: '#2D5A35',
  primarySoft: '#1A3A2014', // 8% opacity for subtle backgrounds
  primaryVivid: '#34C759',  // iOS system green — for active/positive states

  // Secondary: clean blue for interactive elements
  secondary: '#0A84FF',

  // Interactive tint — primary UI tint
  blue: '#1A3A20',

  // Functionele kleuren (price-related)
  accent: '#6BCB7A',       // Green — price drop / positive
  accentSoft: '#6BCB7A18', // Soft green bg
  warning: '#FF3B30',      // Red — price increase / warning
  danger: '#FF3B30',       // Red — alerts / negative
  deal: '#FF9500',         // Orange — deal badge

  // Stars rating
  star: '#FFD60A',         // iOS 26 vibrant yellow

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Dark mode colors — deeper, more saturated for iOS 26 OLED depth
  dark1: '#1C1C1E',        // True OLED black with blue tint
  dark2: '#2C2C2E',        // Card background — slightly warmer
  dark3: '#3A3A3C',        // Elevated surface
  dark4: '#48484A',        // Borders/dividers — more contrast
  dark5: '#636366',        // Secondary text

  // Light mode colors — iOS 26 uses warmer, slightly tinted whites
  grey1: '#8E8E93',
  grey2: '#AEAEB2',
  grey3: '#C7C7CC',
  grey4: '#D1D1D6',
  grey5: '#E5E5EA',
  grey6: '#F2F2F7',
} as const;

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#3C3C43',    // iOS 26 secondary label
    textTertiary: '#6C6C70',     // Tertiary label
    background: '#F2F2F7',       // iOS system grouped background
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    tint: Palette.primary,
    icon: '#6C6C72',
    tabIconDefault: '#999999',
    tabIconSelected: Palette.primary,
    border: 'rgba(60,60,67,0.12)',  // iOS 26 separator
    borderProminent: 'rgba(60,60,67,0.20)',
    priceDown: Palette.accent,
    priceUp: Palette.warning,
    fill: 'rgba(120,120,128,0.12)', // iOS tertiary fill
  },
  dark: {
    text: '#F5F5F7',
    textSecondary: '#A0A0AC',
    textTertiary: '#6E6E78',
    background: '#1C1C1E',
    surface: '#2C2C2E',
    surfaceElevated: '#3A3A3C',
    tint: Palette.blue,
    icon: '#8E8E9A',
    tabIconDefault: '#6E6E78',
    tabIconSelected: Palette.blue,
    border: 'rgba(255,255,255,0.10)',
    borderProminent: 'rgba(255,255,255,0.18)',
    priceDown: Palette.accent,
    priceUp: Palette.warning,
    fill: 'rgba(120,120,128,0.20)',
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,    // iOS 26 uses slightly larger radii
  xxl: 28,   // For prominent cards / modals
  full: 999,
} as const;

// ─── iOS 26 Shadow System ────────────────────────────────────────────────────
// Deeper, multi-layered shadows for the liquid glass aesthetic.

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 6,
  },
  // iOS 26 "floating" shadow — for hero cards and prominent CTAs
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 36,
    elevation: 10,
  },
} as const;

// ─── iOS 26 Liquid Glass Material System ─────────────────────────────────────
// True liquid glass: deeply translucent, vivid specular highlights,
// frosted chrome, and multi-layer depth. These materials adapt to
// the content behind them, creating a sense of physical depth.
//
// Key principles:
// - Specular highlight on the top edge (simulated via borderTopColor)
// - Inner shadow via slightly darker bottom border
// - Multi-layer translucency (blur + tinted fill)
// - Prominent but soft drop shadows

export const Glass = {
  // ── Card material — default for inline content cards ─────────────────────
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  cardDark: {
    backgroundColor: 'rgba(44,44,46,0.85)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  cardLight: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.90)',
  },

  // ── Surface fill — flat backgrounds behind rows/cells ────────────────────
  surface: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  surfaceLight: {
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 0.5,
    borderColor: 'rgba(200,200,210,0.40)',
  },

  // ── Tinted accent glass — brand-colored translucency ─────────────────────
  accent: {
    backgroundColor: 'rgba(26,58,32,0.10)',
    borderWidth: 0.5,
    borderColor: 'rgba(26,58,32,0.18)',
  },

  // ── Primary liquid glass — grouped settings, prominent cards ─────────────
  liquid: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.72)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.92)',
      shadowColor: 'rgba(0,0,0,0.12)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 20,
      elevation: 5,
    },
    dark: {
      backgroundColor: 'rgba(44,44,46,0.82)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.12)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 28,
      elevation: 12,
    },
  },

  // ── Thin glass — ultra-translucent overlay (iOS 26 widget / sidebar) ─────
  thin: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.32)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.60)',
    },
    dark: {
      backgroundColor: 'rgba(255,255,255,0.07)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.10)',
    },
  },

  // ── Frosted chrome — sidebar / sheet material ────────────────────────────
  chrome: {
    light: {
      backgroundColor: 'rgba(242,242,247,0.84)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.96)',
    },
    dark: {
      backgroundColor: 'rgba(28,28,30,0.90)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.10)',
    },
  },

  // ── Glassmorphic — overlays / modals background ──────────────────────────
  glassmorphic: {
    light: {
      backgroundColor: 'rgba(255,255,255,0.28)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.52)',
    },
    dark: {
      backgroundColor: 'rgba(28,28,30,0.72)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.08)',
    },
  },

  // ── Navigation header — blurred, sits above scroll content ───────────────
  header: {
    light: {
      backgroundColor: 'rgba(242,242,247,0.92)',
      borderBottomWidth: 0.33,
      borderBottomColor: 'rgba(0,0,0,0.08)',
    },
    dark: {
      backgroundColor: 'rgba(28,28,30,0.92)',
      borderBottomWidth: 0.33,
      borderBottomColor: 'rgba(255,255,255,0.08)',
    },
  },

  // ── Tab bar — floating glass ─────────────────────────────────────────────
  tabBar: {
    light: {
      backgroundColor: 'rgba(242,242,247,0.90)',
      borderTopWidth: 0.33,
      borderTopColor: 'rgba(0,0,0,0.06)',
      shadowColor: 'rgba(0,0,0,0.10)',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 1,
      shadowRadius: 24,
      elevation: 14,
    },
    dark: {
      backgroundColor: 'rgba(28,28,30,0.90)',
      borderTopWidth: 0.33,
      borderTopColor: 'rgba(255,255,255,0.09)',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.55,
      shadowRadius: 28,
      elevation: 14,
    },
  },

  // ── Sheet / modal — prominent, nearly opaque ─────────────────────────────
  modal: {
    light: {
      backgroundColor: 'rgba(242,242,247,0.97)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.75)',
    },
    dark: {
      backgroundColor: 'rgba(28,28,30,0.97)',
      borderWidth: 0.5,
      borderColor: 'rgba(255,255,255,0.10)',
    },
  },

  // ── Specular constants — for top-edge highlights ─────────────────────────
  specular: {
    light: 'rgba(255,255,255,0.90)',
    dark: 'rgba(255,255,255,0.12)',
    height: 0.5,
  },

  // ── Lens — full layered liquid glass anatomy ──────────────────────────────
  // Top specular rim → caustic shimmer → lens blob → inner shadow (dark base)
  // Each layer stacks to simulate refraction like real water/glass.
  lens: {
    // The bright top-edge specular rim (widest highlight)
    rimTop: {
      light: 'rgba(255,255,255,1.00)',
      dark:  'rgba(255,255,255,0.70)',
    },
    // Secondary caustic shimmer just below the rim
    caustic: {
      light: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.00)'] as const,
      dark:  ['rgba(255,255,255,0.40)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.00)'] as const,
    },
    // Inner light blob (the floating bright oval in the upper-left of a glass lens)
    blob: {
      light: 'rgba(255,255,255,0.45)',
      dark:  'rgba(255,255,255,0.14)',
    },
    // Bottom inner shadow — the dark concave depth at the base of the lens
    innerShadow: {
      light: ['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.06)'] as const,
      dark:  ['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.28)'] as const,
    },
    // Side-edge refraction darkening (left/right inner shadow)
    edgeShadow: {
      light: 'rgba(0,0,0,0.04)',
      dark:  'rgba(0,0,0,0.22)',
    },
    // Horizontal glint — the thin bright band across the mid-belly of the lens
    glint: {
      light: ['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.60)', 'rgba(255,255,255,0.00)'] as const,
      dark:  ['rgba(255,255,255,0.00)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.00)'] as const,
    },
  },
} as const;

// ─── Organic Background Blobs ─────────────────────────────────────────────────
// iOS 26-style ambient radial gradient orbs. Dark mode: black + green blobs.
// Light mode: white + green blobs.

export const BlobColors = {
  dark: {
    background: '#000000',
    blob1: ['rgba(26,58,32,0.85)', 'rgba(26,58,32,0.00)'] as const,   // primary green, top-left
    blob2: ['rgba(45,90,53,0.60)', 'rgba(45,90,53,0.00)'] as const,   // lighter green, bottom-right
    blob3: ['rgba(52,199,89,0.18)', 'rgba(52,199,89,0.00)'] as const, // vivid green accent, center
  },
  light: {
    background: '#FFFFFF',
    blob1: ['rgba(26,58,32,0.22)', 'rgba(26,58,32,0.00)'] as const,
    blob2: ['rgba(45,90,53,0.14)', 'rgba(45,90,53,0.00)'] as const,
    blob3: ['rgba(52,199,89,0.10)', 'rgba(52,199,89,0.00)'] as const,
  },
} as const;

// ─── Glassmorphism Card Tokens ────────────────────────────────────────────────

export const GlassTokens = {
  dark: {
    tint: 'rgba(26,26,28,0.55)',
    border: 'rgba(255,255,255,0.12)',
    specular: 'rgba(255,255,255,0.18)',
    blur: 28,
  },
  light: {
    tint: 'rgba(255,255,255,0.62)',
    border: 'rgba(255,255,255,0.85)',
    specular: 'rgba(255,255,255,0.95)',
    blur: 32,
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
