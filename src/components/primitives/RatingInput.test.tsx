import { fireEvent, screen } from '@testing-library/react-native';

import { RatingInput } from './RatingStars';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('RatingInput', () => {
  it('sets a full-star rating from its tap zone', () => {
    const onChange = jest.fn();
    renderWithTheme(<RatingInput value={0} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Rate 4 stars'));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('sets a half-star rating from its tap zone', () => {
    const onChange = jest.fn();
    renderWithTheme(<RatingInput value={0} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Rate 3.5 stars'));
    expect(onChange).toHaveBeenLastCalledWith(3.5);
  });

  it('clears when tapping the current value again', () => {
    const onChange = jest.fn();
    renderWithTheme(<RatingInput value={4} onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('Rate 4 stars'));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('exposes ten labelled zones covering the half-star scale', () => {
    renderWithTheme(<RatingInput value={0} onChange={jest.fn()} />);
    expect(screen.getByLabelText('Rate 0.5 stars')).toBeTruthy();
    expect(screen.getByLabelText('Rate 1 star')).toBeTruthy();
    expect(screen.getByLabelText('Rate 5 stars')).toBeTruthy();
  });

  it('announces the current value', () => {
    renderWithTheme(<RatingInput value={3.5} onChange={jest.fn()} />);
    expect(screen.getByText('3.5 / 5')).toBeTruthy();
  });

  it('ignores presses when disabled', () => {
    const onChange = jest.fn();
    renderWithTheme(<RatingInput value={0} onChange={onChange} disabled />);
    fireEvent.press(screen.getByLabelText('Rate 4 stars'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
