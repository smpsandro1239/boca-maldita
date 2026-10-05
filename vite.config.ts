import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR can be disabled in restricted environments via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy API requests to the backend during development.
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
    test: {
      globals: true,
      environment: 'node',
      // worktrees/ scratch dentro do projecto trazem as SUAS proprias copias de
      // test files, e o glob do vitest recolhe-os. O gate passa entao a contar
      // a mesma suite duas vezes e a validar codigo que nao e o actual.
      // Ja aconteceu: o "verify verde" reportava 250 testes quando o real
      // eram 125. worktrees e' a correcao; isto e' a rede de seguranca.
      exclude: ['**/node_modules/**', '**/dist/**', '**/worktrees/**'],
    },
  };
});