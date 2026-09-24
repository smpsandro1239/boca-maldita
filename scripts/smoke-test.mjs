// Smoke tests contra uma base de TESTE — NUNCA contra produção.
// Modo padrão: SQLite local efémero (TEMP), SMTP desligado, base apagada no fim.
// Modo Turso de teste: definir SMOKE_TURSO_URL + SMOKE_TURSO_AUTH_TOKEN (a URL TEM de conter "test"/"smoke"/"local",
// senão o script aborta). O script fecha-se sozinho (fail-closed): nunca herda TURSO_URL/TURSO_AUTH_TOKEN de .env.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';

const ROOT = process.cwd();
const DB_DIR = mkdtempSync(path.join(tmpdir(), 'bmtest-'));
const DB_PATH = path.join(DB_DIR, 'boca-maldita-smoke.db');
const ADMIN_TOKEN = 'smoke-test-token';
const BASE_URL = process.env.SMOKE_BASE_URL ?? '';

const TURSO_TEST_URL = (process.env.SMOKE_TURSO_URL ?? '').trim();
const TURSO_TEST_AUTH = (process.env.SMOKE_TURSO_AUTH_TOKEN ?? '').trim();

function isTestTursoUrl(url) {
  return /(test|smoke|local)/i.test(url);
}

if (TURSO_TEST_URL || TURSO_TEST_AUTH) {
  if (!TURSO_TEST_URL || !TURSO_TEST_AUTH) {
    console.error('SMOKE: SMOKE_TURSO_URL e SMOKE_TURSO_AUTH_TOKEN têm de ser definidos em conjunto.');
    process.exit(1);
  }
  if (!isTestTursoUrl(TURSO_TEST_URL)) {
    console.error(`SMOKE: recusado — SMOKE_TURSO_URL "${TURSO_TEST_URL}" não parece uma base de teste. Aborto.`);
    process.exit(1);
  }
  if (TURSO_TEST_URL === (process.env.TURSO_URL ?? '').trim()) {
    console.error('SMOKE: recusado — SMOKE_TURSO_URL é igual à TURSO_URL de produção. Aborto.');
    process.exit(1);
  }
  console.log('[smoke] Modo Turso de TESTE:', TURSO_TEST_URL);
} else {
  console.log(`[smoke] Modo SQLite local efémero: ${DB_PATH} (forçadamente isolado, SMTP desligado)`);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function main() {
  const gate = await freePort();
  const env = {
    ...process.env,
    PORT: String(gate),
    DB_PATH,
    ADMIN_TOKEN,
    SMTP_HOST: '',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_PORT: '',
    SMTP_SECURE: '',
    APP_URL: `http://localhost:${gate}`,
    SITE_CONTACT_EMAIL: `smoke-${gate}@boca-maldita.test`,
  };
  if (TURSO_TEST_URL && TURSO_TEST_AUTH) {
    env.TURSO_URL = TURSO_TEST_URL;
    env.TURSO_AUTH_TOKEN = TURSO_TEST_AUTH;
  } else {
    // dotenv não sobrescreve variáveis já definidas: forçar vazio impede qualquer Turso de .env/prod.
    env.TURSO_URL = '';
    env.TURSO_AUTH_TOKEN = '';
  }

  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  child.stdout.on('data', (d) => (serverLog += d));
  child.stderr.on('data', (d) => (serverLog += d));

  const base = BASE_URL || `http://127.0.0.1:${gate}`;
  const results = [];
  const pass = (name) => results.push({ name, ok: true });
  const fail = (name, detail) => results.push({ name, ok: false, detail });

  try {
    await waitForHealth(base, child);
    const headersAdmin = { 'Content-Type': 'application/json', 'x-admin-token': ADMIN_TOKEN };

    const r1 = await fetch(`${base}/api/health`);
    r1.status === 200 ? pass('GET /api/health 200') : fail('GET /api/health 200', r1.status);

    const cfg = await fetch(`${base}/api/reservations-config`).then((r) => r.json());
    cfg.paused === false ? pass('GET /api/reservations-config (paused=false)') : fail('reservations-config paused', JSON.stringify(cfg));

    const menus = await fetch(`${base}/api/menus`).then((r) => r.json());
    const menusOk = menus && typeof menus === 'object' && 'items' in menus && (menus.items === null || Array.isArray(menus.items));
    menusOk ? pass('GET /api/menus (estrutura {items})') : fail('GET /api/menus', JSON.stringify(menus));

    const sc = await fetch(`${base}/api/site-content`).then((r) => r.json());
    sc.phone && sc.phone.trim() ? pass('GET /api/site-content (phone)') : fail('site-content phone', sc.phone);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().slice(0, 10);
    const res = await fetch(`${base}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Test', email: 'smoke@test.pt', phone: '911 111 111', date: iso, time: '19:30', guests: 2, area: 'Sala principal', occasion: 'Outro', notes: 'smoke' }),
    });
    const resBody = await res.json();
    if ((res.status === 200 || res.status === 201) && resBody.reference === 'BM-0001') {
      pass('POST /api/reservations → BM-0001 (prova DB efémero isolado)');
    } else {
      fail('POST /api/reservations BM-0001', `${res.status} ${JSON.stringify(resBody)}`);
    }

    const list1 = await fetch(`${base}/api/admin/reservations`, { headers: headersAdmin }).then((r) => r.json());
    const resList = Array.isArray(list1) ? list1 : list1.items;
    const row = Array.isArray(resList) ? resList.find((x) => x.reference === 'BM-0001') : null;
    if (row && Number(row.id) > 0) {
      const del = await fetch(`${base}/api/admin/reservations/${row.id}`, { method: 'DELETE', headers: headersAdmin });
      const del2 = await fetch(`${base}/api/admin/reservations`, { headers: headersAdmin }).then((r) => r.json());
      const delList = Array.isArray(del2) ? del2 : del2.items;
      const gone = Array.isArray(delList) && !delList.some((x) => x.id === row.id);
      del.status === 200 && gone ? pass('DELETE /api/admin/reservations/:id (limpo)') : fail('limpeza reserva', `${del.status} gone=${gone}`);
    } else {
      fail('localizar reserva BM-0001 para limpeza', JSON.stringify(row));
    }

    const ct = await fetch(`${base}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Smoke Contact', email: 'smoke@test.pt', assunto: 'Smoke', mensagem: 'roundtrip' }),
    }).then((r) => r.json());
    if (ct.id >= 1 || ct.id === 0) {
      const listC = await fetch(`${base}/api/admin/contacts`, { headers: headersAdmin }).then((r) => r.json());
      const contactsL = Array.isArray(listC) ? listC : listC.items;
      if (Array.isArray(contactsL)) {
        const delC = await fetch(`${base}/api/admin/contacts/${ct.id}`, { method: 'DELETE', headers: headersAdmin });
        delC.status === 200 ? pass('POST+DELETE /api/contacts (roundtrip)') : fail('contact roundtrip delete', `${delC.status}`);
      } else {
        fail('admin contacts list', JSON.stringify(listC));
      }
    } else {
      fail('POST /api/contacts id', JSON.stringify(ct));
    }

    const nl = await fetch(`${base}/api/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `smoke-${gate}@news.test` }),
    }).then((r) => r.json());
    if (nl.id >= 1 || nl.id === 0) {
      const listN = await fetch(`${base}/api/admin/newsletter`, { headers: headersAdmin }).then((r) => r.json());
      const newslettersL = Array.isArray(listN) ? listN : listN.items;
      const target = Array.isArray(newslettersL) ? newslettersL.find((n) => `${n.id}` === `${nl.id}`) : null;
      if (target) {
        const delN = await fetch(`${base}/api/admin/newsletter/${target.id}`, { method: 'DELETE', headers: headersAdmin });
        delN.status === 200 ? pass('POST+DELETE /api/newsletter (roundtrip)') : fail('newsletter roundtrip delete', delN.status.toString());
      } else {
        fail('localizar newsletter para limpeza', JSON.stringify(listN));
      }
    } else {
      fail('POST /api/newsletter id', JSON.stringify(nl));
    }

    // ---- D-3: autenticação por cookie (bmtauth + bmcsrf) + CSRF + logout ----
    const parseSetCookies = (headers) => {
      const setCookies = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
      return setCookies.map((line) => {
        const eq = line.indexOf('=');
        const name = line.slice(0, eq).trim();
        const value = line.slice(eq + 1).split(';')[0].trim();
        return { name, value };
      });
    };
    const cookieJar = (list) => list.map((c) => `${c.name}=${c.value}`).join('; ');

    const login = await fetch(`${base}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: ADMIN_TOKEN }),
    });
    const loginBody = await login.json();
    const loginCookies = parseSetCookies(login.headers);
    const jar = loginCookies.length ? `${cookieJar(loginCookies)}; ` : '';
    const csrfCookie = loginCookies.find((c) => c.name === 'bmcsrf');
    const sidCookie = loginCookies.find((c) => c.name === 'bmtauth');
    if (login.status === 200 && loginBody.ok && sidCookie && csrfCookie) {
      pass('POST /api/admin/login (cookies bmtauth+bmcsrf)');
    } else {
      fail('POST /api/admin/login', `${login.status} ${JSON.stringify(loginBody)}`);
    }

    if (jar && csrfCookie) {
      const session = await fetch(`${base}/api/admin/session`, { headers: { cookie: jar } });
      const sessionBody = await session.json();
      session.status === 200 && sessionBody.authenticated
        ? pass('GET /api/admin/session com cookie → 200 autenticado')
        : fail('GET /api/admin/session', `${session.status} ${JSON.stringify(sessionBody)}`);

      const iso2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      const csrfHeaders = { 'Content-Type': 'application/json', cookie: jar, 'x-csrf-token': csrfCookie.value };
      const addDay = await fetch(`${base}/api/admin/closed-days`, {
        method: 'POST',
        headers: csrfHeaders,
        body: JSON.stringify({ title: 'Smoke período', startDate: iso2, repeat: 'none', note: 'd3' }),
      });
      const addDayBody = await addDay.json();
      if ((addDay.status === 200 || addDay.status === 201) && addDayBody.id) {
        pass('POST /api/admin/closed-days com X-Csrf-Token (cookie) → 200/201');
        const delDay = await fetch(`${base}/api/admin/closed-days/${addDayBody.id}`, {
          method: 'DELETE',
          headers: { cookie: jar, 'x-csrf-token': csrfCookie.value },
        });
        delDay.status === 200
          ? pass('DELETE /api/admin/closed-days/:id (cookie+csrf) → 200')
          : fail('DELETE closed-days cookie+csrf', `${delDay.status}`);
      } else {
        fail('POST closed-days cookie+csrf', `${addDay.status} ${JSON.stringify(addDayBody)}`);
      }

      const noCsrf = await fetch(`${base}/api/admin/closed-days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: jar },
        body: JSON.stringify({ title: 'Smoke sem CSRF', startDate: iso2, repeat: 'none', note: 'x' }),
      });
      noCsrf.status === 403
        ? pass('POST admin sem X-Csrf-Token com cookie → 403')
        : fail('CSRF ausente', `${noCsrf.status}`);

      const logout = await fetch(`${base}/api/admin/logout`, { method: 'POST', headers: { cookie: jar } });
      const sectionAfter = await fetch(`${base}/api/admin/session`, { headers: { cookie: jar } });
      logout.status === 200 && sectionAfter.status === 401
        ? pass('POST /api/admin/logout → session 401 (idempotente)')
        : fail('logout/expiração sessão', `logout=${logout.status} session=${sectionAfter.status}`);

      const logoutAgain = await fetch(`${base}/api/admin/logout`, { method: 'POST', headers: { cookie: jar } });
      logoutAgain.status === 200
        ? pass('POST /api/admin/logout repetido → 200 (idempotente)')
        : fail('logout repetido', `${logoutAgain.status}`);
    }
  } catch (err) {
    fail('smoke execução', err.message);
  } finally {
    child.kill('SIGTERM');
    await waitExit(child);
    rmSync(DB_DIR, { recursive: true, force: true });
  }

  for (const r of results) {
    console.log(r.ok ? `  ✓ ${r.name}` : `  ✗ ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\nSMOKE: ${results.length - failed.length}/${results.length} ok`);
  if (failed.length) {
    console.log('[smoke] último log do servidor:\n' + serverLog.split('\n').slice(-15).join('\n'));
    process.exit(1);
  }
}

function waitForHealth(base, child) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(async () => {
      if (child.exitCode !== null) {
        clearInterval(timer);
        return reject(new Error('servidor saiu antes de ficar pronto'));
      }
      try {
        const r = await fetch(`${base}/api/health`);
        if (r.ok) {
          clearInterval(timer);
          resolve();
        }
      } catch {
        if (Date.now() - started > 30000) {
          clearInterval(timer);
          reject(new Error('timeout a aguardar /api/health'));
        }
      }
    }, 500);
  });
}

function waitExit(child) {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once('exit', resolve));
}

main().catch((err) => {
  console.error('SMOKE: erro fatal', err);
  rmSync(DB_DIR, { recursive: true, force: true });
  process.exit(1);
});