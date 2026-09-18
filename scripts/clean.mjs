import { rm } from 'node:fs/promises';

const targets = ['dist', 'dist-server'];

await Promise.all(targets.map((target) => rm(target, { recursive: true, force: true })));

console.log('Limpeza concluída: ' + targets.map((target) => `./${target}`).join(', ') + ' removidos.');