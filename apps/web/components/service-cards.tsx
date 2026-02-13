'use client';

import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

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
  return (
    <span className="help-inline">
      <button
        aria-expanded={open}
        aria-label={`Ayuda sobre ${title}`}
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
      setError(err instanceof Error ? err.message : 'error loading services');
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
      setError(err instanceof Error ? err.message : 'error updating chaos');
    }
  }

  async function reset(serviceName: string) {
    try {
      await apiPost(`/services/${serviceName}/chaos/reset`);
      setDirtyModes((prev) => ({ ...prev, [serviceName]: false }));
      setSelectedModes((prev) => ({ ...prev, [serviceName]: 'normal' }));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'error resetting chaos');
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <section className="panel space-y-2">
        <h3 className="text-base font-semibold">Que hace Chaos Mode</h3>
        <p className="text-sm text-slate-700">
          Esta seccion te permite inyectar fallos controlados en cada microservicio para validar
          resiliencia, timeouts, retries y comportamiento del sistema bajo carga.
        </p>
        <p className="text-sm text-slate-700">
          Recomendacion operativa: cambia un parametro a la vez, lanza un run y revisa impacto en
          status codes, latencias y errores del call graph.
        </p>
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
                  {svc.health?.status ?? 'down'}
                </span>
                <FieldHelp
                  id={`health-${svc.name}`}
                  title={`Estado del servicio ${svc.name}`}
                  open={openHelpId === `health-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>`ok` indica que responde `GET /health`.</p>
                  <p>
                    Si aparece `down`, el orchestrator no puede contactar este servicio y los runs
                    se veran afectados.
                  </p>
                </FieldHelp>
              </span>
            </header>
            <p className="flex items-center gap-2 text-xs text-muted">
              {svc.url}
              <FieldHelp
                id={`url-${svc.name}`}
                title={`URL de ${svc.name}`}
                open={openHelpId === `url-${svc.name}`}
                onToggle={toggleHelp}
              >
                <p>Endpoint interno usado por orchestrator para llamar al servicio.</p>
                <p>No es necesario editarlo desde esta pantalla.</p>
              </FieldHelp>
            </p>

            <form className="flex flex-1 flex-col" onSubmit={(e) => applyConfig(e, svc.name)}>
              <div className="space-y-2">
                <div>
                <LabelWithHelp
                  helpId={`mode-${svc.name}`}
                  label="Mode"
                  helpTitle="Mode"
                  open={openHelpId === `mode-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>Define el tipo de comportamiento inyectado para este servicio.</p>
                  <p>`normal`: respuesta saludable.</p>
                  <p>`forceStatus`: siempre devuelve un status de error elegido.</p>
                  <p>`probabilisticError`: falla con probabilidad `p`.</p>
                  <p>`latency`: agrega retraso artificial.</p>
                  <p>`timeout`: simula cuelgues para provocar timeout del cliente.</p>
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
                  <p>Codigo HTTP que el servicio devolvera cuando `mode=forceStatus`.</p>
                  <p>Usos comunes: `400` (cliente), `500` (error interno), `503` (no disponible).</p>
                  <p>Rango valido: 400 a 599.</p>
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
                  <p>Probabilidad de fallo cuando `mode=probabilisticError`.</p>
                  <p>Valor de `0` a `1`.</p>
                  <p>Ejemplo: `0.2` implica aprox 20% de respuestas 500.</p>
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
                  <p>Latencia fija en milisegundos agregada antes de responder.</p>
                  <p>Aplica para simular servicios lentos de forma constante.</p>
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
                  <p>Minimo de latencia aleatoria cuando defines un rango random.</p>
                  <p>Usar junto con `randomLatencyMaxMs`.</p>
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
                  <p>Maximo de latencia aleatoria cuando defines un rango random.</p>
                  <p>Debe ser mayor o igual que `randomLatencyMinMs`.</p>
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
                  <p>Probabilidad de simular timeout cuando `mode=timeout`.</p>
                  <p>Valor de `0` a `1`.</p>
                  <p>Ejemplo: `1` hace que siempre se exceda el timeout del cliente.</p>
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
                  Aplicar
                </button>
                <button type="button" className="button-secondary" onClick={() => reset(svc.name)}>
                  Reset normal
                </button>
                <FieldHelp
                  id={`reset-${svc.name}`}
                  title="Reset normal"
                  open={openHelpId === `reset-${svc.name}`}
                  onToggle={toggleHelp}
                >
                  <p>Restaura la configuracion del servicio a `mode=normal`.</p>
                  <p>Util cuando terminas pruebas de caos y quieres volver a baseline.</p>
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
