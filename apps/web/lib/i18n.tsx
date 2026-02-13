'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type Locale = 'es' | 'en';

interface Dict {
  [key: string]: string | Dict;
}

const dictionaries: Record<Locale, Dict> = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      services: 'Services',
      sigkill: 'SigKill',
    },
    language: {
      label: 'Language',
      english: 'English',
      spanish: 'Spanish',
    },
    common: {
      loading: 'Loading...',
      apply: 'Apply',
      resetNormal: 'Reset normal',
      cancel: 'Cancel',
      confirm: 'Confirm',
      all: 'all',
      yes: 'Yes',
      no: 'No',
      status: 'Status',
      service: 'Service',
      workflow: 'Workflow',
      errors: 'Errors',
      duration: 'Duration',
      start: 'Start',
      running: 'running',
      timeout: 'timeout',
      unknownError: 'error',
      error: 'error',
      helpAbout: 'Help about',
      ok: 'ok',
      down: 'down',
    },
    dashboard: {
      createRun: 'Create Run',
      enableRetryPolicy: 'Enable retry policy',
      startRun: 'Start Run',
      starting: 'Starting...',
      recentRuns: 'Recent runs',
      clearLog: 'Clear log',
      clearing: 'Clearing...',
      clearLogsTitle: 'Confirm log cleanup',
      clearLogsBody: 'You are about to delete all stored runs and calls from history.',
      clearLogsIrreversible: 'This action cannot be undone.',
      errorLoadingRuns: 'error loading runs',
      errorClearingRuns: 'error clearing runs',
      retryPolicy: 'Retry policy',
      retries: 'Retries',
      backoffMs: 'Backoff ms',
      payloadSize: 'Payload size',
      iterations: 'Iterations',
      concurrency: 'Concurrency',
      clientTimeout: 'Client timeout (ms)',
      workflow: 'Workflow',
      runId: 'Run ID',
      successRate: 'Success rate',
      p95: 'p95',
      createdRunError: 'error',
      clearConfirmCta: 'Confirm',
      formHelp: {
        workflow1: 'Defines the call pattern across services in each iteration.',
        workflow2: '`chain`: alpha -> beta -> gamma (sequential).',
        workflow3: '`fanout`: alpha calls beta and gamma in parallel.',
        workflow4: '`fanout-fanin`: fanout plus one final consolidation call.',
        workflow5: '`random`: mixed random routes to generate realistic noise.',
        iterations1: 'Number of workflow executions inside the same run.',
        iterations2: 'Example: `50` executes the selected flow 50 times and aggregates metrics.',
        iterations3: 'Valid range: 1 to 1000.',
        concurrency1: 'How many iterations run at the same time.',
        concurrency2: 'Higher values increase simultaneous load, latency, and failure probability under chaos.',
        concurrency3: 'Valid range: 1 to 100.',
        payload1: 'Payload size sent on each work call (approx bytes).',
        payload2: 'Used to simulate lightweight or heavy requests and observe timing impact.',
        payload3: 'Optional. Empty uses a small default payload.',
        timeout1: 'Maximum wait time per HTTP hop before timeout.',
        timeout2: 'If a service exceeds this value, the call is recorded as `timeout`.',
        timeout3: 'Mostly affects runs when chaos `timeout` or high latencies are enabled.',
        retry1: 'Retries failed calls before marking them as errors.',
        retry2: 'In this version it applies to `orchestrator -> svc-alpha` hop.',
        retry3: '`Retries` = extra attempts. `Backoff ms` = wait between attempts.',
        retry4: 'Useful for transient failures, but increases run duration.',
        retries1: 'Number of retries after the first attempt.',
        retries2: 'Example: `2` means up to 3 total attempts.',
        retries3: 'Valid range: 0 to 5.',
        backoff1: 'Wait between retries to avoid overloading services.',
        backoff2: 'Example: `200` adds 200ms between failed attempts.',
        backoff3: 'Valid range: 0 to 5000.',
      },
    },
    runs: {
      runTitle: 'Run',
      loadingRun: 'Loading run...',
      errorLoadingRun: 'error loading run',
      state: 'State',
      calls: 'Calls',
      latencies: 'Latencies',
      callGraph: 'Call Graph',
      callsTable: 'Calls',
      from: 'From',
      to: 'To',
      errorType: 'ErrorType',
      errorMessage: 'ErrorMessage',
    },
    services: {
      title: 'Services and Chaos Config',
      introTitle: 'What Chaos Mode does',
      intro1:
        'This section lets you inject controlled failures into each microservice to validate resilience, timeouts, retries, and behavior under load.',
      intro2:
        'Operational recommendation: change one setting at a time, run a test, and inspect impact on status codes, latencies, and call graph errors.',
      errorLoading: 'error loading services',
      errorUpdating: 'error updating chaos',
      errorResetting: 'error resetting chaos',
      healthTitle: 'Service health',
      health1: '`ok` means the service responds to `GET /health`.',
      health2:
        "If it appears as `down`, the orchestrator can't reach this service and runs will be affected.",
      urlTitle: 'Service URL',
      url1: 'Internal endpoint used by orchestrator to call the service.',
      url2: 'No need to edit it from this screen.',
      mode: 'Mode',
      mode1: 'Defines which injected behavior applies to this service.',
      mode2: '`normal`: healthy response.',
      mode3: '`forceStatus`: always returns the selected error status.',
      mode4: '`probabilisticError`: fails with probability `p`.',
      mode5: '`latency`: adds artificial delay.',
      mode6: '`timeout`: simulates hangs to trigger client timeout.',
      forceStatus1: 'HTTP code returned by the service when `mode=forceStatus`.',
      forceStatus2: 'Common values: `400` (client), `500` (internal), `503` (unavailable).',
      forceStatus3: 'Valid range: 400 to 599.',
      errorProb1: 'Failure probability when `mode=probabilisticError`.',
      errorProb2: 'Value from `0` to `1`.',
      errorProb3: 'Example: `0.2` means ~20% of responses return 500.',
      fixedLatency1: 'Fixed latency in ms added before responding.',
      fixedLatency2: 'Use this for constant service slowness simulation.',
      randomMin1: 'Minimum random latency when using a random range.',
      randomMin2: 'Use together with `randomLatencyMaxMs`.',
      randomMax1: 'Maximum random latency when using a random range.',
      randomMax2: 'Must be greater than or equal to `randomLatencyMinMs`.',
      timeoutProb1: 'Timeout simulation probability when `mode=timeout`.',
      timeoutProb2: 'Value from `0` to `1`.',
      timeoutProb3: 'Example: `1` always exceeds client timeout.',
      resetTitle: 'Reset normal',
      reset1: 'Restores service configuration to `mode=normal`.',
      reset2: 'Useful when you finish chaos testing and want to return to baseline.',
    },
    sigkill: {
      title: 'SIGKILL',
      panelTitle: 'SIGKILL Injection',
      panel1:
        'Use this view to terminate service processes in a controlled way and observe how the system behaves under real outages.',
      panel2: 'In this version, the supported signal is `SIGKILL`.',
      sending: 'Sending...',
      sendCta: 'Send SIGKILL',
      errorLoading: 'error loading kill targets',
      errorSending: 'error sending signal',
      confirmTitle: 'Confirm SIGKILL send',
      confirmBody: 'You are about to send SIGKILL to',
      confirmWarn: 'This may leave the service unavailable.',
      confirmNote:
        'Note: internally a controlled termination is sent to ensure container shutdown.',
    },
    theme: {
      toDark: 'Switch to dark mode',
      toLight: 'Switch to light mode',
    },
  },
  es: {
    nav: {
      dashboard: 'Dashboard',
      services: 'Servicios',
      sigkill: 'SigKill',
    },
    language: {
      label: 'Idioma',
      english: 'Inglés',
      spanish: 'Español',
    },
    common: {
      loading: 'Cargando...',
      apply: 'Aplicar',
      resetNormal: 'Reinicializar',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      all: 'Todo',
      yes: 'Sí',
      no: 'No',
      status: 'Estado',
      service: 'Servicio',
      workflow: 'Workflow',
      errors: 'Errores',
      duration: 'Duración',
      start: 'Inicio',
      running: 'Ejecutando',
      timeout: 'timeout',
      unknownError: 'error',
      error: 'error',
      helpAbout: 'Ayuda',
      ok: 'ok',
      down: 'caído',
    },
    dashboard: {
      createRun: 'Crear Run',
      enableRetryPolicy: 'Habilitar política de reintentos',
      startRun: 'Ejecutar Run',
      starting: 'Comenzando...',
      recentRuns: 'Runs recientes',
      clearLog: 'Limpiar log',
      clearing: 'Limpiando...',
      clearLogsTitle: 'Confirmar limpieza de logs',
      clearLogsBody: 'Vas a eliminar todos los runs y calls almacenados en el historial.',
      clearLogsIrreversible: 'Esta acción no se puede deshacer.',
      errorLoadingRuns: 'Error cargando runs',
      errorClearingRuns: 'Error limpiando runs',
      retryPolicy: 'Política de reintentos',
      retries: 'Reintendo',
      backoffMs: 'Ms backoff',
      payloadSize: 'Tamaño payload',
      iterations: 'Iteraciones',
      concurrency: 'Concurrencia',
      clientTimeout: 'Timeout cliente (ms)',
      workflow: 'Workflow',
      runId: 'ID Run',
      successRate: 'Ratio de aciertos',
      p95: 'p95',
      createdRunError: 'Error',
      clearConfirmCta: 'Confirmar',
      formHelp: {
        workflow1: 'Define el patrón de llamadas entre servicios en cada iteración.',
        workflow2: '`chain`: alpha -> beta -> gamma (secuencial).',
        workflow3: '`fanout`: alpha llama beta y gamma en paralelo.',
        workflow4: '`fanout-fanin`: fanout y luego una llamada extra de consolidación.',
        workflow5: '`random`: mezcla rutas aleatorias para generar ruido realista.',
        iterations1: 'Cantidad de ejecuciones del workflow dentro del mismo run.',
        iterations2: 'Ejemplo: `50` ejecuta 50 veces el flujo elegido y acumula estadísticas.',
        iterations3: 'Rango válido: 1 a 1000.',
        concurrency1: 'Cuántas iteraciones se ejecutan al mismo tiempo.',
        concurrency2:
          'Subir este valor aumenta carga simultánea, latencia y probabilidad de fallos bajo chaos.',
        concurrency3: 'Rango válido: 1 a 100.',
        payload1: 'Tamaño de payload enviado en cada llamada de trabajo (bytes aprox).',
        payload2: 'Sirve para simular peticiones livianas o pesadas y ver impacto en tiempos.',
        payload3: 'Opcional. Si está vacío, se usa payload pequeño por defecto.',
        timeout1: 'Tiempo máximo que espera cada hop HTTP antes de marcar timeout.',
        timeout2: 'Si un servicio tarda más que este valor, esa llamada se registra como `timeout`.',
        timeout3: 'Afecta especialmente cuando activas modo chaos `timeout` o latencias altas.',
        retry1: 'Reintenta llamadas fallidas antes de darlas por error.',
        retry2: 'En esta versión aplica al hop `orchestrator -> svc-alpha`.',
        retry3: '`Retries` = intentos extra. `Backoff ms` = espera entre intentos.',
        retry4: 'Útil para reducir fallos transitorios, pero aumenta duración total del run.',
        retries1: 'Número de reintentos después del intento inicial.',
        retries2: 'Ejemplo: `2` significa hasta 3 intentos totales.',
        retries3: 'Rango válido: 0 a 5.',
        backoff1: 'Espera entre reintentos para evitar saturar servicios.',
        backoff2: 'Ejemplo: `200` agrega 200ms entre cada intento fallido.',
        backoff3: 'Rango válido: 0 a 5000.',
      },
    },
    runs: {
      runTitle: 'Run',
      loadingRun: 'Cargando run...',
      errorLoadingRun: 'Error cargando run',
      state: 'Estado',
      calls: 'Llaadas',
      latencies: 'Latencias',
      callGraph: 'Gráfico de llamadas',
      callsTable: 'Llamadas',
      from: 'From',
      to: 'To',
      errorType: 'ErrorType',
      errorMessage: 'ErrorMessage',
    },
    services: {
      title: 'Servicios y Chaos Config',
      introTitle: 'Qué hace Chaos Mode',
      intro1:
        'Esta sección te permite inyectar fallos controlados en cada microservicio para validar resiliencia, timeouts, retries y comportamiento del sistema bajo carga.',
      intro2:
        'Recomendación operativa: cambia un parámetro a la vez, lanza un run y revisa impacto en status codes, latencias y errores del call graph.',
      errorLoading: 'error loading services',
      errorUpdating: 'error updating chaos',
      errorResetting: 'error resetting chaos',
      healthTitle: 'Estado del servicio',
      health1: '`ok` indica que responde `GET /health`.',
      health2:
        'Si aparece `caído`, el orchestrator no puede contactar este servicio y los runs se verán afectados.',
      urlTitle: 'URL del servicio',
      url1: 'Endpoint interno usado por orchestrator para llamar al servicio.',
      url2: 'No es necesario editarlo desde esta pantalla.',
      mode: 'Mode',
      mode1: 'Define el tipo de comportamiento inyectado para este servicio.',
      mode2: '`normal`: respuesta saludable.',
      mode3: '`forceStatus`: siempre devuelve un status de error elegido.',
      mode4: '`probabilisticError`: falla con probabilidad `p`.',
      mode5: '`latency`: agrega retraso artificial.',
      mode6: '`timeout`: simula cuelgues para provocar timeout del cliente.',
      forceStatus1: 'Código HTTP que el servicio devolverá cuando `mode=forceStatus`.',
      forceStatus2: 'Usos comunes: `400` (cliente), `500` (error interno), `503` (no disponible).',
      forceStatus3: 'Rango válido: 400 a 599.',
      errorProb1: 'Probabilidad de fallo cuando `mode=probabilisticError`.',
      errorProb2: 'Valor de `0` a `1`.',
      errorProb3: 'Ejemplo: `0.2` implica aprox 20% de respuestas 500.',
      fixedLatency1: 'Latencia fija en milisegundos agregada antes de responder.',
      fixedLatency2: 'Aplica para simular servicios lentos de forma constante.',
      randomMin1: 'Mínimo de latencia aleatoria cuando defines un rango random.',
      randomMin2: 'Usar junto con `randomLatencyMaxMs`.',
      randomMax1: 'Máximo de latencia aleatoria cuando defines un rango random.',
      randomMax2: 'Debe ser mayor o igual que `randomLatencyMinMs`.',
      timeoutProb1: 'Probabilidad de simular timeout cuando `mode=timeout`.',
      timeoutProb2: 'Valor de `0` a `1`.',
      timeoutProb3: 'Ejemplo: `1` hace que siempre se exceda el timeout del cliente.',
      resetTitle: 'Reset normal',
      reset1: 'Restaura la configuración del servicio a `mode=normal`.',
      reset2: 'Útil cuando terminas pruebas de caos y quieres volver a baseline.',
    },
    sigkill: {
      title: 'SIGKILL',
      panelTitle: 'SIGKILL Injection',
      panel1:
        'Usa esta vista para terminar procesos de servicios de forma controlada y observar cómo se comporta el sistema ante caídas reales.',
      panel2: 'En esta versión, la señal soportada es `SIGKILL`.',
      sending: 'Enviando...',
      sendCta: 'Enviar SIGKILL',
      errorLoading: 'error loading kill targets',
      errorSending: 'error sending signal',
      confirmTitle: 'Confirmar envío de SIGKILL',
      confirmBody: 'Vas a enviar SIGKILL a',
      confirmWarn: 'Esto puede dejar el servicio no disponible.',
      confirmNote:
        'Nota: internamente se envía una terminación controlada para asegurar apagado del contenedor.',
    },
    theme: {
      toDark: 'Cambiar a modo oscuro',
      toLight: 'Cambiar a modo claro',
    },
  },
};

function getDefaultLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language?.toLowerCase();
  if (lang?.startsWith('es')) return 'es';
  return 'en';
}

function lookup(dict: Dict, key: string): string {
  const parts = key.split('.');
  let current: string | Dict | undefined = dict;
  for (const part of parts) {
    if (typeof current !== 'object' || current == null) return key;
    current = current[part];
  }
  return typeof current === 'string' ? current : key;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('restlab-locale');
      if (stored === 'es' || stored === 'en') {
        setLocaleState(stored);
        return;
      }
    } catch {
      // ignore
    }
    setLocaleState(getDefaultLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem('restlab-locale', locale);
    } catch {
      // ignore
    }
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (next: Locale) => setLocaleState(next),
      t: (key: string) => lookup(dictionaries[locale], key),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within LocaleProvider');
  }
  return ctx;
}

export type { Locale };
