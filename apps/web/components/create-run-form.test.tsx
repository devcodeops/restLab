import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateRunForm } from './create-run-form';
import { renderWithProviders } from '../test/render-with-providers';

const apiPostMock = vi.fn().mockResolvedValue({ runId: 'run-1' });

vi.mock('../lib/api', () => ({
  apiPost: (...args: unknown[]) => apiPostMock(...args),
}));

describe('CreateRunForm', () => {
  it('submits form and calls onCreated callback', async () => {
    apiPostMock.mockResolvedValueOnce({ runId: 'run-1' });
    const user = userEvent.setup();
    const onCreated = vi.fn();
    renderWithProviders(<CreateRunForm onCreated={onCreated} />);

    await user.click(screen.getByRole('button', { name: /Start Run/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith('run-1');
    });
  });

  it('opens retry fields and submit with retry policy enabled', async () => {
    apiPostMock.mockResolvedValueOnce({ runId: 'run-2' });
    const user = userEvent.setup();
    const onCreated = vi.fn();
    const { container } = renderWithProviders(<CreateRunForm onCreated={onCreated} />);

    await user.click(screen.getByRole('checkbox'));
    expect(container.querySelector('input[name="retries"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="backoffMs"]')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Start Run/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
  });

  it('shows fallback error and closes help popover on outside click', async () => {
    apiPostMock.mockRejectedValueOnce('bad-submit');
    const user = userEvent.setup();
    renderWithProviders(<CreateRunForm onCreated={vi.fn()} />);

    const helpButtons = screen.getAllByRole('button', { name: /Help about/i });
    await user.click(helpButtons[0]);
    expect(screen.getByText(/Defines the call pattern|Define el patrón/i)).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByText(/Defines the call pattern|Define el patrón/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Start Run/i }));
    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });
});
