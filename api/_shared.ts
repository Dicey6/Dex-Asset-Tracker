export type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

export type JsonRecord = Record<string, any>;

const env = (globalThis as {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};

export function getEnv(name: string) {
  return env[name]?.trim() || undefined;
}

export function queryValue(request: ApiRequest, name: string) {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
}

export function sendJson(response: ApiResponse, status: number, body: unknown) {
  response.setHeader?.('Cache-Control', 's-maxage=20, stale-while-revalidate=60');
  response.setHeader?.('Content-Type', 'application/json; charset=utf-8');
  return response.status(status).json(body);
}

export async function fetchJson<T = JsonRecord>(
  url: string,
  init: RequestInit = {},
  timeoutMs = 10000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (!headers.has('User-Agent')) headers.set('User-Agent', 'Dyorly/1.0 (+https://github.com/Dicey6/Dex-Asset-Tracker)');
    const response = await fetch(url, { ...init, headers, signal: controller.signal });
    const text = await response.text();
    let body: unknown = {};
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Provider returned invalid JSON (${response.status})`);
    }
    if (!response.ok) {
      const detail = typeof body === 'object' && body && 'message' in body ? String((body as JsonRecord).message) : response.statusText;
      throw new Error(`${response.status}: ${detail || 'provider request failed'}`);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function optionalProvider<T>(task: () => Promise<T>) {
  try {
    return { value: await task(), error: undefined };
  } catch (error) {
    return { value: undefined, error: error instanceof Error ? error.message : 'provider request failed' };
  }
}

export function isSolanaAddress(value: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

export function asArray(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is JsonRecord => Boolean(item && typeof item === 'object'));
  return [];
}

export function firstNumber(...values: unknown[]) {
  for (const value of values) {
    const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (Number.isFinite(number)) return number;
  }
  return null;
}