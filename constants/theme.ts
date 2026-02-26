import { Platform } from 'react-native';

// Modern, clean UI with Tweakers bordeaux brand color
export const Palette = {
  // Primary brand: Tweakers bordeaux rood
  primary: '#880517',
  primaryDark: '#6B0411',
  primaryLight: '#A61D2A',
  primarySoft: '#88051714', // 8% opacity for subtle backgrounds

  // Secondary: clean blue for interactive elements
  secondary: '#0A84FF',

  // Interactive blue — primary UI tint
  blue: '#880517',

  // Functionele kleuren (price-related)
  accent: '#34C759',       // Green — price drop / positive
  accentSoft: '#34C75918', // Soft green bg
  warning: '#FF3B30',      // Red — price increase / warning
  danger: '#FF3B30',       // Red — alerts / negative
  deal: '#FF9500',         // Orange — deal badge

  // Stars rating
  star: '#FFB800',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Dark mode colors
  dark1: '#0A0A0F',        // Deep black background
  dark2: '#141419',        // Card background
  dark3: '#1E1E26',        // Elevated surface
  dark4: '#2A2A35',        // Borders/dividers
  dark5: '#3D3D4A',        // Secondary text

  // Light mode colors
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
    textSecondary: '#6C6C70',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    tint: Palette.blue,
    icon: '#8E8E93',
    tabIconDefault: '#8E8E93',
    tabIconSelected: Palette.blue,
    border: '#C6C6C8',
    priceDown: Palette.accent,
    priceUp: Palette.warning,
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#8E8E9A',
    background: Palette.dark1,
    surface: Palette.dark2,
    tint: Palette.blue,
    icon: '#6B6B7B',
    tabIconDefault: '#6B6B7B',
    tabIconSelected: Palette.blue,
    border: Palette.dark4,
    priceDown: Palette.accent,
    priceUp: Palette.warning,
  },
};

export const Spacing = {
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
  xl: 20,
  full: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
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
