'use client';

import { useEffect, useRef, useState } from 'react';
import { CreateRunForm } from '../components/create-run-form';
import { RunsTable } from '../components/runs-table';
import { apiGet, apiPost, getSseUrl } from '../lib/api';

interface RunsResponse {
  items: Array<{
    id: string;
    workflowName: string;
    startedAt: string;
    finishedAt?: string | null;
    totalCalls: number;
    successCalls: number;
    errorCalls: number;
    p95LatencyMs?: number | null;
  }>;
}

export default function HomePage() {
  const [runs, setRuns] = useState<RunsResponse['items']>([]);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const isFetchingRef = useRef(false);
  const mainRef = useRef<HTMLElement>(null);

  async function loadRuns() {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const data = await apiGet<RunsResponse>('/runs?page=1&pageSize=20');
      setRuns(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error loading runs');
    } finally {
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    loadRuns();

    const source = new EventSource(getSseUrl('/runs/global/events'));
    source.onmessage = () => {
      loadRuns();
    };
    source.onerror = () => {
      // EventSource retries automatically; keep UI quiet here.
    };

    const reconcileTimer = setInterval(loadRuns, 90000);
    const onVisibility = () => {
      if (!document.hidden) {
        loadRuns();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      source.close();
      clearInterval(reconcileTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
  }, []);

  async function clearRuns() {
    setClearing(true);
    try {
      await apiPost('/runs/clear');
      setRuns([]);
      setError(null);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error clearing runs');
    } finally {
      setClearing(false);
    }
  }

  function closeClearModal() {
    setShowClearConfirm(false);
    if (mainRef.current) {
      mainRef.current.focus();
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && showClearConfirm) {
        closeClearModal();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showClearConfirm]);

  return (
    <main className="space-y-6" ref={mainRef} tabIndex={-1}>
      <CreateRunForm onCreated={() => loadRuns()} />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <RunsTable runs={runs} onClear={() => setShowClearConfirm(true)} clearing={clearing} />

      {showClearConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeClearModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-panel" role="dialog" aria-modal="true">
            <h3 className="text-lg font-semibold">Confirmar limpieza de logs</h3>
            <p className="mt-2 text-sm text-slate-700">
              Vas a eliminar todos los runs y calls almacenados en el historial.
            </p>
            <p className="mt-1 text-xs text-slate-500">Esta accion no se puede deshacer.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="button-secondary" type="button" onClick={closeClearModal}>
                Cancelar
              </button>
              <button
                className="button"
                type="button"
                disabled={clearing}
                onClick={async () => {
                  closeClearModal();
                  await clearRuns();
                }}
              >
                {clearing ? 'Limpiando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
