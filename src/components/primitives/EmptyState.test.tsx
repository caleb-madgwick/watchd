import { fireEvent, screen } from '@testing-library/react-native';

import { EmptyState } from './EmptyState';
import { renderWithTheme } from '@/test/renderWithTheme';

describe('EmptyState', () => {
  it('renders title, message, and fires the action', () => {
    const onAction = jest.fn();
    renderWithTheme(
      <EmptyState
        title="Nothing here"
        message="Try following someone."
        actionTitle="Find people"
        onAction={onAction}
      />,
    );

    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Try following someone.')).toBeTruthy();
    fireEvent.press(screen.getByText('Find people'));
    expect(onAction).toHaveBeenCalled();
  });

  it('omits the action button when not provided', () => {
    renderWithTheme(<EmptyState title="Quiet" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
