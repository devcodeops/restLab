import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const ORCHESTRATOR_BASE_URL =
  process.env.ORCHESTRATOR_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://orchestrator-api:3001';

function toUpstreamUrl(request: NextRequest, path: string[]): string {
  const target = new URL(`${ORCHESTRATOR_BASE_URL}/${path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });
  return target.toString();
}

function forwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);

  return headers;
}

async function proxy(request: NextRequest, path: string[], method: 'GET' | 'POST') {
  const upstreamUrl = toUpstreamUrl(request, path);

  const init: RequestInit = {
    method,
    headers: forwardHeaders(request),
    cache: 'no-store',
  };

  if (method !== 'GET') {
    const rawBody = await request.text();
    if (rawBody.length > 0) {
      init.body = rawBody;
    }
  }

  const upstream = await fetch(upstreamUrl, init);

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('content-type');
  const cacheControl = upstream.headers.get('cache-control');
  if (contentType) responseHeaders.set('content-type', contentType);
  if (cacheControl) responseHeaders.set('cache-control', cacheControl);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path = [] } = await context.params;
  return proxy(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<Response> {
  const { path = [] } = await context.params;
  return proxy(request, path, 'POST');
}
