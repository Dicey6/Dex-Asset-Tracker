import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tokenHandler from './api/token';
import walletHandler from './api/wallet';

function localApi() {
  return {
    name: 'local-api',
    configureServer(server: { middlewares: { use: (handler: (request: any, response: any, next: () => void) => void) => void } }) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
        const handler = url.pathname === '/api/token' ? tokenHandler : url.pathname === '/api/wallet' ? walletHandler : undefined;
        if (!handler) {
          next();
          return;
        }

        const apiRequest = {
          method: request.method,
          query: Object.fromEntries(url.searchParams.entries()),
        };
        const apiResponse = {
          status(code: number) {
            response.statusCode = code;
            return apiResponse;
          },
          json(body: unknown) {
            if (!response.headersSent) response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.end(JSON.stringify(body));
          },
          setHeader(name: string, value: string) {
            response.setHeader(name, value);
          },
        };

        try {
          await handler(apiRequest, apiResponse);
        } catch (error) {
          if (!response.headersSent) {
            response.statusCode = 500;
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'The analysis service failed.' }));
          }
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});