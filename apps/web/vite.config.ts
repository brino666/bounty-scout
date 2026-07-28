import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port,
    host: '0.0.0.0',
    // Local dev only — forwards /api calls to the api app running on :8080
    // so VITE_API_URL doesn't need to be set until you actually deploy.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
  },
});
