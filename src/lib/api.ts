import type { ApiError, TokenAnalysis, WalletAnalysis } from './types';

async function request<T extends object>(path: string, value: string): Promise<T> {
  const response = await fetch(`${path}?${new URLSearchParams({ address: value })}`, {
    headers: { Accept: 'application/json' },
  });
  let body: T | ApiError;
  try {
    body = (await response.json()) as T | ApiError;
  } catch {
    throw new Error(`The analysis service returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    const message = 'error' in body && typeof body.error === 'string' ? body.error : 'The analysis could not be loaded.';
    throw new Error(message);
  }
  return body as T;
}

export function analyzeToken(address: string) {
  return request<TokenAnalysis>('/api/token', address);
}

export function analyzeWallet(address: string) {
  return request<WalletAnalysis>('/api/wallet', address);
}