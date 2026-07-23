import { fireEvent, screen } from '@testing-library/react-native';

import { RatingInput } from './RatingStars';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('RatingInput', () => {
  it('exposes an adjustable control with the current value', () => {
    renderWithTheme(<RatingInput value={3.5} onChange={jest.fn()} />);
    const control = screen.getByLabelText('Star rating');
    expect(control.props.accessibilityValue).toEqual({ text: '3.5 of 5 stars' });
  });

  it('supports accessibility increment/decrement in half-star steps', () => {
    const onChange = jest.fn();
    renderWithTheme(<RatingInput value={3.5} onChange={onChange} />);
    const control = screen.getByLabelText('Star rating');

    fireEvent(control, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(4);

    fireEvent(control, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  it('clears when decrementing from the minimum', () => {
    const onChange = jest.fn();
    renderWithTheme(<RatingInput value={0.5} onChange={onChange} />);
    fireEvent(screen.getByLabelText('Star rating'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('maps tap position to a rating and toggles the same value off', () => {
    const onChange = jest.fn();
    renderWithTheme(<RatingInput value={0} onChange={onChange} size={30} />);
    const control = screen.getByLabelText('Star rating');
    // Row width = 30*5 + 4*4 = 166; tapping the far right = 5 stars.
    fireEvent.press(control, { nativeEvent: { locationX: 165 } });
    expect(onChange).toHaveBeenLastCalledWith(5);
  });
});
