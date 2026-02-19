import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LocaleProvider, useI18n } from './i18n';

function Probe() {
  const { t, locale } = useI18n();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span>{t('nav.dashboard')}</span>
    </div>
  );
}

describe('i18n', () => {
  it('provides default locale and dictionary lookups', async () => {
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    expect(await screen.findByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByTestId('locale').textContent).toMatch(/en|es/);
  });

  it('uses saved locale from localStorage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('es');
    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    expect(await screen.findByText(/Panel|Dashboard/i)).toBeInTheDocument();
    expect(screen.getByTestId('locale')).toHaveTextContent('es');
    vi.restoreAllMocks();
  });

  it('falls back gracefully when localStorage access fails', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    render(
      <LocaleProvider>
        <Probe />
      </LocaleProvider>,
    );

    expect(await screen.findByTestId('locale')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('throws when useI18n is used outside LocaleProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    function BrokenProbe() {
      useI18n();
      return null;
    }

    expect(() => render(<BrokenProbe />)).toThrow(/useI18n must be used within LocaleProvider/i);
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });
});
