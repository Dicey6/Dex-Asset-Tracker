import type { OhlcvItem } from './types';
import { fetchJson, getEnv, queryValue, sendJson, type ApiRequest, type ApiResponse } from './_shared';

const VALID_TYPES = ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '4H', '6H', '8H', '12H', '1D', '3D', '1W', '1M'];

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method && request.method !== 'GET') return sendJson(response, 405, { error: 'Only GET is supported.' });
  const address = queryValue(request, 'address')?.trim();
  const type = queryValue(request, 'type')?.trim() || '15m';
  if (!address) return sendJson(response, 400, { error: 'Token address required.' });
  if (!VALID_TYPES.includes(type)) return sendJson(response, 400, { error: 'Invalid chart type.' });

  const birdeyeKey = getEnv('BIRDEYE_API_KEY');
  if (!birdeyeKey) return sendJson(response, 503, { error: 'Chart data requires BIRDEYE_API_KEY.' });

  const now = Math.floor(Date.now() / 1000);
  const rangeMap: Record<string, number> = {
    '1m': 3600, '3m': 3600, '5m': 3600 * 6, '15m': 86400, '30m': 86400 * 2,
    '1H': 86400 * 7, '2H': 86400 * 14, '4H': 86400 * 30, '6H': 86400 * 45,
    '8H': 86400 * 60, '12H': 86400 * 90, '1D': 86400 * 180, '3D': 86400 * 365,
    '1W': 86400 * 365 * 2, '1M': 86400 * 365 * 4,
  };
  const timeFrom = now - (rangeMap[type] ?? 86400);

  try {
    const body = await fetchJson<Record<string, any>>(
      `https://public-api.birdeye.so/defi/ohlcv?address=${encodeURIComponent(address)}&type=${encodeURIComponent(type)}&time_from=${timeFrom}&time_to=${now}&chain=solana`,
      { headers: { 'X-API-KEY': birdeyeKey, 'x-chain': 'solana' } },
      15000,
    );
    const items: OhlcvItem[] = (body?.data?.items ?? []).map((item: Record<string, any>) => ({
      unixTime: Number(item.unixTime),
      o: Number(item.o),
      h: Number(item.h),
      l: Number(item.l),
      c: Number(item.c),
      v: Number(item.v),
    })).filter((item: OhlcvItem) => item.unixTime && Number.isFinite(item.o));
    response.setHeader?.('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    response.setHeader?.('Content-Type', 'application/json; charset=utf-8');
    return response.status(200).json({ items, type, address });
  } catch (error) {
    return sendJson(response, 502, { error: error instanceof Error ? error.message : 'Chart data unavailable.' });
  }
}
