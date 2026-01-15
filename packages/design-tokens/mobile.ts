/**
 * MomentoVino Design Tokens - Mobile TypeScript Constants
 * Generated from tokens.json - Single source of truth
 */

export const colors = {
  primary: {
    50: '#fdf2f4',
    100: '#fce7ea',
    200: '#f9d0d9',
    300: '#f4aabb',
    400: '#ec7a96',
    500: '#722F37',
    600: '#5c262c',
    700: '#4a1f24',
    800: '#3d1a1e',
    900: '#35181b',
    950: '#1d0a0c',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  accent: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#D4AF37',
    600: '#b8972e',
    700: '#927726',
    800: '#785e21',
    900: '#664e20',
    950: '#3d2c0f',
  },
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const

export const borderRadius = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
} as const

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
  '8xl': 96,
  '9xl': 128,
} as const

export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const

export const fontFamily = {
  sans: ['Inter', 'System'],
  mono: ['JetBrains Mono', 'Courier'],
} as const

// Semantic color aliases for components
export const semantic = {
  background: colors.neutral[50],
  foreground: colors.neutral[900],
  card: '#ffffff',
  cardForeground: colors.neutral[900],
  primary: colors.primary[500],
  primaryForeground: '#ffffff',
  secondary: colors.neutral[100],
  secondaryForeground: colors.neutral[900],
  muted: colors.neutral[100],
  mutedForeground: colors.neutral[500],
  accent: colors.accent[500],
  accentForeground: colors.neutral[900],
  destructive: colors.error,
  destructiveForeground: '#ffffff',
  border: colors.neutral[200],
  input: colors.neutral[200],
  ring: colors.primary[500],
} as const

// Dark mode semantic colors
export const semanticDark = {
  background: colors.neutral[950],
  foreground: colors.neutral[50],
  card: colors.neutral[900],
  cardForeground: colors.neutral[50],
  primary: colors.primary[400],
  primaryForeground: colors.neutral[950],
  secondary: colors.neutral[800],
  secondaryForeground: colors.neutral[50],
  muted: colors.neutral[800],
  mutedForeground: colors.neutral[400],
  accent: colors.accent[400],
  accentForeground: colors.neutral[950],
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
  border: colors.neutral[800],
  input: colors.neutral[800],
  ring: colors.primary[400],
} as const

export type Colors = typeof colors
export type Spacing = typeof spacing
export type BorderRadius = typeof borderRadius
export type FontSize = typeof fontSize
export type FontWeight = typeof fontWeight
export type Semantic = typeof semantic
