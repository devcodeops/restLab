import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunsTable } from './runs-table';
import { renderWithProviders } from '../test/render-with-providers';

describe('RunsTable', () => {
  const runs = [
    {
      id: 'abc12345',
      workflowName: 'chain',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      totalCalls: 10,
      successCalls: 9,
      errorCalls: 1,
      p95LatencyMs: 50,
    },
  ];

  it('renders runs and clear action', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    renderWithProviders(<RunsTable runs={runs} onClear={onClear} clearing={false} />);

    expect(screen.getByText(/Recent runs|Runs recientes/i)).toBeInTheDocument();
    expect(screen.getAllByText('chain').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /Clear log|Limpiar log/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it('renders running state, no p95 fallback and clearing label', () => {
    const onClear = vi.fn();
    renderWithProviders(
      <RunsTable
        runs={[
          {
            id: 'run-2',
            workflowName: 'random',
            startedAt: new Date().toISOString(),
            finishedAt: null,
            totalCalls: 0,
            successCalls: 0,
            errorCalls: 0,
            p95LatencyMs: null,
          },
        ]}
        onClear={onClear}
        clearing
      />,
    );

    expect(screen.getAllByText(/running|en ejecución/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
