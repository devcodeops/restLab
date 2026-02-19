import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SigkillPanel } from './sigkill-panel';
import { renderWithProviders } from '../test/render-with-providers';

const apiGetMock = vi.fn().mockResolvedValue({
  items: [
    { name: 'svc-alpha', url: 'http://svc-alpha:3011', status: 'ok' },
  ],
});
const apiPostMock = vi.fn().mockResolvedValue({});

vi.mock('../lib/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
  apiPost: (...args: unknown[]) => apiPostMock(...args),
}));

describe('SigkillPanel', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    apiGetMock.mockResolvedValue({
      items: [{ name: 'svc-alpha', url: 'http://svc-alpha:3011', status: 'ok' }],
    });
    apiPostMock.mockResolvedValue({});
  });

  it('loads targets and opens confirmation modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SigkillPanel />);

    expect(await screen.findByText('svc-alpha')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Send SIGKILL|Enviar SIGKILL/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('confirms kill action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SigkillPanel />);

    await screen.findByText('svc-alpha');
    await user.click(screen.getByRole('button', { name: /Send SIGKILL|Enviar SIGKILL/i }));
    await user.click(screen.getByRole('button', { name: /Confirm|Confirmar/i }));

    expect(apiPostMock).toHaveBeenCalledWith('/services/svc-alpha/terminate', {
      signal: 'SIGTERM',
      delayMs: 250,
    });
  });

  it('closes modal on Escape and outside click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SigkillPanel />);

    await screen.findByText('svc-alpha');
    await user.click(screen.getByRole('button', { name: /Send SIGKILL|Enviar SIGKILL/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Send SIGKILL|Enviar SIGKILL/i }));
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    await user.click(overlay);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows fallback error when loading fails with non-Error value', async () => {
    apiGetMock.mockRejectedValueOnce('bad-load');
    renderWithProviders(<SigkillPanel />);
    expect(await screen.findByText(/error loading kill targets/i)).toBeInTheDocument();
  });
});
