import type { NextFunction, Request, Response } from 'express';
import { createApp, type AppInstance } from '../server/app';

let instance: AppInstance | null = null;

export default async function handler(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!instance) {
    instance = await createApp();
  }
  instance.app(req, res, next);
}