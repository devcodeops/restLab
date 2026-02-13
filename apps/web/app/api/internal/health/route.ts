export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return Response.json({
    status: 'ok',
    service: 'web',
    time: new Date().toISOString(),
  });
}
