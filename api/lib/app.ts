import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createMemoryStorage, createStorage, type Storage } from './storage';
import { assetOverridesSchema, contactSchema, idParamSchema, menuItemsSchema, newsletterSchema, reservationSchema, siteContentSchema, siteSettingsSchema } from './validation';
import { sendReservationConfirmation } from './email';
import type { NextFunction, Request, Response } from 'express';

let distDir = '';
if (!process.env.VERCEL) {
  distDir = path.resolve(process.cwd(), 'dist');
}

const IMAGE_OVERRIDES_KEY = 'image_asset_overrides';
const SITE_CONTACT_EMAIL_KEY = 'site_contact_email';
const MENU_ITEMS_KEY = 'menu_items';
const SITE_CONTENT_KEY = 'site_content';
const DEFAULT_CONTACT_EMAIL = (process.env.SITE_CONTACT_EMAIL ?? '').trim() || 'smpsandro1239@gmail.com';

const DEFAULT_SITE_CONTENT: Record<string, string> = {
  contactEmail: DEFAULT_CONTACT_EMAIL,
  phone: '',
  address: '',
  hours: '',
  headline: '',
  heroSubtitle: '',
  aboutTitle: '',
  aboutText: '',
  instagram: '',
  facebook: '',
  videoUrl: '',
};

function parseStoredJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const adminToken = (process.env.ADMIN_TOKEN ?? '').trim();

export interface AppInstance {
  app: express.Express;
  storage: Storage;
}

function adminUnauthorized(res: Response): void {
  if (adminToken) {
    res.status(401).json({ error: 'Token de administrador inválido.' });
  } else {
    res.status(503).json({
      error: 'Administração desativada: defina a variável ADMIN_TOKEN no servidor.',
    });
  }
}

export async function createApp(): Promise<AppInstance> {
  let storage: Storage;
  try {
    storage = await createStorage();
    await storage.init();
  } catch (err) {
    console.error('[app] Falha ao inicializar armazenamento — a usar memória:', err);
    storage = createMemoryStorage();
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    const allowed = process.env.APP_URL ?? 'http://localhost:3000';
    const origin = req.headers.origin;
    const isLocal = origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
    if (origin && (origin === allowed || isLocal)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Admin-Token');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', database: storage.isOpen() });
  });

  app.post('/api/reservations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = reservationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const { id, reference } = await storage.createReservation(parsed.data);
      sendReservationConfirmation({ ...parsed.data, reference }).catch((err) => {
        console.error('[email] Falha no envio de confirmação:', err);
      });
      res.status(201).json({ id, reference });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/contacts', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = contactSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const { id } = await storage.createContact(parsed.data);
      res.status(201).json({ id });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/newsletter', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = newsletterSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      if (await storage.hasNewsletter(parsed.data.email)) {
        return res.status(409).json({ error: 'Este email já está subscrito no boletim.' });
      }
      const { id } = await storage.createNewsletter(parsed.data);
      res.status(201).json({ id });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/site', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const contactEmail = (await storage.getSetting(SITE_CONTACT_EMAIL_KEY)) ?? DEFAULT_CONTACT_EMAIL;
      res.json({ contactEmail });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/site', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      const parsed = siteSettingsSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      await storage.setSetting(SITE_CONTACT_EMAIL_KEY, parsed.data.contactEmail);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/assets', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = await storage.getSetting(IMAGE_OVERRIDES_KEY);
      const stored = parseStoredJson(raw);
      const overrides: Record<string, unknown> = {};
      for (const [id, value] of Object.entries(stored)) {
        overrides[id] = typeof value === 'string' ? { url: value } : value;
      }
      res.json({ enabled: adminToken !== '', overrides });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/assets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      const parsed = assetOverridesSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const overrides: Record<string, { url: string; scale?: number; px?: number; py?: number }> = {};
      for (const item of parsed.data.overrides) {
        const entry: { url: string; scale?: number; px?: number; py?: number } = { url: item.url };
        if (item.scale != null) entry.scale = item.scale;
        if (item.px != null) entry.px = item.px;
        if (item.py != null) entry.py = item.py;
        overrides[item.id] = entry;
      }
      await storage.setSetting(IMAGE_OVERRIDES_KEY, JSON.stringify(overrides));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/assets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      await storage.deleteSetting(IMAGE_OVERRIDES_KEY);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/menus', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = await storage.getSetting(MENU_ITEMS_KEY);
      const items = raw ? parseStoredJson(raw).items : null;
      res.json({ items: Array.isArray(items) ? items : null });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/menus', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = await storage.getSetting(MENU_ITEMS_KEY);
      const items = raw ? parseStoredJson(raw).items : null;
      res.json({ items: Array.isArray(items) ? items : null });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/menus', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      const parsed = menuItemsSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      await storage.setSetting(
        MENU_ITEMS_KEY,
        JSON.stringify({ items: parsed.data.items.filter((item): item is NonNullable<typeof item> => item !== null) }),
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/menus', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      await storage.deleteSetting(MENU_ITEMS_KEY);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/site-content', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stored = await storage.getSetting(SITE_CONTENT_KEY);
      const contactEmail = (await storage.getSetting(SITE_CONTACT_EMAIL_KEY)) ?? DEFAULT_CONTACT_EMAIL;
      res.json({ ...DEFAULT_SITE_CONTENT, ...parseStoredJson(stored), contactEmail });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/site-content', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      const parsed = siteContentSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      await storage.setSetting(SITE_CONTENT_KEY, JSON.stringify(parsed.data));
      await storage.setSetting(SITE_CONTACT_EMAIL_KEY, parsed.data.contactEmail);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/reservations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      res.json({ items: await storage.listReservations() });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/reservations/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      res.json({ ok: await storage.deleteReservation(idResult.data) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/contacts', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      res.json({ items: await storage.listContacts() });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/contacts/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      res.json({ ok: await storage.deleteContact(idResult.data) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/newsletter', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      res.json({ items: await storage.listNewsletter() });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/newsletter/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!adminToken || req.headers['x-admin-token'] !== adminToken) {
        return adminUnauthorized(res);
      }
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      res.json({ ok: await storage.deleteNewsletter(idResult.data) });
    } catch (err) {
      next(err);
    }
  });

  if (!process.env.VERCEL && existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api(?:\/|$)).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  });

  return { app, storage };
}