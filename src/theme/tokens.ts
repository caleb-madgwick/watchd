/**
 * Watchd design tokens — the single source of truth for the visual language.
 *
 * Identity: "the quiet glow of a cinema before the film starts".
 * Near-black blue-tinted charcoal, warm off-white type, one marquee-gold accent.
 */

export const palette = {
  // Neutral ramp (dark, blue-tinted charcoal)
  ink950: '#07090C',
  ink900: '#0B0D10',
  ink850: '#101318',
  ink800: '#14181D',
  ink750: '#191E25',
  ink700: '#1F252E',
  ink600: '#2A323D',
  ink500: '#3B4450',
  ink400: '#57616E',
  ink300: '#79838F',
  ink200: '#A8B0BA',
  ink100: '#D4D8DE',

  // Warm paper ramp (light theme)
  paper50: '#FBFAF7',
  paper100: '#F5F3EE',
  paper200: '#ECE9E1',
  paper300: '#DDD9CE',

  // Warm off-whites for dark-theme type
  cream: '#F4F1EA',
  creamDim: '#E7E2D6',

  // Marquee gold accent
  gold300: '#F2CB6C',
  gold400: '#E8B640',
  gold500: '#D9A32A',
  gold600: '#B8860F',
  goldOnDark: '#E8B640',
  goldOnLight: '#9A6E0B',

  // Support
  green400: '#4AD48A',
  green600: '#1F7A4D',
  red400: '#F26D72',
  red500: '#E5484D',
  red600: '#C13A3F',
  blue400: '#6FAFF5',
  blue600: '#2E6DB4',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

export const fontFamily = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: number;
}

export const typeScale = {
  display: { fontSize: 34, lineHeight: 40, fontFamily: fontFamily.display, letterSpacing: -0.5 },
  title1: { fontSize: 28, lineHeight: 34, fontFamily: fontFamily.display, letterSpacing: -0.4 },
  title2: { fontSize: 22, lineHeight: 28, fontFamily: fontFamily.display, letterSpacing: -0.2 },
  title3: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.bodySemiBold },
  headline: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.bodySemiBold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.body },
  callout: { fontSize: 15, lineHeight: 21, fontFamily: fontFamily.body },
  subhead: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.bodyMedium },
  footnote: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.body },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.bodyMedium },
  micro: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.bodySemiBold, letterSpacing: 0.4 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

export const breakpoints = {
  /** large phones */
  md: 480,
  /** tablet / small laptop — sidebar appears here */
  lg: 768,
  /** desktop */
  xl: 1024,
  /** wide desktop */
  '2xl': 1440,
} as const;

export const contentWidth = {
  prose: 680,
  page: 1120,
  wide: 1360,
} as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

/** Poster artwork is always 2:3; backdrops 16:9. */
export const aspect = {
  poster: 2 / 3,
  backdrop: 16 / 9,
  profile: 1,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;

/** Minimum touch target per accessibility guidance. */
export const minTouchTarget = 44;
