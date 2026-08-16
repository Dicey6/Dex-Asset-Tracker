type ApiRequest = {
  method?: string;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

const env = (globalThis as {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};

export default function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method && request.method !== 'GET') {
    return response.status(405).json({ error: 'Only GET is supported.' });
  }

  const url = env.SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const anonKey = env.SUPABASE_ANON_KEY?.trim()
    || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    || '';

  response.setHeader?.('Cache-Control', 'no-store');
  return response.status(200).json({ url, anonKey });
}