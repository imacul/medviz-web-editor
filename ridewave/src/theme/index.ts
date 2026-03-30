export const Colors = {
  // Base
  background: '#0A0A0F',
  surface: '#12121A',
  surfaceElevated: '#1A1A28',
  card: '#16162A',
  border: '#2A2A3D',

  // Primary brand
  primary: '#00E5B3',
  primaryDark: '#00B88F',
  primaryLight: '#4DFFD6',
  primaryGlow: 'rgba(0, 229, 179, 0.15)',

  // Accent / secondary
  accent: '#7C3AED',
  accentLight: '#A855F7',
  accentGlow: 'rgba(124, 58, 237, 0.2)',

  // Status colors
  success: '#00E5B3',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textMuted: '#5A5A7A',
  textInverse: '#0A0A0F',

  // Ride types
  rideBasic: '#00E5B3',
  rideComfort: '#7C3AED',
  ridePremium: '#FBBF24',
  rideXL: '#F87171',

  // Map
  mapRoute: '#00E5B3',
  mapPin: '#7C3AED',
  mapDriver: '#FBBF24',
  mapDestination: '#F87171',

  // Gradients (used as arrays)
  gradientPrimary: ['#00E5B3', '#00B88F'] as string[],
  gradientAccent: ['#7C3AED', '#A855F7'] as string[],
  gradientDark: ['#0A0A0F', '#12121A'] as string[],
  gradientCard: ['#1A1A28', '#12121A'] as string[],
  gradientHero: ['#0A0A0F', '#1A0A2E', '#0A0A0F'] as string[],
  gradientSurface: ['rgba(26,26,40,0.95)', 'rgba(18,18,26,0.98)'] as string[],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 42,
  hero: 56,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  primary: {
    shadowColor: '#00E5B3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  accent: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const AnimationDuration = {
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
};
