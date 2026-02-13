'use client';

import Link from 'next/link';
import { useI18n } from '../lib/i18n';

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
  const { t } = useI18n();

  return (
    <div className="panel overflow-x-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('dashboard.recentRuns')}</h2>
        <button className="button" type="button" onClick={() => void onClear()} disabled={clearing}>
          {clearing ? t('dashboard.clearing') : t('dashboard.clearLog')}
        </button>
      </div>
      <div className="space-y-3 md:hidden">
        {runs.map((run) => {
          const duration = run.finishedAt
            ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
            : null;
          const successRate = run.totalCalls > 0 ? (run.successCalls / run.totalCalls) * 100 : 0;

          return (
            <article key={run.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Link href={`/runs/${run.id}`} className="min-w-0 font-mono text-xs underline">
                  <span className="block truncate">{run.id}</span>
                </Link>
                <span className="text-xs text-muted">{run.workflowName}</span>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt className="text-muted">{t('common.start')}</dt>
                <dd className="text-right">{new Date(run.startedAt).toLocaleString()}</dd>

                <dt className="text-muted">{t('common.duration')}</dt>
                <dd className="text-right">{duration != null ? `${duration} ms` : t('common.running')}</dd>

                <dt className="text-muted">{t('dashboard.successRate')}</dt>
                <dd className="text-right">{successRate.toFixed(1)}%</dd>

                <dt className="text-muted">{t('common.errors')}</dt>
                <dd className="text-right">{run.errorCalls}</dd>

                <dt className="text-muted">{t('dashboard.p95')}</dt>
                <dd className="text-right">{run.p95LatencyMs ? `${run.p95LatencyMs} ms` : '-'}</dd>
              </dl>
            </article>
          );
        })}
      </div>

      <table className="hidden min-w-full text-sm md:table">
        <thead className="text-left text-muted">
          <tr>
            <th className="py-2">{t('dashboard.runId')}</th>
            <th>{t('dashboard.workflow')}</th>
            <th>{t('common.start')}</th>
            <th>{t('common.duration')}</th>
            <th>{t('dashboard.successRate')}</th>
            <th>{t('common.errors')}</th>
            <th>{t('dashboard.p95')}</th>
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
                <td>{duration != null ? `${duration} ms` : t('common.running')}</td>
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
