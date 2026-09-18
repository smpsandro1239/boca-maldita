import type { NextFunction, Request, Response } from 'express';
import { createApp, type AppInstance } from './lib/app';

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