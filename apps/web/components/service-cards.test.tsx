import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceCards } from './service-cards';
import { renderWithProviders } from '../test/render-with-providers';

const apiGetMock = vi.fn().mockResolvedValue({
  services: [
    {
      name: 'svc-alpha',
      url: 'http://svc-alpha:3011',
      health: { status: 'ok' },
      chaos: { mode: 'normal' },
    },
  ],
});
const apiPostMock = vi.fn().mockResolvedValue({});

vi.mock('../lib/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
  apiPost: (...args: unknown[]) => apiPostMock(...args),
}));

describe('ServiceCards', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiGetMock.mockResolvedValue({
      services: [
        {
          name: 'svc-alpha',
          url: 'http://svc-alpha:3011',
          health: { status: 'ok' },
          chaos: { mode: 'normal' },
        },
      ],
    });
    apiPostMock.mockReset();
    apiPostMock.mockResolvedValue({});
  });

  it('loads services and applies configuration', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceCards />);

    expect(await screen.findByText('svc-alpha')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Apply|Aplicar/i }));
    expect(apiPostMock).toHaveBeenCalled();
  });

  it('switches modes and renders mode-specific fields', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ServiceCards />);

    await screen.findByText('svc-alpha');
    const modeSelect = container.querySelector('select[name="mode"]') as HTMLSelectElement;
    expect(modeSelect).toBeTruthy();

    await user.selectOptions(modeSelect, 'latency');
    expect(container.querySelector('input[name="fixedLatencyMs"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="randomLatencyMinMs"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="randomLatencyMaxMs"]')).toBeInTheDocument();

    await user.selectOptions(modeSelect, 'timeout');
    expect(container.querySelector('input[name="timeoutProbability"]')).toBeInTheDocument();
  });

  it('handles reset action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceCards />);
    await screen.findByText('svc-alpha');
    const resetButtons = screen.getAllByRole('button', { name: /Reset normal/i });
    await user.click(resetButtons[0]);
    expect(apiPostMock).toHaveBeenLastCalledWith('/services/svc-alpha/chaos/reset');
  });

  it('renders forceStatus and probabilistic mode fields', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ServiceCards />);
    await screen.findByText('svc-alpha');

    const modeSelect = container.querySelector('select[name="mode"]') as HTMLSelectElement;
    await user.selectOptions(modeSelect, 'forceStatus');
    expect(container.querySelector('input[name="forceStatusCode"]')).toBeInTheDocument();

    await user.selectOptions(modeSelect, 'probabilisticError');
    expect(container.querySelector('input[name="errorProbability"]')).toBeInTheDocument();
  });

  it('opens help popover and closes it on outside click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ServiceCards />);
    await screen.findByText('svc-alpha');

    const helpButtons = screen.getAllByRole('button', { name: /Help about/i });
    await user.click(helpButtons[0]);
    expect(screen.getByText(/GET \/health/i)).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByText(/GET \/health/i)).not.toBeInTheDocument();
  });

  it('shows fallback load error when services request fails with non-Error value', async () => {
    apiGetMock.mockRejectedValueOnce('bad-load');
    renderWithProviders(<ServiceCards />);
    expect(await screen.findByText(/error loading services/i)).toBeInTheDocument();
  });

  it('shows fallback update error when apply fails with non-Error value', async () => {
    const user = userEvent.setup();
    apiPostMock.mockRejectedValueOnce('bad-update');
    renderWithProviders(<ServiceCards />);
    await screen.findByText('svc-alpha');

    await user.click(screen.getByRole('button', { name: /Apply|Aplicar/i }));
    expect(await screen.findByText(/error updating chaos/i)).toBeInTheDocument();
  });
});
