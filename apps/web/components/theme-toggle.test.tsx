import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './theme-toggle';
import { renderWithProviders } from '../test/render-with-providers';

describe('ThemeToggle', () => {
  it('toggles data-theme attribute', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeToggle />);

    const button = screen.getByRole('button');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    await user.click(button);
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/dark|light/);
  });

  it('handles storage failures and timer cleanup paths', async () => {
    vi.useFakeTimers();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked');
    });

    const { unmount } = renderWithProviders(<ThemeToggle />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('theme-animating')).toBe(true);
    vi.advanceTimersByTime(350);
    expect(document.documentElement.classList.contains('theme-animating')).toBe(false);

    fireEvent.click(button);
    unmount();
    expect(document.documentElement.classList.contains('theme-animating')).toBe(false);

    vi.restoreAllMocks();
    vi.useRealTimers();
  });
});
