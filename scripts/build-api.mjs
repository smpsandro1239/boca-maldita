import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('api', { recursive: true });

await build({
  entryPoints: ['scripts/api-entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  outfile: 'api/index.js',
  banner: { js: '/* gerado por scripts/build-api.mjs — não editar manualmente */' },
  logLevel: 'info',
});