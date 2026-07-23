import { render } from '@testing-library/react-native';

import { ThemeProvider } from '@/theme/ThemeContext';

/** Render helper that provides the app theme context. */
export function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
