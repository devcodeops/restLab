'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { apiPost } from '../lib/api';

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
      setError(err instanceof Error ? err.message : 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-3">
      <h2 className="text-lg font-semibold">Crear Run</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <LabelWithHelp
            helpId="workflow"
            label="Workflow"
            helpTitle="Workflow"
            open={openHelpId === 'workflow'}
            onToggle={toggleHelp}
          >
            <p>Define el patron de llamadas entre servicios en cada iteracion.</p>
            <p>`chain`: alpha -&gt; beta -&gt; gamma (secuencial).</p>
            <p>`fanout`: alpha llama beta y gamma en paralelo.</p>
            <p>`fanout-fanin`: fanout y luego una llamada extra de consolidacion.</p>
            <p>`random`: mezcla rutas aleatorias para generar ruido realista.</p>
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
            label="Iterations"
            helpTitle="Iterations"
            open={openHelpId === 'iterations'}
            onToggle={toggleHelp}
          >
            <p>Cantidad de ejecuciones del workflow dentro del mismo run.</p>
            <p>Ejemplo: `50` ejecuta 50 veces el flujo elegido y acumula estadisticas.</p>
            <p>Rango valido: 1 a 1000.</p>
          </LabelWithHelp>
          <input className="input" name="iterations" defaultValue={50} type="number" min={1} />
        </div>

        <div>
          <LabelWithHelp
            helpId="concurrency"
            label="Concurrency"
            helpTitle="Concurrency"
            open={openHelpId === 'concurrency'}
            onToggle={toggleHelp}
          >
            <p>Cuantas iteraciones se ejecutan al mismo tiempo.</p>
            <p>Subir este valor aumenta carga simultanea, latencia y probabilidad de fallos bajo chaos.</p>
            <p>Rango valido: 1 a 100.</p>
          </LabelWithHelp>
          <input className="input" name="concurrency" defaultValue={5} type="number" min={1} />
        </div>

        <div>
          <LabelWithHelp
            helpId="payload-size"
            label="Payload size"
            helpTitle="Payload size"
            open={openHelpId === 'payload-size'}
            onToggle={toggleHelp}
          >
            <p>Tamano de payload enviado en cada llamada de trabajo (bytes aprox).</p>
            <p>Sirve para simular peticiones livianas o pesadas y ver impacto en tiempos.</p>
            <p>Opcional. Si esta vacio, se usa payload pequeno por defecto.</p>
          </LabelWithHelp>
          <input className="input" name="payloadSize" defaultValue={256} type="number" min={0} />
        </div>

        <div>
          <LabelWithHelp
            helpId="client-timeout"
            label="Client timeout (ms)"
            helpTitle="Client timeout"
            open={openHelpId === 'client-timeout'}
            onToggle={toggleHelp}
          >
            <p>Tiempo maximo que espera cada hop HTTP antes de marcar timeout.</p>
            <p>Si un servicio tarda mas que este valor, esa llamada se registra como `timeout`.</p>
            <p>Afecta especialmente cuando activas modo chaos `timeout` o latencias altas.</p>
          </LabelWithHelp>
          <input className="input" name="clientTimeoutMs" defaultValue={2000} type="number" min={100} />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={retryEnabled} onChange={(e) => setRetryEnabled(e.target.checked)} />
        <span className="flex items-center gap-2">
          Habilitar retry policy
          <FieldHelp
            id="retry-policy"
            title="Retry policy"
            open={openHelpId === 'retry-policy'}
            onToggle={toggleHelp}
          >
            <p>Reintenta llamadas fallidas antes de darlas por error.</p>
            <p>En esta version aplica al hop `orchestrator -&gt; svc-alpha`.</p>
            <p>`Retries` = intentos extra. `Backoff ms` = espera entre intentos.</p>
            <p>Util para reducir fallos transitorios, pero aumenta duracion total del run.</p>
          </FieldHelp>
        </span>
      </div>

      {retryEnabled ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <LabelWithHelp
              helpId="retries"
              label="Retries"
              helpTitle="Retries"
              open={openHelpId === 'retries'}
              onToggle={toggleHelp}
            >
              <p>Numero de reintentos despues del intento inicial.</p>
              <p>Ejemplo: `2` significa hasta 3 intentos totales.</p>
              <p>Rango valido: 0 a 5.</p>
            </LabelWithHelp>
            <input className="input" name="retries" defaultValue={1} type="number" min={0} />
          </div>
          <div>
            <LabelWithHelp
              helpId="backoff-ms"
              label="Backoff ms"
              helpTitle="Backoff ms"
              open={openHelpId === 'backoff-ms'}
              onToggle={toggleHelp}
            >
              <p>Espera entre reintentos para evitar saturar servicios.</p>
              <p>Ejemplo: `200` agrega 200ms entre cada intento fallido.</p>
              <p>Rango valido: 0 a 5000.</p>
            </LabelWithHelp>
            <input className="input" name="backoffMs" defaultValue={200} type="number" min={0} />
          </div>
        </div>
      ) : null}

      <button className="button" disabled={loading} type="submit">
        {loading ? 'Starting...' : 'Start Run'}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
