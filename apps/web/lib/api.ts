const API_BASE_PATH = '/api';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_PATH}${path}`);
  if (!response.ok) {
    throw new Error(`GET ${path} failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `POST ${path} failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function getSseUrl(path: string): string {
  return `${API_BASE_PATH}${path}`;
}
