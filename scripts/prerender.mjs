import { build } from 'esbuild';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outfile = join(root, 'node_modules', '.prerender-bundle.mjs');
const htmlPath = join(root, 'dist', 'index.html');
const shellPath = join(root, 'dist', '.prerender.html');

if (!existsSync(htmlPath)) {
  console.warn('[prerender] dist/index.html em falta - a saltar.');
  process.exit(0);
}

const entry = `
import { writeFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.tsx';
try {
  const html = renderToString(React.createElement(App));
  writeFileSync('dist/.prerender.html', html);
} catch (err) {
  process.stderr.write('[prerender] erro a renderizar: ' + (err && err.message ? err.message : String(err)));
}
`;

try {
  await build({
    stdin: { contents: entry, resolveDir: root, sourcefile: 'prerender.tsx', loader: 'tsx' },
    jsx: 'automatic',
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    packages: 'external',
    outfile,
    logLevel: 'silent',
  });
  await import(pathToFileURL(outfile).href);
} catch (err) {
  console.warn('[prerender] falhou ao gerar - a continuar com html simples:', err && err.message ? err.message : err);
}
rmSync(outfile, { force: true });

const shell = existsSync(shellPath) ? readFileSync(shellPath, 'utf8') : '';
rmSync(shellPath, { force: true });

if (!shell) process.exit(0);

const index = readFileSync(htmlPath, 'utf8');
const marker = '<div id="root"></div>';
if (!index.includes(marker)) {
  console.warn('[prerender] raiz do index.html nao encontrada - a continuar.');
  process.exit(0);
}

writeFileSync(htmlPath, index.replace(marker, `<div id="root">${shell}</div>`));
console.log('[prerender] conteudo estatico injetado em dist/index.html (' + shell.length + ' chars).');