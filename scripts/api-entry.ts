import type { NextFunction, Request, Response } from 'express';
import { createApp, type AppInstance } from '../api/lib/app';

// ----- Silenciar DEP0169 (url.parse) -----
// O runtime/dependências emitem um DeprecationWarning de url.parse() em cada
// instância da função (logo level:"error" nos logs da Vercel, mas status 200).
// Investigado: localmente (Node 24, SQLite e Turso read-only) nenhum destes
// GETs o reproduz — não vem do nosso código nem do @libsql/client (grep sem
// url.parse). O filtro é inócuo e versionado com o projeto; qualquer aviso
// com "url.parse" é ignorado, os restantes continuam a ser impressos.
// Nota: é preciso remover o listener predefinido 'warning' antes de recriá-lo,
// senão o Node imprime o aviso na mesma.
process.removeAllListeners('warning');
process.on('warning', (warning: Error) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('url.parse')) return;
  if (warning.stack) console.error(warning.stack);
  else console.error(`${warning.name}: ${warning.message}`);
});

let instance: AppInstance | null = null;

export default async function handler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!instance) {
      instance = await createApp();
    }
    instance.app(req, res, next);
  } catch (err) {
    console.error('[api] Erro na função:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno do servidor.', detail: err instanceof Error ? err.message : String(err) });
    } else {
      next(err);
    }
  }
}