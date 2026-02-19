import { render } from '@testing-library/react';
import { ReactElement } from 'react';
import { LocaleProvider } from '../lib/i18n';

export function renderWithProviders(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}
