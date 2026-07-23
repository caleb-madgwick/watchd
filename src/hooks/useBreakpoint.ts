import { useWindowDimensions } from 'react-native';

import { breakpoints } from '@/theme/tokens';

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface BreakpointInfo {
  breakpoint: Breakpoint;
  width: number;
  /** ≥ lg: tablet and up — sidebar navigation, multi-column layouts */
  isWide: boolean;
  /** ≥ xl: desktop and up */
  isDesktop: boolean;
}

export function widthToBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  return 'sm';
}

export function useBreakpoint(): BreakpointInfo {
  const { width } = useWindowDimensions();
  const breakpoint = widthToBreakpoint(width);
  return {
    breakpoint,
    width,
    isWide: width >= breakpoints.lg,
    isDesktop: width >= breakpoints.xl,
  };
}
