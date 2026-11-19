import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // Proxy de desarrollo (equivale a proxy.conf.json de Angular): el navegador pide /api/... al MISMO origen
    // (sin CORS) y Vite lo reenvía a json-server quitando el prefijo: /api/medicos → http://127.0.0.1:3000/medicos.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/api/u, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
});
