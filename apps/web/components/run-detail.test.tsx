import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RunDetailView } from './run-detail';
import { renderWithProviders } from '../test/render-with-providers';

const apiGetMock = vi.fn();

vi.mock('../lib/api', () => ({
  apiGet: (...args: unknown[]) => apiGetMock(...args),
  getSseUrl: vi.fn((path: string) => path),
}));

describe('RunDetailView', () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it('renders run stats', async () => {
    apiGetMock.mockResolvedValueOnce({
      run: {
        id: 'run-1',
        status: 'completed',
        workflowName: 'chain',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        totalCalls: 3,
        successCalls: 2,
        errorCalls: 1,
        timeoutCalls: 0,
        p50LatencyMs: 20,
        p95LatencyMs: 40,
      },
      calls: [
        {
          id: 'c1',
          fromService: 'orchestrator-api',
          toService: 'svc-alpha',
          statusCode: 200,
          durationMs: 10,
        },
      ],
      callGraph: [],
    });
    renderWithProviders(<RunDetailView runId="run-1" />);
    expect(await screen.findByText('chain')).toBeInTheDocument();
    expect(screen.getByText(/p50:/i)).toBeInTheDocument();
  });

  it('opens calls section and applies filters', async () => {
    const user = userEvent.setup();
    apiGetMock.mockResolvedValueOnce({
      run: {
        id: 'run-2',
        status: 'running',
        workflowName: 'fanout',
        startedAt: new Date().toISOString(),
        totalCalls: 2,
        successCalls: 1,
        errorCalls: 1,
        timeoutCalls: 0,
      },
      calls: [
        {
          id: 'c-ok',
          fromService: 'svc-alpha',
          toService: 'svc-beta',
          statusCode: 200,
          durationMs: 15,
        },
        {
          id: 'c-err',
          fromService: 'svc-alpha',
          toService: 'svc-gamma',
          statusCode: 500,
          durationMs: 25,
          errorType: 'http_error',
          errorMessage: 'HTTP 500',
        },
      ],
      callGraph: [],
    });

    const { container } = renderWithProviders(<RunDetailView runId="run-2" />);
    await screen.findByText('fanout');
    await user.click(screen.getByRole('button', { name: /Calls/i }));
    expect(screen.getAllByText('svc-beta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('svc-gamma').length).toBeGreaterThan(0);

    const statusSelect = screen.getByLabelText(/Status|Estado/i);
    await user.selectOptions(statusSelect, 'ok');
    expect(screen.getAllByText('svc-beta').length).toBeGreaterThan(0);
    expect(screen.queryByText('HTTP 500')).not.toBeInTheDocument();

    const serviceSelect = screen.getByLabelText(/Service|Servicio/i);
    await user.selectOptions(serviceSelect, 'svc-gamma');
    const tbody = container.querySelector('tbody');
    expect(tbody?.textContent).toBe('');

    await user.selectOptions(statusSelect, 'error');
    expect(tbody?.textContent).toContain('svc-gamma');
    expect(tbody?.textContent).not.toContain('svc-beta');
  });

  it('handles SSE refresh and closes source on error', async () => {
    const closeSpy = vi.fn();
    let currentSource: { onmessage: null | (() => void); onerror: null | (() => void); close: () => void } | null = null;
    class LocalEventSource {
      onmessage: null | (() => void) = null;
      onerror: null | (() => void) = null;
      constructor(_url: string) {
        currentSource = this;
      }
      close() {
        closeSpy();
      }
    }
    // @ts-expect-error test override
    global.EventSource = LocalEventSource;

    apiGetMock
      .mockResolvedValueOnce({
        run: {
          id: 'run-sse',
          status: 'running',
          workflowName: 'chain',
          startedAt: new Date().toISOString(),
          totalCalls: 1,
          successCalls: 1,
          errorCalls: 0,
          timeoutCalls: 0,
        },
        calls: [],
        callGraph: [],
      })
      .mockRejectedValueOnce(new Error('reload failed'));

    renderWithProviders(<RunDetailView runId="run-sse" />);
    await screen.findByText('running');

    currentSource?.onmessage?.();
    expect(await screen.findByText('reload failed')).toBeInTheDocument();

    currentSource?.onerror?.();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('opens call graph and renders nested tree nodes', async () => {
    const user = userEvent.setup();
    apiGetMock.mockResolvedValueOnce({
      run: {
        id: 'run-graph',
        status: 'completed',
        workflowName: 'chain',
        startedAt: new Date().toISOString(),
        totalCalls: 2,
        successCalls: 2,
        errorCalls: 0,
        timeoutCalls: 0,
      },
      calls: [],
      callGraph: [
        {
          id: 'root',
          fromService: 'orchestrator-api',
          toService: 'svc-alpha',
          statusCode: 200,
          durationMs: 10,
          children: [
            {
              id: 'child',
              fromService: 'svc-alpha',
              toService: 'svc-beta',
              statusCode: 200,
              durationMs: 11,
            },
          ],
        },
      ],
    });

    renderWithProviders(<RunDetailView runId="run-graph" />);
    await screen.findByText('chain');
    await user.click(screen.getByRole('button', { name: /Call graph|Grafo/i }));
    expect(screen.getByText(/orchestrator-api/i)).toBeInTheDocument();
    expect(screen.getAllByText(/svc-alpha/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/svc-beta/i).length).toBeGreaterThan(0);
  });
});
