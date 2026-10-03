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

// ---- Asserts de FORMA -------------------------------------------------
// Os tipos (shared/contracts.ts + Response<T>) verificam o CÓDIGO. Estes
// asserts verificam os DADOS: o tsc nunca vê o que a base devolve. Exemplo
// concreto: a coluna price pode vir null da Turso e o tipo continua a dizer
// number, satisfeito. Por isso os dois são necessários.
//
// Regra: cada falha nomeia a chave concreta. Um "fail" genérico não diz nada.

function validateDiarias(d) {
  const issues = [];
  if (!d || typeof d !== 'object') return [`resposta não é objecto: ${JSON.stringify(d)}`];
  for (const k of ['date', 'currentMeal', 'lunch', 'dinner', 'hasSchedule', 'servedMeals', 'closedTitle']) {
    if (!(k in d)) issues.push(`falta a chave "${k}"`);
  }
  if (!['lunch', 'dinner', 'closed'].includes(d.currentMeal)) {
    issues.push(`currentMeal inválido: ${JSON.stringify(d.currentMeal)}`);
  }
  if (typeof d.hasSchedule !== 'boolean') issues.push(`hasSchedule não é boolean (${JSON.stringify(d.hasSchedule)})`);
  for (const meal of ['lunch', 'dinner']) {
    if (!(meal in d)) continue;
    if (!Array.isArray(d[meal])) {
      issues.push(`${meal} não é array`);
      continue;
    }
    d[meal].forEach((ref, i) => {
      if (!ref || typeof ref !== 'object') {
        issues.push(`${meal}[${i}] não é objecto`);
        return;
      }
      if (typeof ref.id !== 'string') issues.push(`${meal}[${i}].id não é string (${JSON.stringify(ref.id)})`);
      for (const k of Object.keys(ref)) {
        if (k !== 'id' && k !== 'visible') {
          issues.push(`${meal}[${i}] tem a chave inesperada "${k}" — /api/diarias só devolve referência {id, visible}`);
        }
      }
      if ('price' in ref) issues.push(`${meal}[${i}] tem "price": prato completo em vez de referência rebenta price.toFixed no cliente`);
      if ('name' in ref) issues.push(`${meal}[${i}] tem "name": /api/diarias não devolve nome de prato`);
    });
  }
  if (d.servedMeals && typeof d.servedMeals === 'object') {
    for (const m of ['lunch', 'dinner']) {
      if (typeof d.servedMeals[m] !== 'boolean') issues.push(`servedMeals.${m} não é boolean`);
    }
  }
  return issues;
}

// dailyKind NÃO é exigido aqui: é opcional pelo schema e a regra "toda
// diária tem carne ou peixe" é regra de negócio, não forma. Fixar aqui daria
// falso positivo se alguém acrescentar uma diária por outra via.
function validateMenus(m) {
  if (!m || typeof m !== 'object') return [`resposta não é objecto: ${JSON.stringify(m)}`];
  if (!('items' in m)) return ['falta a chave "items"'];
  const items = m.items;
  if (items === null) return []; // contrato: array ou null
  if (!Array.isArray(items)) return [`items não é array nem null (${typeof items})`];
  const issues = [];
  items.forEach((it, i) => {
    if (!it || typeof it !== 'object') {
      issues.push(`items[${i}] não é objecto`);
      return;
    }
    for (const [k, t] of [['id', 'string'], ['name', 'string'], ['price', 'number'], ['category', 'string']]) {
      if (typeof it[k] !== t) issues.push(`items[${i}].${k} não é ${t} (${JSON.stringify(it[k])})`);
    }
    if ('dailyKind' in it && !['carne', 'peixe'].includes(it.dailyKind)) {
      issues.push(`items[${i}].dailyKind inválido: ${JSON.stringify(it.dailyKind)}`);
    }
  });
  return issues;
}

function validateReservationsConfig(c) {
  if (!c || typeof c !== 'object') return [`resposta não é objecto: ${JSON.stringify(c)}`];
  const issues = [];
  for (const k of ['protectionEnabled', 'paused', 'requireCheck']) {
    if (!(k in c)) issues.push(`falta a chave "${k}"`);
    else if (typeof c[k] !== 'boolean') issues.push(`${k} não é boolean (${JSON.stringify(c[k])})`);
  }
  if (!('closedPeriods' in c)) issues.push('falta a chave "closedPeriods"');
  else if (!Array.isArray(c.closedPeriods)) issues.push(`closedPeriods não é array (${typeof c.closedPeriods})`);
  return issues;
}

const MAX_ISSUES = 6;

function checkForm(results, name, issues) {
  if (!issues.length) {
    results.push({ name, ok: true });
    return;
  }
  // Cap para o log continuar legível quando a forma está muito errada: o que
  // interessa é o nome das primeiras chaves, não 60 linhas de repetição.
  const shown = issues.slice(0, MAX_ISSUES).join(' | ');
  const rest = issues.length - MAX_ISSUES;
  results.push({ name, ok: false, detail: shown + (rest > 0 ? ` | (+${rest} mais)` : '') });
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
    checkForm(results, 'GET /api/reservations-config FORMA (booleans + closedPeriods)', validateReservationsConfig(cfg));

    // Carta mínima para as asserts de forma terem DADOS a verificar. Sem isto o
// /api/menus devolve items:null e os arrays de /api/diarias vêm vazios — as
// asserts passariam sem ver um único item. Os ids são os reais do seed, para
// que o agenda por defeito os resolva e /api/diarias devolva refs a sério.
const SMOKE_MENU = [
  { id: 'diaria-bife-minhota', name: 'Bife à Minhota', price: 24.5, category: 'diarias', dailyKind: 'carne', description: 'Bife grelhado', imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg/1920px-Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg' },
  { id: 'diaria-pescada-minhota', name: 'Pescada à Minhota', price: 22, category: 'diarias', dailyKind: 'peixe', description: 'Pescada grelhada', imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg/1920px-Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg' },
  { id: 'diaria-frango-churrasco', name: 'Frango de Churrasco', price: 19, category: 'diarias', dailyKind: 'carne', description: 'Frango assado', imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg/1920px-Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg' },
  { id: 'diaria-sardinha-assada', name: 'Sardinha Assada', price: 16, category: 'diarias', dailyKind: 'peixe', description: 'Sardinha assada', imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg/1920px-Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg' },
  { id: 'carne-smoke', name: 'Carne de Teste', price: 30, category: 'carnes', description: 'Carne para o smoke', imageUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg/1920px-Ribeye_steak%2C_chips%2C_b%C3%A9arnaise_sauce.jpg' },
];

const putMenu = await fetch(`${base}/api/admin/menus`, {
  method: 'PUT',
  headers: headersAdmin,
  body: JSON.stringify({ items: SMOKE_MENU }),
});
if (putMenu.status === 200) {
  pass(`PUT /api/admin/menus (${SMOKE_MENU.length} itens, roundtrip local)`);
  const menusAfter = await fetch(`${base}/api/menus`).then((r) => r.json());
  checkForm(results, 'GET /api/menus FORMA (items[]|null, id/name/price/category)', validateMenus(menusAfter));
  const after = (menusAfter.items || []).length;
  after === SMOKE_MENU.length
    ? pass(`GET /api/menus devolve os ${SMOKE_MENU.length} itens publicados`)
    : fail('GET /api/menus devolve o que foi publicado', `esperado ${SMOKE_MENU.length}, obtido ${after}`);
} else {
  fail('PUT /api/admin/menus', `${putMenu.status} ${await putMenu.text()}`);
}

// /api/diarias sem ?date= usa a data de HOJE, e o agenda por defeito só serve
// pratos em dias úteis. Sem fixar a data, o smoke passava à sexta-feira e
// falhava ao sábado — um gate que falha 2 dias em 7 não é um gate.
function proximoDiaUtil() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

const DATA_DIARIA = proximoDiaUtil();
const diarias = await fetch(`${base}/api/diarias?date=${DATA_DIARIA}`).then((r) => r.json());
checkForm(results, 'GET /api/diarias FORMA (lunch/dinner são refs {id, visible})', validateDiarias(diarias));
diarias.date === DATA_DIARIA && diarias.hasSchedule === true
  ? pass(`GET /api/diarias devolve o dia pedido e tem agenda (${DATA_DIARIA})`)
  : fail('GET /api/diarias: date/hasSchedule', `pedido ${DATA_DIARIA}, obtido date=${diarias.date} hasSchedule=${diarias.hasSchedule}`);
const refCount = (diarias.lunch || []).length + (diarias.dinner || []).length;
refCount > 0
  ? pass(`GET /api/diarias devolve ${refCount} refs resolvidas contra a carta`)
  : fail('GET /api/diarias devolve refs', `lunch/dinner vazios em ${DATA_DIARIA} com ${SMOKE_MENU.length} itens publicados`);
const allRefs = [...(diarias.lunch || []), ...(diarias.dinner || [])].every((r) => typeof r.id === 'string' && !('price' in r));
allRefs
  ? pass('GET /api/diarias: refs sem price/name (trava a regressão do crash)')
  : fail('refs com campos de MenuItem', JSON.stringify([...(diarias.lunch || []), ...(diarias.dinner || [])]));

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