'use client';

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { useI18n } from '../lib/i18n';

interface ServiceInfo {
  name: string;
  url: string;
  health: { status: string; time?: string };
  chaos: {
    mode: string;
    forceStatusCode?: number;
    errorProbability?: number;
    fixedLatencyMs?: number;
    randomLatencyMinMs?: number;
    randomLatencyMaxMs?: number;
    timeoutProbability?: number;
  };
}

type ChaosMode = 'normal' | 'forceStatus' | 'probabilisticError' | 'latency' | 'timeout';

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
      <span className="mb-1 flex items-center gap-2 text-xs text-muted">
        {label}
        <FieldHelp id={helpId} title={helpTitle} open={open} onToggle={onToggle}>
          {children}
        </FieldHelp>
      </span>
    </label>
  );
}

export function ServiceCards() {
  const { t } = useI18n();
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openHelpId, setOpenHelpId] = useState<string | null>(null);
  const [selectedModes, setSelectedModes] = useState<Record<string, ChaosMode>>({});
  const [dirtyModes, setDirtyModes] = useState<Record<string, boolean>>({});
  const dirtyModesRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    dirtyModesRef.current = dirtyModes;
  }, [dirtyModes]);

  async function load() {
    try {
      const data = await apiGet<{ services: ServiceInfo[] }>('/services');
      setServices(data.services);
      setSelectedModes((prev) => {
        const next: Record<string, ChaosMode> = {};
        for (const svc of data.services) {
          if (dirtyModesRef.current[svc.name]) {
            next[svc.name] = prev[svc.name] ?? (svc.chaos.mode as ChaosMode) ?? 'normal';
          } else {
            next[svc.name] = (svc.chaos.mode as ChaosMode) ?? 'normal';
          }
        }
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.errorLoading'));
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, []);

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

  function toggleHelp(id: string) {
    setOpenHelpId((current) => (current === id ? null : id));
  }

  function getMode(service: ServiceInfo): ChaosMode {
    return selectedModes[service.name] ?? (service.chaos.mode as ChaosMode) ?? 'normal';
  }

  async function applyConfig(event: FormEvent<HTMLFormElement>, serviceName: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mode = String(form.get('mode'));
    const payload = {
      mode,
      forceStatusCode: Number(form.get('forceStatusCode')) || undefined,
      errorProbability: Number(form.get('errorProbability')) || undefined,
      fixedLatencyMs: Number(form.get('fixedLatencyMs')) || undefined,
      randomLatencyMinMs: Number(form.get('randomLatencyMinMs')) || undefined,
      randomLatencyMaxMs: Number(form.get('randomLatencyMaxMs')) || undefined,
      timeoutProbability: Number(form.get('timeoutProbability')) || undefined,
    };

    try {
      await apiPost(`/services/${serviceName}/chaos`, payload);
      setDirtyModes((prev) => ({ ...prev, [serviceName]: false }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.errorUpdating'));
    }
  }

  async function reset(serviceName: string) {
    try {
      await apiPost(`/services/${serviceName}/chaos/reset`);
      setDirtyModes((prev) => ({ ...prev, [serviceName]: false }));
      setSelectedModes((prev) => ({ ...prev, [serviceName]: 'normal' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('services.errorResetting'));
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <section className="panel space-y-2">
        <h3 className="text-base font-semibold">{t('services.introTitle')}</h3>
        <p className="text-sm text-slate-700">{t('services.intro1')}</p>
        <p className="text-sm text-slate-700">{t('services.intro2')}</p>
      </section>
      <div className="grid auto-rows-fr items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((svc) => {
          const currentMode = getMode(svc);
          return (
          <article key={svc.name} className="panel flex h-full min-h-[520px] flex-col space-y-3">
            <header className="flex items-center justify-between">
              <h3 className="font-semibold">{svc.name}</h3>
              <span className="flex items-center gap-2">
                <span className={svc.health?.status === 'ok' ? 'badge-ok' : 'badge-err'}>
                  {svc.health?.status === 'ok' ? t('common.ok') : t('common.down')}
                </span>
                <FieldHelp
                  id={`health-${svc.name}`}
                  title={`${t('services.healthTitle')} ${svc.name}`}
                  open={openHelpId === `health-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.health1')}</p>
                  <p>{t('services.health2')}</p>
                </FieldHelp>
              </span>
            </header>
            <p className="flex items-center gap-2 text-xs text-muted">
              {svc.url}
              <FieldHelp
                id={`url-${svc.name}`}
                title={`${t('services.urlTitle')} ${svc.name}`}
                open={openHelpId === `url-${svc.name}`}
                onToggle={toggleHelp}
              >
                <p>{t('services.url1')}</p>
                <p>{t('services.url2')}</p>
              </FieldHelp>
            </p>

            <form className="flex flex-1 flex-col" onSubmit={(e) => applyConfig(e, svc.name)}>
              <div className="space-y-2">
                <div>
                <LabelWithHelp
                  helpId={`mode-${svc.name}`}
                  label={t('services.mode')}
                  helpTitle={t('services.mode')}
                  open={openHelpId === `mode-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.mode1')}</p>
                  <p>{t('services.mode2')}</p>
                  <p>{t('services.mode3')}</p>
                  <p>{t('services.mode4')}</p>
                  <p>{t('services.mode5')}</p>
                  <p>{t('services.mode6')}</p>
                </LabelWithHelp>
                <select
                  className="input"
                  name="mode"
                  value={currentMode}
                  onChange={(e) => {
                    setSelectedModes((prev) => ({
                      ...prev,
                      [svc.name]: e.target.value as ChaosMode,
                    }));
                    setDirtyModes((prev) => ({
                      ...prev,
                      [svc.name]: true,
                    }));
                  }}
                >
                  <option value="normal">normal</option>
                  <option value="forceStatus">forceStatus</option>
                  <option value="probabilisticError">probabilisticError</option>
                  <option value="latency">latency</option>
                  <option value="timeout">timeout</option>
                </select>
              </div>

              {currentMode === 'forceStatus' ? (
              <div>
                <LabelWithHelp
                  helpId={`force-status-${svc.name}`}
                  label="forceStatusCode"
                  helpTitle="forceStatusCode"
                  open={openHelpId === `force-status-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.forceStatus1')}</p>
                  <p>{t('services.forceStatus2')}</p>
                  <p>{t('services.forceStatus3')}</p>
                </LabelWithHelp>
                <input
                  className="input"
                  name="forceStatusCode"
                  placeholder="forceStatusCode 400-599"
                  defaultValue={svc.chaos.forceStatusCode ?? ''}
                />
              </div>
              ) : null}

              {currentMode === 'probabilisticError' ? (
              <div>
                <LabelWithHelp
                  helpId={`error-prob-${svc.name}`}
                  label="errorProbability"
                  helpTitle="errorProbability"
                  open={openHelpId === `error-prob-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.errorProb1')}</p>
                  <p>{t('services.errorProb2')}</p>
                  <p>{t('services.errorProb3')}</p>
                </LabelWithHelp>
                <input
                  className="input"
                  name="errorProbability"
                  placeholder="errorProbability 0..1"
                  defaultValue={svc.chaos.errorProbability ?? ''}
                />
              </div>
              ) : null}

              {currentMode === 'latency' ? (
              <div>
                <LabelWithHelp
                  helpId={`fixed-latency-${svc.name}`}
                  label="fixedLatencyMs"
                  helpTitle="fixedLatencyMs"
                  open={openHelpId === `fixed-latency-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.fixedLatency1')}</p>
                  <p>{t('services.fixedLatency2')}</p>
                </LabelWithHelp>
                <input
                  className="input"
                  name="fixedLatencyMs"
                  placeholder="fixedLatencyMs"
                  defaultValue={svc.chaos.fixedLatencyMs ?? ''}
                />
              </div>
              ) : null}

              {currentMode === 'latency' ? (
              <div>
                <LabelWithHelp
                  helpId={`random-latency-min-${svc.name}`}
                  label="randomLatencyMinMs"
                  helpTitle="randomLatencyMinMs"
                  open={openHelpId === `random-latency-min-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.randomMin1')}</p>
                  <p>{t('services.randomMin2')}</p>
                </LabelWithHelp>
                <input
                  className="input"
                  name="randomLatencyMinMs"
                  placeholder="randomLatencyMinMs"
                  defaultValue={svc.chaos.randomLatencyMinMs ?? ''}
                />
              </div>
              ) : null}

              {currentMode === 'latency' ? (
              <div>
                <LabelWithHelp
                  helpId={`random-latency-max-${svc.name}`}
                  label="randomLatencyMaxMs"
                  helpTitle="randomLatencyMaxMs"
                  open={openHelpId === `random-latency-max-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.randomMax1')}</p>
                  <p>{t('services.randomMax2')}</p>
                </LabelWithHelp>
                <input
                  className="input"
                  name="randomLatencyMaxMs"
                  placeholder="randomLatencyMaxMs"
                  defaultValue={svc.chaos.randomLatencyMaxMs ?? ''}
                />
              </div>
              ) : null}

              {currentMode === 'timeout' ? (
              <div>
                <LabelWithHelp
                  helpId={`timeout-prob-${svc.name}`}
                  label="timeoutProbability"
                  helpTitle="timeoutProbability"
                  open={openHelpId === `timeout-prob-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.timeoutProb1')}</p>
                  <p>{t('services.timeoutProb2')}</p>
                  <p>{t('services.timeoutProb3')}</p>
                </LabelWithHelp>
                <input
                  className="input"
                  name="timeoutProbability"
                  placeholder="timeoutProbability 0..1"
                  defaultValue={svc.chaos.timeoutProbability ?? ''}
                />
              </div>
              ) : null}
              </div>

              <div className="mt-auto flex gap-2 pt-2">
                <button type="submit" className="button">
                  {t('common.apply')}
                </button>
                <button type="button" className="button-secondary" onClick={() => reset(svc.name)}>
                  {t('common.resetNormal')}
                </button>
                <FieldHelp
                  id={`reset-${svc.name}`}
                  title={t('services.resetTitle')}
                  open={openHelpId === `reset-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>{t('services.reset1')}</p>
                  <p>{t('services.reset2')}</p>
                </FieldHelp>
              </div>
            </form>
          </article>
          );
        })}
      </div>
    </div>
  );
}
