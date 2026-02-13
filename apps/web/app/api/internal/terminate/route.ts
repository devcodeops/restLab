export const dynamic = 'force-dynamic';

interface TerminateBody {
  signal?: 'SIGTERM';
  delayMs?: number;
}

export async function POST(request: Request): Promise<Response> {
  const body = ((await request.json().catch(() => ({}))) ?? {}) as TerminateBody;
  const signal = body.signal ?? 'SIGTERM';
  const delayMs = typeof body.delayMs === 'number' ? Math.max(0, body.delayMs) : 250;

  setTimeout(() => {
    try {
      process.kill(1, signal);
    } catch {
      process.kill(process.pid, signal);
    }
  }, delayMs);

  return Response.json(
    {
      accepted: true,
      service: 'web',
      signal,
      delayMs,
      pid: process.pid,
      killTargetPid: 1,
    },
    { status: 202 },
  );
}
