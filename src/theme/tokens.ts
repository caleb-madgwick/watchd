/**
 * Video Club design tokens — the single source of truth for the visual language.
 *
 * Identity: "the neon sign of a late-night video store, printed on a 90s
 * membership card". Charcoal night mode / warm cream day mode, jade-green
 * primary, marigold + cobalt + teal as the supporting cast.
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

  // Warm cream ramp (light theme — membership-card paper)
  paper50: '#FAF3E8',
  paper100: '#F3EBDD',
  paper200: '#EADFCB',
  paper300: '#DCCDB2',

  // Warm off-whites for dark-theme type
  cream: '#F4F1EA',
  creamDim: '#E7E2D6',

  // Jade-green primary (the neon sign)
  jade300: '#5EE0B0',
  jade400: '#2FCB92',
  jade500: '#1FAF7B',
  jade600: '#0F8A5F',
  jadeOnLight: '#0B7355',

  // Electric cobalt (straight off the moodboard: #3F22EC)
  cobalt400: '#7C6BFF',
  cobalt600: '#3F22EC',

  // Marigold (rating stars, shelf-tag yellow)
  marigold400: '#F5B21A',
  marigold600: '#C98D0A',

  // Support
  teal400: '#3ECFCB',
  teal600: '#177E7B',
  red400: '#F26D72',
  red500: '#E5484D',
  red600: '#C13A3F',
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
  // Anton: ultra-bold condensed block caps — 90s rental-chain signage energy.
  display: 'Anton_400Regular',
  displayMedium: 'Anton_400Regular',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  // Caveat: the clerk's marker — greetings, taglines, staff-pick notes.
  hand: 'Caveat_600SemiBold',
  handBold: 'Caveat_700Bold',
} as const;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: number;
}

export const typeScale = {
  display: { fontSize: 36, lineHeight: 44, fontFamily: fontFamily.display, letterSpacing: 0.6 },
  title1: { fontSize: 30, lineHeight: 38, fontFamily: fontFamily.display, letterSpacing: 0.6 },
  title2: { fontSize: 23, lineHeight: 30, fontFamily: fontFamily.display, letterSpacing: 0.5 },
  title3: { fontSize: 18, lineHeight: 25, fontFamily: fontFamily.displayMedium, letterSpacing: 0.5 },
  headline: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.bodySemiBold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamily.body },
  callout: { fontSize: 15, lineHeight: 21, fontFamily: fontFamily.body },
  subhead: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.bodyMedium },
  footnote: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.body },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.bodyMedium },
  micro: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.bodySemiBold, letterSpacing: 0.4 },
  // Handwritten notes — Caveat runs small for its point size, so these sit larger.
  hand: { fontSize: 21, lineHeight: 27, fontFamily: fontFamily.hand, letterSpacing: 0.2 },
  handLarge: { fontSize: 28, lineHeight: 34, fontFamily: fontFamily.handBold, letterSpacing: 0.2 },
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
