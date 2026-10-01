import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from './storage';
import {
  createSession,
  deleteSession,
  destroyAllSessions,
  getSession,
  parseCookies,
  purgeExpiredSessions,
  requireAdmin,
  SESSIONS_KEY,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  timingSafeEqualStr,
} from './auth';
import type { SessionEntry } from './auth';

function makeReq(headers: Record<string, string | undefined>): any {
  return { headers };
}

function makeRes(): {
  statusCode: number;
  body: unknown;
  status(c: number): { json(body: unknown): unknown };
} {
  let statusCode = 200;
  let body: unknown = null;
  return {
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    status(c: number) {
      statusCode = c;
      return {
        json(jsonBody: unknown) {
          body = jsonBody;
        },
      };
    },
  };
}

describe('parseCookies', () => {
  it('parses simple cookies', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' });
  });

  it('ignores empty and garbage parts', () => {
    expect(parseCookies('a=1; ; b')).toEqual({ a: '1' });
  });

  it('handles undefined header', () => {
    expect(parseCookies(undefined)).toEqual({});
  });

  it('does not throw on malformed percent-encoding', () => {
    expect(() => parseCookies('a=%zz')).not.toThrow();
    expect(parseCookies('a=%zz')).toEqual({ a: '%zz' });
  });

  it('keeps last value for duplicated keys', () => {
    expect(parseCookies('a=1; a=2')).toEqual({ a: '2' });
  });
});

describe('timingSafeEqualStr', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqualStr('abc', 'abc')).toBe(true);
  });

  it('returns false for different strings of the same length', () => {
    expect(timingSafeEqualStr('abc', 'abd')).toBe(false);
  });

  it('returns false for different lengths without throwing', () => {
    expect(() => timingSafeEqualStr('a', 'abc')).not.toThrow();
    expect(timingSafeEqualStr('a', 'abc')).toBe(false);
    expect(timingSafeEqualStr('', 'a')).toBe(false);
  });
});

describe('sessões', () => {
  it('createSession stores and getSession retrieves', async () => {
    const store = createMemoryStorage();
    const { sid, csrf } = await createSession(store);
    const entry = await getSession(store, sid);
    expect(entry).not.toBeNull();
    expect(entry?.csrf).toBe(csrf);
    expect(typeof entry?.createdAt).toBe('number');
  });

  it('getSession returns null for unknown sid', async () => {
    const store = createMemoryStorage();
    expect(await getSession(store, 'nao-existe')).toBeNull();
  });

  it('deleteSession only removes the targeted sid', async () => {
    const store = createMemoryStorage();
    const a = await createSession(store);
    const b = await createSession(store);
    await deleteSession(store, a.sid);
    expect(await getSession(store, a.sid)).toBeNull();
    expect(await getSession(store, b.sid)).not.toBeNull();
  });

  it('purgeExpiredSessions removes expired entries and writes only when changed', async () => {
    const store = createMemoryStorage();
    await deleteSession(store, 'x');
    const sid = 'expired-sid';
    await store.setSetting(
      SESSIONS_KEY,
      JSON.stringify({
        [sid]: { csrf: 'csrf', createdAt: Date.now() - SESSION_TTL_MS - 1000 },
        vivo: { csrf: 'csrf2', createdAt: Date.now() - 1000 },
      } satisfies Record<string, SessionEntry>),
    );
    const live = await purgeExpiredSessions(store);
    expect(live[sid]).toBeUndefined();
    expect(live.vivo).toBeDefined();
    const stored = await store.getSetting(SESSIONS_KEY);
    expect(JSON.parse(stored ?? '{}')).toEqual({ vivo: live.vivo });
  });

  it('destroyAllSessions clears all sessions', async () => {
    const store = createMemoryStorage();
    await createSession(store);
    await createSession(store);
    await destroyAllSessions(store);
    expect(await store.getSetting(SESSIONS_KEY)).toBeNull();
  });
});

describe('requireAdmin', () => {
  const token = () => Promise.resolve('token-certo');

  it('authorizes via cookie with matching CSRF on mutation', async () => {
    const store = createMemoryStorage();
    const { sid, csrf } = await createSession(store);
    const res = makeRes();
    const identity = await requireAdmin(makeReq({ cookie: `${SESSION_COOKIE}=${sid}`, 'x-csrf-token': csrf }), res as never, store, token, { requireCsrf: true });
    expect(identity).toEqual({ via: 'cookie' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects mutation via cookie without CSRF token (403)', async () => {
    const store = createMemoryStorage();
    const { sid } = await createSession(store);
    const res = makeRes();
    const identity = await requireAdmin(makeReq({ cookie: `${SESSION_COOKIE}=${sid}` }), res as never, store, token, { requireCsrf: true });
    expect(identity).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  it('rejects mutation via cookie with wrong CSRF token (403)', async () => {
    const store = createMemoryStorage();
    const { sid } = await createSession(store);
    const res = makeRes();
    const identity = await requireAdmin(makeReq({ cookie: `${SESSION_COOKIE}=${sid}`, 'x-csrf-token': 'errado' }), res as never, store, token, { requireCsrf: true });
    expect(identity).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  it('authorizes via X-Admin-Token header without CSRF (fallback curl)', async () => {
    const store = createMemoryStorage();
    const res = makeRes();
    const identity = await requireAdmin(makeReq({ 'x-admin-token': 'token-certo' }), res as never, store, token, { requireCsrf: true });
    expect(identity).toEqual({ via: 'header' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects expired cookie session and cleans it up', async () => {
    const store = createMemoryStorage();
    const sid = 'expired-sid';
    await store.setSetting(
      SESSIONS_KEY,
      JSON.stringify({ [sid]: { csrf: 'csrf', createdAt: Date.now() - SESSION_TTL_MS - 1000 } }),
    );
    const res = makeRes();
    const identity = await requireAdmin(makeReq({ cookie: `${SESSION_COOKIE}=${sid}`, 'x-csrf-token': 'csrf' }), res as never, store, token, { requireCsrf: true });
    expect(identity).toBeNull();
    expect(res.statusCode).toBe(401);
    expect(await store.getSetting(SESSIONS_KEY)).toBeNull();
  });

  it('responds 503 when no admin token is configured', async () => {
    const store = createMemoryStorage();
    const res = makeRes();
    const identity = await requireAdmin(makeReq({}), res as never, store, () => Promise.resolve(''), { requireCsrf: true });
    expect(identity).toBeNull();
    expect(res.statusCode).toBe(503);
  });

  it('responds 401 when credentials are wrong and a token is configured', async () => {
    const store = createMemoryStorage();
    const res = makeRes();
    const identity = await requireAdmin(makeReq({ 'x-admin-token': 'errado' }), res as never, store, token, { requireCsrf: true });
    expect(identity).toBeNull();
    expect(res.statusCode).toBe(401);
  });
});