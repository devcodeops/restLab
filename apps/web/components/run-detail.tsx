'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, getSseUrl } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface CallNode {
  id: string;
  parentCallId?: string | null;
  fromService: string;
  toService: string;
  statusCode?: number | null;
  durationMs: number;
  errorType?: string | null;
  errorMessage?: string | null;
  children?: CallNode[];
}

interface RunDetail {
  run: {
    id: string;
    status: string;
    workflowName: string;
    startedAt: string;
    finishedAt?: string | null;
    totalCalls: number;
    successCalls: number;
    errorCalls: number;
    timeoutCalls: number;
    p50LatencyMs?: number | null;
    p95LatencyMs?: number | null;
  };
  calls: CallNode[];
  callGraph: CallNode[];
}

function Tree({ nodes, level = 0 }: { nodes: CallNode[]; level?: number }) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div key={node.id} style={{ marginLeft: level * 16 }} className="rounded border border-slate-200 p-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-medium">
              {node.fromService} -&gt; {node.toService}
            </span>
            <span>
              {node.statusCode ?? 'n/a'} | {node.durationMs} ms
            </span>
          </div>
          {node.children && node.children.length > 0 ? <Tree nodes={node.children} level={level + 1} /> : null}
        </div>
      ))}
    </div>
  );
}

export function RunDetailView({ runId }: { runId: string }) {
  const { t } = useI18n();
  const [data, setData] = useState<RunDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'error'>('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<'graph' | 'calls' | null>(null);

  const loadDetail = useCallback(async () => {
    try {
      const detail = await apiGet<RunDetail>(`/runs/${runId}`);
      setData(detail);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('runs.errorLoadingRun'));
    }
  }, [runId, t]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    const runStatus = data?.run?.status;
    if (runStatus !== 'running') return;
    const source = new EventSource(getSseUrl(`/runs/${runId}/events`));
    source.onmessage = () => {
      loadDetail();
    };
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, [data?.run?.status, loadDetail, runId]);

  const filteredCalls = useMemo(() => {
    if (!data) return [];
    return data.calls.filter((call) => {
      const statusOk = (call.statusCode ?? 0) >= 200 && (call.statusCode ?? 0) < 400;
      if (statusFilter === 'ok' && !statusOk) return false;
      if (statusFilter === 'error' && statusOk) return false;
      if (serviceFilter !== 'all' && call.toService !== serviceFilter && call.fromService !== serviceFilter) {
        return false;
      }
      return true;
    });
  }, [data, serviceFilter, statusFilter]);

  const services = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.calls.flatMap((c) => [c.fromService, c.toService])));
  }, [data]);

  if (!data) {
    return <p className="text-sm text-muted">{t('runs.loadingRun')}</p>;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <section className="panel grid gap-3 md:grid-cols-4">
        <div>
          <p className="text-xs text-muted">{t('common.workflow')}</p>
          <p className="font-medium">{data.run.workflowName}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t('runs.state')}</p>
          <p className="font-medium">{data.run.status}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t('runs.calls')}</p>
          <p className="font-medium">
            {data.run.totalCalls} ({data.run.successCalls} {t('common.ok')} / {data.run.errorCalls} {t('common.errors')} /{' '}
            {data.run.timeoutCalls} {t('common.timeout')})
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">{t('runs.latencies')}</p>
          <p className="font-medium">
            p50: {data.run.p50LatencyMs ?? '-'} ms | p95: {data.run.p95LatencyMs ?? '-'} ms
          </p>
        </div>
      </section>

      <section className="panel overflow-hidden p-0">
        <button
          type="button"
          className="accordion-trigger flex h-14 w-full items-center justify-between px-4 text-left"
          onClick={() => setOpenSection((current) => (current === 'graph' ? null : 'graph'))}
        >
          <h2 className="text-lg font-semibold">{t('runs.callGraph')}</h2>
          <span className="text-sm text-muted">{openSection === 'graph' ? '▲' : '▼'}</span>
        </button>
        <div className={`accordion-content ${openSection === 'graph' ? 'open' : ''}`}>
          <div className="accordion-inner">
            <div className="px-4 pb-4 pt-1">
              <Tree nodes={data.callGraph} />
            </div>
          </div>
        </div>
      </section>

      <section className="panel overflow-hidden p-0">
        <button
          type="button"
          className="accordion-trigger flex h-14 w-full items-center justify-between px-4 text-left"
          onClick={() => setOpenSection((current) => (current === 'calls' ? null : 'calls'))}
        >
          <h2 className="text-lg font-semibold">{t('runs.callsTable')}</h2>
          <span className="text-sm text-muted">{openSection === 'calls' ? '▲' : '▼'}</span>
        </button>
        <div className={`accordion-content ${openSection === 'calls' ? 'open' : ''}`}>
          <div className="accordion-inner">
            <div className="space-y-3 px-4 pb-4 pt-1">
            <div className="grid gap-3 md:grid-cols-3">
              <label>
                <span className="mb-1 block text-xs text-muted">{t('common.status')}</span>
                <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as never)}>
                  <option value="all">{t('common.all')}</option>
                  <option value="ok">{t('common.ok')}</option>
                  <option value="error">{t('common.error')}</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-xs text-muted">{t('common.service')}</span>
                <select className="input" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                  <option value="all">{t('common.all')}</option>
                  {services.map((svc) => (
                    <option key={svc} value={svc}>
                      {svc}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-muted">
                  <tr>
                    <th className="py-2">{t('runs.from')}</th>
                    <th>{t('runs.to')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.duration')}</th>
                    <th>{t('runs.errorType')}</th>
                    <th>{t('runs.errorMessage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call) => (
                    <tr key={call.id} className="border-t border-slate-100">
                      <td className="py-2">{call.fromService}</td>
                      <td>{call.toService}</td>
                      <td>{call.statusCode ?? 'n/a'}</td>
                      <td>{call.durationMs} ms</td>
                      <td>{call.errorType ?? '-'}</td>
                      <td>{call.errorMessage ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
