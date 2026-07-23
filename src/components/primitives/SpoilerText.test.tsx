import { fireEvent, screen } from '@testing-library/react-native';

import { SpoilerText } from './SpoilerText';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('SpoilerText', () => {
  it('hides the body until deliberately revealed', () => {
    renderWithTheme(<SpoilerText>Vader is the father.</SpoilerText>);

    expect(screen.queryByText('Vader is the father.')).toBeNull();
    expect(screen.getByText(/contains spoilers/i)).toBeTruthy();

    fireEvent.press(screen.getByRole('button'));

    expect(screen.getByText('Vader is the father.')).toBeTruthy();
    expect(screen.queryByText(/contains spoilers/i)).toBeNull();
  });
});
