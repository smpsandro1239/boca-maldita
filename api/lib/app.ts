import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createMemoryStorage, createStorage, type Storage } from './storage';
import { adminReservationSchema, adminTokenUpdateSchema, assetOverridesSchema, closedPeriodSchema, contactSchema, idParamSchema, menuItemsSchema, newsletterSchema, reservationProtectionSchema, reservationSchema, reviewSchema, reviewStatusSchema, siteContentSchema, siteSettingsSchema, type ReservationProtectionInput } from './validation';
import { sendNewsletterWelcome, sendReservationConfirmation } from './email';
import { solveCheckExpression } from './checkExpression';
import type { NextFunction, Request, Response } from 'express';

let distDir = '';
if (!process.env.VERCEL) {
  distDir = path.resolve(process.cwd(), 'dist');
}

const IMAGE_OVERRIDES_KEY = 'image_asset_overrides';
const SITE_CONTACT_EMAIL_KEY = 'site_contact_email';
const MENU_ITEMS_KEY = 'menu_items';
const SITE_CONTENT_KEY = 'site_content';
const RESERVATION_PROTECTION_KEY = 'reservation_protection';
const ADMIN_TOKEN_KEY = 'admin_token';
const DEFAULT_CONTACT_EMAIL = (process.env.SITE_CONTACT_EMAIL ?? '').trim() || 'smpsandro1239@gmail.com';

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_HITS = 5;

function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

function dayOfYear(key: string): number {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day));
  const epoch = Date.UTC(year, 0, 1);
  return Math.floor((d.getTime() - epoch) / 86400000);
}

function isDateBlocked(date: string, period: { start_date: string; end_date: string | null; repeat: string }): boolean {
  const end = period.end_date && period.end_date >= period.start_date ? period.end_date : period.start_date;

  if (period.repeat === 'weekly') {
    const dayOfWeek = (dateKey: string): number => {
      const { year, month, day } = parseDateKey(dateKey);
      return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    };
    const startDow = dayOfWeek(period.start_date);
    const spanDays = Math.round((new Date(Date.UTC(parseDateKey(end).year, parseDateKey(end).month - 1, parseDateKey(end).day)).getTime() - new Date(Date.UTC(parseDateKey(period.start_date).year, parseDateKey(period.start_date).month - 1, parseDateKey(period.start_date).day)).getTime()) / 86400000);
    const rel = (dayOfWeek(date) - startDow + 7) % 7;
    return rel <= spanDays;
  }

  if (period.repeat === 'yearly') {
    const { year, month, day } = parseDateKey(date);
    const s = parseDateKey(period.start_date);
    const e = parseDateKey(end);
    const key = (m: number, d: number): number => m * 100 + d;
    const sd = key(s.month, s.day);
    const ed = key(e.month, e.day);
    const cd = key(month, day);
    if (sd <= ed) return cd >= sd && cd <= ed;
    return cd >= sd || cd <= ed;
  }

  return date >= period.start_date && date <= end;
}

type PublicClosedPeriodShape = { title: string; startDate: string; endDate?: string; repeat: string };

async function getPublicClosedPeriods(storage: Storage): Promise<PublicClosedPeriodShape[]> {
  const rows = await storage.listClosedPeriods();
  return rows.map((r) => ({
    title: r.title,
    startDate: r.start_date,
    ...(r.end_date && r.end_date !== r.start_date ? { endDate: r.end_date } : {}),
    repeat: r.repeat,
  }));
}

async function getClosedPeriodForDate(storage: Storage, date: string): Promise<{ title: string } | null> {
  const periods = await storage.listClosedPeriods();
  for (const period of periods) {
    if (isDateBlocked(date, period)) {
      return { title: period.title };
    }
  }
  return null;
}

const DEFAULT_RESERVATION_PROTECTION: ReservationProtectionInput = {
  enabled: false,
  pauseForm: false,
  dailyCapacity: 40,
  maxPerClient: 2,
  rateLimit: true,
  requireCheck: true,
};

const DEFAULT_SITE_CONTENT: Record<string, string> = {
  contactEmail: DEFAULT_CONTACT_EMAIL,
  phone: '+351 253 031 890',
  address: '',
  hours: '',
  headline: '',
  heroSubtitle: '',
  aboutTitle: '',
  aboutText: '',
  instagram: 'https://www.instagram.com/bocamaldita/',
  facebook: 'https://web.facebook.com/malditaboca',
  videoUrl: 'https://www.facebook.com/malditaboca/videos/at%C3%A9-j%C3%A1-/758681031592904/',
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

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) {
    const first = fwd.split(',')[0].trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

function parseReservationProtection(raw: string | null): ReservationProtectionInput {
  const parsed = parseStoredJson(raw);
  return {
    enabled: parsed.enabled === true,
    pauseForm: parsed.pauseForm === true,
    dailyCapacity: typeof parsed.dailyCapacity === 'number' && parsed.dailyCapacity > 0 ? parsed.dailyCapacity : DEFAULT_RESERVATION_PROTECTION.dailyCapacity,
    maxPerClient: typeof parsed.maxPerClient === 'number' && parsed.maxPerClient > 0 ? parsed.maxPerClient : DEFAULT_RESERVATION_PROTECTION.maxPerClient,
    rateLimit: parsed.rateLimit !== false,
    requireCheck: parsed.requireCheck !== false,
  };
}

async function getReservationProtection(storage: Storage): Promise<ReservationProtectionInput> {
  const raw = await storage.getSetting(RESERVATION_PROTECTION_KEY);
  return parseReservationProtection(raw);
}

const adminToken = (process.env.ADMIN_TOKEN ?? '').trim();

export interface AppInstance {
  app: express.Express;
  storage: Storage;
}

async function getEffectiveAdminToken(storage: Storage): Promise<string> {
  const stored = await storage.getSetting(ADMIN_TOKEN_KEY);
  return (stored?.trim() || adminToken);
}

function adminUnauthorized(res: Response, hasToken: boolean): void {
  if (hasToken) {
    res.status(401).json({ error: 'Token de administrador inválido.' });
  } else {
    res.status(503).json({
      error: 'Administração desativada: defina a variável ADMIN_TOKEN no servidor.',
    });
  }
}

async function isAuthorized(req: Request, res: Response, storage: Storage): Promise<boolean> {
  const effective = await getEffectiveAdminToken(storage);
  if (!effective || req.headers['x-admin-token'] !== effective) {
    adminUnauthorized(res, effective !== '');
    return false;
  }
  return true;
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

  const ipHits = new Map<string, { count: number; startedAt: number }>();
  function allowIpHit(ip: string | undefined): boolean {
    if (!ip) return true;
    const now = Date.now();
    const entry = ipHits.get(ip);
    if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
      ipHits.set(ip, { count: 1, startedAt: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= RATE_MAX_HITS;
  }

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

  app.get('/api/reservations-config', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const protection = await getReservationProtection(storage);
      const closedPeriods = await getPublicClosedPeriods(storage);
      res.json({
        protectionEnabled: protection.enabled,
        paused: protection.enabled && protection.pauseForm,
        requireCheck: protection.enabled && protection.requireCheck,
        closedPeriods,
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/reservations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = reservationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const closed = await getClosedPeriodForDate(storage, parsed.data.date);
      if (closed) {
        return res.status(423).json({
          error: `Não é possível reservar para esta data: ${closed.title}. Escolha outro dia ou ligue ${DEFAULT_SITE_CONTENT.phone}.`,
        });
      }
      const protection = await getReservationProtection(storage);
      let ip: string | undefined;
      if (protection.enabled) {
        ip = getClientIp(req);
        if (protection.pauseForm) {
          return res.status(423).json({
            error: `As reservas online estão temporariamente pausadas. Ligue ${DEFAULT_SITE_CONTENT.phone} para reservar.`,
          });
        }
        if (protection.requireCheck) {
          const answer = solveCheckExpression(parsed.data.checkQuestion);
          const checkOk = answer !== null && Number(parsed.data.check) === answer;
          const honeypotEmpty = !parsed.data.honeypot;
          if (!checkOk || !honeypotEmpty) {
            return res.status(400).json({ error: 'Verificação anti-robô incorreta. Tente de novo.' });
          }
        }
        if (protection.rateLimit && !allowIpHit(ip)) {
          return res.status(429).json({ error: 'Demasiados pedidos de reserva. Aguarde alguns minutos.' });
        }
        if ((await storage.countByDate(parsed.data.date)) >= protection.dailyCapacity) {
          return res.status(409).json({ error: `Lotação esgotada para esta data. Tente outra data ou ligue ${DEFAULT_SITE_CONTENT.phone}.` });
        }
        if ((await storage.countByClientOnDate(parsed.data.date, parsed.data.email, parsed.data.phone)) >= protection.maxPerClient) {
          return res.status(409).json({ error: 'Já existem reservas para esta data com este contacto.' });
        }
      }
      const { id, reference } = await storage.createReservation(parsed.data, { ip });
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
      if (!allowIpHit(getClientIp(req))) {
        return res.status(429).json({ error: 'Demasiados pedidos de contacto. Aguarde alguns minutos.' });
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
      if (!allowIpHit(getClientIp(req))) {
        return res.status(429).json({ error: 'Demasiadas subscrições. Aguarde alguns minutos.' });
      }
      const { id } = await storage.createNewsletter(parsed.data);
      sendNewsletterWelcome(parsed.data.email).catch((err) => {
        console.error('[email] Falha no envio de boas-vindas do boletim:', err);
      });
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
      if (!(await isAuthorized(req, res, storage))) return;
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

  app.get('/api/admin/verify-token', async (req: Request, res: Response) => {
    if (!(await isAuthorized(req, res, storage))) return;
    res.json({ ok: true });
  });

  app.get('/api/admin/assets', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const effective = await getEffectiveAdminToken(storage);
      const raw = await storage.getSetting(IMAGE_OVERRIDES_KEY);
      const stored = parseStoredJson(raw);
      const overrides: Record<string, unknown> = {};
      for (const [id, value] of Object.entries(stored)) {
        overrides[id] = typeof value === 'string' ? { url: value } : value;
      }
      res.json({ enabled: effective !== '', overrides });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/assets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
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
      if (!(await isAuthorized(req, res, storage))) return;
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
      if (!(await isAuthorized(req, res, storage))) return;
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
      if (!(await isAuthorized(req, res, storage))) return;
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
      if (!(await isAuthorized(req, res, storage))) return;
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

  app.get('/api/admin/reservation-protection', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      res.json(await getReservationProtection(storage));
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/reservation-protection', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const parsed = reservationProtectionSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      await storage.setSetting(RESERVATION_PROTECTION_KEY, JSON.stringify(parsed.data));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/reservations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      res.json({ items: await storage.listReservations() });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/reservations/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      res.json({ ok: await storage.deleteReservation(idResult.data) });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/admin/reservations', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const parsed = adminReservationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const { id, reference } = await storage.createReservation(parsed.data);
      res.status(201).json({ id, reference });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/reservations/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      const parsed = adminReservationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const ok = await storage.updateReservation(idResult.data, parsed.data);
      if (!ok) {
        return res.status(404).json({ error: 'Reserva não encontrada.' });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/contacts', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      res.json({ items: await storage.listContacts() });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/contacts/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
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
      if (!(await isAuthorized(req, res, storage))) return;
      res.json({ items: await storage.listNewsletter() });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/newsletter/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      res.json({ ok: await storage.deleteNewsletter(idResult.data) });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/reviews', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = reviewSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      if (!allowIpHit(getClientIp(req))) {
        return res.status(429).json({ error: 'Demasiadas avaliações. Aguarde alguns minutos.' });
      }
      const { id } = await storage.createReview(parsed.data, { ip: getClientIp(req) });
      res.status(201).json({ id });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/reviews', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ items: await storage.listReviews(true) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/reviews', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      res.json({ items: await storage.listReviews() });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      const parsed = reviewStatusSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const ok = await storage.setReviewStatus(idResult.data, parsed.data.status);
      if (!ok) {
        return res.status(404).json({ error: 'Avaliação não encontrada.' });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/reviews/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      res.json({ ok: await storage.deleteReview(idResult.data) });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/admin/closed-days', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      res.json({ items: await storage.listClosedPeriods() });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/admin/closed-days', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const parsed = closedPeriodSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const { id } = await storage.createClosedPeriod(parsed.data);
      res.status(201).json({ id });
    } catch (err) {
      next(err);
    }
  });

  app.delete('/api/admin/closed-days/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: 'ID inválido.' });
      }
      res.json({ ok: await storage.deleteClosedPeriod(idResult.data) });
    } catch (err) {
      next(err);
    }
  });

  app.put('/api/admin/security/token', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!(await isAuthorized(req, res, storage))) return;
      const parsed = adminTokenUpdateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          error: 'O token não cumpre os requisitos. Necessita de: pelo menos 16 caracteres, maiúsculas, minúsculas, um número e um carácter especial.',
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }
      if (parsed.data.token === (await getEffectiveAdminToken(storage))) {
        return res.status(400).json({ error: 'O novo token é igual ao atual.' });
      }
      await storage.setSetting(ADMIN_TOKEN_KEY, parsed.data.token);
      res.json({ ok: true });
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