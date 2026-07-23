import { screen } from '@testing-library/react-native';

import { CardListSkeleton, PosterRowSkeleton, Skeleton } from './Skeleton';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('Skeleton', () => {
  // Regression: the animated value must come from Animated.Value directly —
  // React Native's useAnimatedValue hook does not exist in react-native-web
  // and crashed the browser build.
  it('renders a single block without native-only APIs', () => {
    expect(() => renderWithTheme(<Skeleton width={100} height={20} />)).not.toThrow();
  });

  it('renders the card list variant used by loading feeds', () => {
    renderWithTheme(<CardListSkeleton count={3} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders the poster row variant', () => {
    renderWithTheme(<PosterRowSkeleton count={2} />);
    expect(screen.toJSON()).toBeTruthy();
  });
});
