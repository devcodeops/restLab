'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface KillTarget {
  name: string;
  url: string;
  status: 'ok' | 'down';
}

export function SigkillPanel() {
  const { t } = useI18n();
  const [targets, setTargets] = useState<KillTarget[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<KillTarget | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  const loadTargets = useCallback(async () => {
    try {
      const data = await apiGet<{ items: KillTarget[] }>('/services/kill-targets');
      setTargets(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sigkill.errorLoading'));
    }
  }, [t]);

  async function kill(target: KillTarget) {
    try {
      setRunning(target.name);
      await apiPost(`/services/${target.name}/terminate`, { signal: 'SIGTERM', delayMs: 250 });
      await loadTargets();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sigkill.errorSending'));
    } finally {
      setRunning(null);
    }
  }

  function closeModal() {
    setConfirmTarget(null);
    if (viewRef.current) {
      viewRef.current.focus();
    }
  }

  useEffect(() => {
    loadTargets();
    const timer = setInterval(loadTargets, 3000);
    return () => clearInterval(timer);
  }, [loadTargets]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && confirmTarget) {
        closeModal();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmTarget]);

  return (
    <div className="space-y-4" ref={viewRef} tabIndex={-1}>
      <section className="panel space-y-2">
        <h2 className="text-lg font-semibold">{t('sigkill.panelTitle')}</h2>
        <p className="text-sm text-slate-700">{t('sigkill.panel1')}</p>
        <p className="text-sm text-slate-700">{t('sigkill.panel2')}</p>
      </section>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="mx-auto flex w-full max-w-7xl flex-wrap justify-center gap-4">
        {targets.map((target) => (
          <article
            key={target.name}
            className="panel flex min-h-[240px] w-full md:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)] xl:max-w-none flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{target.name}</h3>
                <span className={target.status === 'ok' ? 'badge-ok' : 'badge-err'}>
                  {target.status === 'ok' ? t('common.ok') : t('common.down')}
                </span>
              </div>
              <p className="text-xs text-muted">{target.url}</p>
            </div>

            <button
              className="button"
              onClick={() => setConfirmTarget(target)}
              disabled={running === target.name}
            >
              {running === target.name ? t('sigkill.sending') : t('sigkill.sendCta')}
            </button>
          </article>
        ))}
      </div>

      {confirmTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-panel" role="dialog" aria-modal="true">
            <h3 className="text-lg font-semibold">{t('sigkill.confirmTitle')}</h3>
            <p className="mt-2 text-sm text-slate-700">
              {t('sigkill.confirmBody')} <span className="font-semibold">{confirmTarget.name}</span>.{' '}
              {t('sigkill.confirmWarn')}
            </p>
            <p className="mt-1 text-xs text-slate-500">{t('sigkill.confirmNote')}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="button-secondary" type="button" onClick={closeModal}>
                {t('common.cancel')}
              </button>
              <button
                className="button"
                type="button"
                onClick={async () => {
                  const target = confirmTarget;
                  closeModal();
                  if (target) {
                    await kill(target);
                  }
                }}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
