// Autenticação do painel de administração (D-3).
//
// Sessões por cookie HttpOnly (bmtauth) + token CSRF (bmcsrf) num MESMO blob em
// settings (chave `admin_sessions`), com TTL de 14 dias.
//
// O read-modify-write do blob é deliberadamente NÃO atómico: a interface Storage só
// expõe getSetting/setSetting/deleteSetting por chave (sem enumeração de chaves), e com
// um único administrador a janela de colisão entre dois logins concorrentes é irrelevante —
// a simplicidade vale mais do que a atomicidade aqui.
//
// Nota: cookies Secure funcionam em localhost (Chrome/Firefox tratam-no como origem
// confiável); num endereço IP o navegador recusa gravá-los e o login falha silenciosamente.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

export const SESSION_COOKIE = 'bmtauth';
export const CSRF_COOKIE = 'bmcsrf';
export const SESSIONS_KEY = 'admin_sessions';
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export interface SessionStore {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  deleteSetting(key: string): Promise<void>;
}

export interface SessionEntry {
  csrf: string;
  createdAt: number;
}

export interface AdminIdentity {
  via: 'cookie' | 'header';
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    if (!key || !raw) continue;
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export async function purgeExpiredSessions(store: SessionStore): Promise<Record<string, SessionEntry>> {
  const stored = await store.getSetting(SESSIONS_KEY);
  if (!stored) return {};
  let map: Record<string, SessionEntry>;
  try {
    map = JSON.parse(stored) as Record<string, SessionEntry>;
  } catch {
    await store.deleteSetting(SESSIONS_KEY);
    return {};
  }
  const now = Date.now();
  const live: Record<string, SessionEntry> = {};
  let changed = false;
  for (const [sid, entry] of Object.entries(map)) {
    if (entry && typeof entry.createdAt === 'number' && now - entry.createdAt < SESSION_TTL_MS) {
      live[sid] = entry;
    } else {
      changed = true;
    }
  }
  if (changed) {
    if (Object.keys(live).length === 0) await store.deleteSetting(SESSIONS_KEY);
    else await store.setSetting(SESSIONS_KEY, JSON.stringify(live));
  }
  return live;
}

export async function getSession(store: SessionStore, sid: string): Promise<SessionEntry | null> {
  const map = await purgeExpiredSessions(store);
  const entry = map[sid];
  if (!entry) return null;
  if (Date.now() - entry.createdAt >= SESSION_TTL_MS) return null;
  return entry;
}

export async function createSession(store: SessionStore): Promise<{ sid: string; csrf: string }> {
  const map = await purgeExpiredSessions(store);
  const sid = randomBytes(24).toString('base64url');
  const csrf = randomBytes(24).toString('base64url');
  map[sid] = { csrf, createdAt: Date.now() };
  await store.setSetting(SESSIONS_KEY, JSON.stringify(map));
  return { sid, csrf };
}

export async function deleteSession(store: SessionStore, sid: string): Promise<void> {
  const map = await purgeExpiredSessions(store);
  if (!map[sid]) return;
  delete map[sid];
  await store.setSetting(SESSIONS_KEY, JSON.stringify(map));
}

export async function destroyAllSessions(store: SessionStore): Promise<void> {
  await store.deleteSetting(SESSIONS_KEY);
}

export async function requireAdmin(
  req: Request,
  res: Response,
  store: SessionStore,
  getEffectiveToken: () => Promise<string>,
  opts: { requireCsrf: boolean },
): Promise<AdminIdentity | null> {
  const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (sid) {
    const session = await getSession(store, sid);
    if (session) {
      if (opts.requireCsrf) {
        const csrf = req.headers['x-csrf-token'];
        if (typeof csrf !== 'string' || !csrf || !timingSafeEqualStr(csrf, session.csrf)) {
          res.status(403).json({ error: 'Token CSRF inválido.' });
          return null;
        }
      }
      return { via: 'cookie' };
    }
  }

  const header = req.headers['x-admin-token'];
  if (typeof header === 'string' && header.trim()) {
    const effectiveToken = await getEffectiveToken();
    if (timingSafeEqualStr(header.trim(), effectiveToken)) {
      return { via: 'header' };
    }
  }

  const effectiveToken = await getEffectiveToken();
  if (effectiveToken) {
    res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
  } else {
    res.status(503).json({
      error: 'Administração desativada: defina a variável ADMIN_TOKEN no servidor.',
    });
  }
  return null;
}