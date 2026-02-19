import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageSwitcher } from './language-switcher';
import { renderWithProviders } from '../test/render-with-providers';

describe('LanguageSwitcher', () => {
  it('changes selected locale', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);

    const select = screen.getByLabelText('Language');
    await user.selectOptions(select, 'es');
    expect((select as HTMLSelectElement).value).toBe('es');
  });
});
