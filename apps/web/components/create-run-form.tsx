'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { apiPost } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface Props {
  onCreated: (runId: string) => void;
}

function FieldHelp({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <span className="help-inline">
      <button
        aria-expanded={open}
        aria-label={`${t('common.helpAbout')} ${title}`}
        className="help-icon"
        onClick={() => onToggle(id)}
        type="button"
      >
        ?
      </button>
      {open ? (
        <div className="help-popover">
        <p className="mb-1 text-xs font-semibold text-ink">{title}</p>
        <div className="space-y-1 text-xs text-slate-700">{children}</div>
        </div>
      ) : null}
    </span>
  );
}

function LabelWithHelp({
  helpId,
  label,
  helpTitle,
  open,
  onToggle,
  children,
}: {
  helpId: string;
  label: string;
  helpTitle: string;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="mb-1 flex items-center gap-2 text-sm text-muted">
        {label}
        <FieldHelp id={helpId} title={helpTitle} open={open} onToggle={onToggle}>
          {children}
        </FieldHelp>
      </span>
    </label>
  );
}

export function CreateRunForm({ onCreated }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryEnabled, setRetryEnabled] = useState(false);
  const [openHelpId, setOpenHelpId] = useState<string | null>(null);

  function toggleHelp(id: string) {
    setOpenHelpId((current) => (current === id ? null : id));
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.help-inline')) return;
      setOpenHelpId(null);
    }

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      workflow: form.get('workflow'),
      iterations: Number(form.get('iterations')),
      concurrency: Number(form.get('concurrency')),
      payloadSize: Number(form.get('payloadSize')) || undefined,
      clientTimeoutMs: Number(form.get('clientTimeoutMs')),
      retryPolicy: retryEnabled
        ? {
            retries: Number(form.get('retries')),
            backoffMs: Number(form.get('backoffMs')),
          }
        : undefined,
    };

    try {
      const data = await apiPost<{ runId: string }>('/runs', payload);
      onCreated(data.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.createdRunError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3">
      <h2 className="text-lg font-semibold">{t('dashboard.createRun')}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <LabelWithHelp
            helpId="workflow"
            label={t('dashboard.workflow')}
            helpTitle={t('dashboard.workflow')}
            open={openHelpId === 'workflow'}
            onToggle={toggleHelp}
          >
            <p>{t('dashboard.formHelp.workflow1')}</p>
            <p>{t('dashboard.formHelp.workflow2')}</p>
            <p>{t('dashboard.formHelp.workflow3')}</p>
            <p>{t('dashboard.formHelp.workflow4')}</p>
            <p>{t('dashboard.formHelp.workflow5')}</p>
          </LabelWithHelp>
          <select className="input" name="workflow" defaultValue="chain">
            <option value="chain">chain</option>
            <option value="fanout">fanout</option>
            <option value="fanout-fanin">fanout-fanin</option>
            <option value="random">random</option>
          </select>
        </div>

        <div>
          <LabelWithHelp
            helpId="iterations"
            label={t('dashboard.iterations')}
            helpTitle={t('dashboard.iterations')}
            open={openHelpId === 'iterations'}
            onToggle={toggleHelp}
          >
            <p>{t('dashboard.formHelp.iterations1')}</p>
            <p>{t('dashboard.formHelp.iterations2')}</p>
            <p>{t('dashboard.formHelp.iterations3')}</p>
          </LabelWithHelp>
          <input className="input" name="iterations" defaultValue={50} type="number" min={1} />
        </div>

        <div>
          <LabelWithHelp
            helpId="concurrency"
            label={t('dashboard.concurrency')}
            helpTitle={t('dashboard.concurrency')}
            open={openHelpId === 'concurrency'}
            onToggle={toggleHelp}
          >
            <p>{t('dashboard.formHelp.concurrency1')}</p>
            <p>{t('dashboard.formHelp.concurrency2')}</p>
            <p>{t('dashboard.formHelp.concurrency3')}</p>
          </LabelWithHelp>
          <input className="input" name="concurrency" defaultValue={5} type="number" min={1} />
        </div>

        <div>
          <LabelWithHelp
            helpId="payload-size"
            label={t('dashboard.payloadSize')}
            helpTitle={t('dashboard.payloadSize')}
            open={openHelpId === 'payload-size'}
            onToggle={toggleHelp}
          >
            <p>{t('dashboard.formHelp.payload1')}</p>
            <p>{t('dashboard.formHelp.payload2')}</p>
            <p>{t('dashboard.formHelp.payload3')}</p>
          </LabelWithHelp>
          <input className="input" name="payloadSize" defaultValue={256} type="number" min={0} />
        </div>

        <div>
          <LabelWithHelp
            helpId="client-timeout"
            label={t('dashboard.clientTimeout')}
            helpTitle={t('dashboard.clientTimeout')}
            open={openHelpId === 'client-timeout'}
            onToggle={toggleHelp}
          >
            <p>{t('dashboard.formHelp.timeout1')}</p>
            <p>{t('dashboard.formHelp.timeout2')}</p>
            <p>{t('dashboard.formHelp.timeout3')}</p>
          </LabelWithHelp>
          <input className="input" name="clientTimeoutMs" defaultValue={2000} type="number" min={100} />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={retryEnabled} onChange={(e) => setRetryEnabled(e.target.checked)} />
        <span className="flex items-center gap-2">
          {t('dashboard.enableRetryPolicy')}
          <FieldHelp
            id="retry-policy"
            title="Retry policy"
            open={openHelpId === 'retry-policy'}
            onToggle={toggleHelp}
          >
            <p>{t('dashboard.formHelp.retry1')}</p>
            <p>{t('dashboard.formHelp.retry2')}</p>
            <p>{t('dashboard.formHelp.retry3')}</p>
            <p>{t('dashboard.formHelp.retry4')}</p>
          </FieldHelp>
        </span>
      </div>

      {retryEnabled ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <LabelWithHelp
              helpId="retries"
              label={t('dashboard.retries')}
              helpTitle={t('dashboard.retries')}
              open={openHelpId === 'retries'}
              onToggle={toggleHelp}
            >
              <p>{t('dashboard.formHelp.retries1')}</p>
              <p>{t('dashboard.formHelp.retries2')}</p>
              <p>{t('dashboard.formHelp.retries3')}</p>
            </LabelWithHelp>
            <input className="input" name="retries" defaultValue={1} type="number" min={0} />
          </div>
          <div>
            <LabelWithHelp
              helpId="backoff-ms"
              label={t('dashboard.backoffMs')}
              helpTitle={t('dashboard.backoffMs')}
              open={openHelpId === 'backoff-ms'}
              onToggle={toggleHelp}
            >
              <p>{t('dashboard.formHelp.backoff1')}</p>
              <p>{t('dashboard.formHelp.backoff2')}</p>
              <p>{t('dashboard.formHelp.backoff3')}</p>
            </LabelWithHelp>
            <input className="input" name="backoffMs" defaultValue={200} type="number" min={0} />
          </div>
        </div>
      ) : null}

      <button className="button" disabled={loading} type="submit">
        {loading ? t('dashboard.starting') : t('dashboard.startRun')}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
