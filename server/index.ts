import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, insertContact, insertNewsletter, insertReservation, isNewsletterSubscribed } from './db';
import { contactSchema, newsletterSchema, reservationSchema } from './validation';
import type { NextFunction, Request, Response } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  const allowed = process.env.APP_URL ?? 'http://localhost:3000';
  const origin = req.headers.origin;
  const isLocal = origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
  if (origin && (origin === allowed || isLocal)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', database: db.isOpen });
});

app.post('/api/reservations', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = reservationSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { id, reference } = insertReservation(parsed.data);
    res.status(201).json({ id, reference });
  } catch (err) {
    next(err);
  }
});

app.post('/api/contacts', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = contactSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { id } = insertContact(parsed.data);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

app.post('/api/newsletter', (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = newsletterSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    if (isNewsletterSubscribed(parsed.data.email)) {
      return res.status(409).json({ error: 'Este email já está subscrito no boletim.' });
    }
    const { id } = insertNewsletter(parsed.data);
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
});

if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API do Boca Maldita em http://localhost:${port}`);
});