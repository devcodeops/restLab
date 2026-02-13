'use client';

import Link from 'next/link';

interface Run {
  id: string;
  workflowName: string;
  startedAt: string;
  finishedAt?: string | null;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  p95LatencyMs?: number | null;
}

interface RunsTableProps {
  runs: Run[];
  onClear: () => Promise<void> | void;
  clearing: boolean;
}

export function RunsTable({ runs, onClear, clearing }: RunsTableProps) {
  return (
    <div className="panel overflow-x-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Runs recientes</h2>
        <button className="button" type="button" onClick={() => void onClear()} disabled={clearing}>
          {clearing ? 'Limpiando...' : 'Limpiar log'}
        </button>
      </div>
      <table className="min-w-full text-sm">
        <thead className="text-left text-muted">
          <tr>
            <th className="py-2">Run ID</th>
            <th>Workflow</th>
            <th>Inicio</th>
            <th>Duración</th>
            <th>Success rate</th>
            <th>Errores</th>
            <th>p95</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const duration = run.finishedAt
              ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
              : null;
            const successRate = run.totalCalls > 0 ? (run.successCalls / run.totalCalls) * 100 : 0;

            return (
              <tr key={run.id} className="border-t border-slate-100">
                <td className="py-2">
                  <Link href={`/runs/${run.id}`} className="font-mono text-xs underline">
                    {run.id.slice(0, 8)}...
                  </Link>
                </td>
                <td>{run.workflowName}</td>
                <td>{new Date(run.startedAt).toLocaleString()}</td>
                <td>{duration != null ? `${duration} ms` : 'running'}</td>
                <td>{successRate.toFixed(1)}%</td>
                <td>{run.errorCalls}</td>
                <td>{run.p95LatencyMs ? `${run.p95LatencyMs} ms` : '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
