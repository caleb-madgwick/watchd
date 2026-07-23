import { palette } from './tokens';

export interface ThemeColors {
  /** App background */
  bg: string;
  /** Cards, rows, inputs */
  surface: string;
  /** Elevated sheets, menus, raised cards */
  surfaceRaised: string;
  /** Highest elevation: toasts, popovers */
  surfaceHigh: string;
  /** Subtle hairline borders */
  border: string;
  /** Emphasised borders (focus rings use accent instead) */
  borderStrong: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  /** Text on accent-coloured fills */
  onAccent: string;

  accent: string;
  accentPressed: string;
  /** Low-opacity accent wash for chips/selected states */
  accentSoft: string;

  success: string;
  danger: string;
  dangerPressed: string;
  info: string;

  /** Star fill for ratings — always readable on both themes */
  star: string;
  /** Neon-sign glow (shadows/text-shadows around accent elements) */
  glow: string;
  /** Scrim behind modals/sheets */
  scrim: string;
  /** Gradient stops for backdrop heroes (top → bottom) */
  heroScrim: [string, string, string];
  skeletonBase: string;
  skeletonHighlight: string;
  tabBar: string;
}

export interface Theme {
  scheme: 'dark' | 'light';
  colors: ThemeColors;
}

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: {
    bg: palette.ink900,
    surface: palette.ink800,
    surfaceRaised: palette.ink750,
    surfaceHigh: palette.ink700,
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',

    text: palette.cream,
    textSecondary: palette.ink200,
    textMuted: palette.ink300,
    onAccent: '#04160F',

    accent: palette.jade400,
    accentPressed: palette.jade500,
    accentSoft: 'rgba(47,203,146,0.15)',

    success: palette.teal400,
    danger: palette.red500,
    dangerPressed: palette.red600,
    info: palette.cobalt400,

    star: palette.marigold400,
    glow: 'rgba(47,203,146,0.5)',
    scrim: 'rgba(4,5,7,0.72)',
    heroScrim: ['rgba(11,13,16,0.10)', 'rgba(11,13,16,0.55)', 'rgba(11,13,16,1)'],
    skeletonBase: palette.ink750,
    skeletonHighlight: palette.ink700,
    tabBar: 'rgba(16,19,24,0.94)',
  },
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: {
    bg: palette.paper50,
    surface: '#FFFFFF',
    surfaceRaised: palette.paper100,
    surfaceHigh: '#FFFFFF',
    border: 'rgba(28,30,34,0.10)',
    borderStrong: 'rgba(28,30,34,0.20)',

    text: '#221A16',
    textSecondary: '#5D5348',
    textMuted: '#84796B',
    onAccent: '#FFFFFF',

    accent: palette.jadeOnLight,
    accentPressed: '#095E45',
    accentSoft: 'rgba(11,115,85,0.12)',

    success: palette.teal600,
    danger: palette.red600,
    dangerPressed: '#A32F34',
    info: palette.cobalt600,

    star: palette.marigold600,
    glow: 'rgba(15,138,95,0.3)',
    scrim: 'rgba(30,20,15,0.45)',
    heroScrim: ['rgba(251,250,247,0.05)', 'rgba(251,250,247,0.55)', 'rgba(251,250,247,1)'],
    skeletonBase: palette.paper200,
    skeletonHighlight: palette.paper100,
    tabBar: 'rgba(255,255,255,0.96)',
  },
};
