import type { ApiError, TokenAnalysis, WalletAnalysis } from './types';

async function request<T extends object>(path: string, value: string): Promise<T> {
  const response = await fetch(`${path}?${new URLSearchParams({ address: value })}`, {
    headers: { Accept: 'application/json' },
  });
  const contentType = response.headers.get('content-type') ?? '';
  let body: T | ApiError;
  try {
    if (!contentType.includes('application/json')) {
      throw new Error(`The analysis service returned a non-JSON response (${response.status}).`);
    }
    body = (await response.json()) as T | ApiError;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('The analysis service returned a non-JSON response')) {
      throw error;
    }
    throw new Error(`The analysis service returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    const message = 'error' in body && typeof body.error === 'string' ? body.error : 'The analysis could not be loaded.';
    throw new Error(message);
  }
  if (!body || typeof body !== 'object') {
    throw new Error('The analysis service returned an empty response.');
  }
  return body as T;
}

export function analyzeToken(address: string) {
  return request<TokenAnalysis>('/api/token', address);
}

export function analyzeWallet(address: string) {
  return request<WalletAnalysis>('/api/wallet', address);
}