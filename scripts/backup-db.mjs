// Backup de seguranca da BD de producao — SO' LEITURA (apenas GET).
// Uso: node --env-file=.env scripts/backup-db.mjs
// Sair com codigo != 0 se algum endpoint falhar (nunca gravar backup parcial).

const BASE = (process.env.BACKUP_BASE_URL ?? 'https://bmaldita.vercel.app').replace(/\/$/, '');
const TOKEN = (process.env.ADMIN_TOKEN ?? '').trim();

if (!TOKEN) {
  console.error('ADMIN_TOKEN em falta — corre com --env-file=.env');
  process.exit(1);
}

const ADMIN_ENDPOINTS = [
  ['menus', '/api/admin/menus'],
  ['reservations', '/api/admin/reservations'],
  ['contacts', '/api/admin/contacts'],
  ['newsletter', '/api/admin/newsletter'],
  ['reviews', '/api/admin/reviews'],
  ['closedDays', '/api/admin/closed-days'],
  ['reservationProtection', '/api/admin/reservation-protection'],
  ['diarias', '/api/admin/diarias'],
  ['assets', '/api/admin/assets'],
];

// site-content nao tem GET admin (so' PUT) e reservations-config e publico.
const PUBLIC_ENDPOINTS = [
  ['siteContent', '/api/site-content'],
  ['reservationsConfig', '/api/reservations-config'],
];

function countRecords(data) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === 'object') {
    const arrays = Object.values(data).filter(Array.isArray);
    if (arrays.length === 1) return arrays[0].length;
    if (arrays.length > 1) return arrays.map((a) => a.length).join('+');
    return 'objeto';
  }
  return typeof data;
}

const backup = {};
const counts = [];
const failures = [];

async function grab(key, path, admin) {
  const headers = { Accept: 'application/json' };
  if (admin) headers['x-admin-token'] = TOKEN;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers });
  } catch (err) {
    failures.push(`${key} (${path}): rede — ${err.message}`);
    return;
  }
  if (!res.ok) {
    failures.push(`${key} (${path}): HTTP ${res.status}`);
    return;
  }
  let body;
  try {
    body = await res.json();
  } catch {
    failures.push(`${key} (${path}): resposta nao-JSON`);
    return;
  }
  backup[key] = body;
  counts.push([key, countRecords(body)]);
}

for (const [k, p] of ADMIN_ENDPOINTS) await grab(k, p, true);
for (const [k, p] of PUBLIC_ENDPOINTS) await grab(k, p, false);

if (failures.length) {
  console.error('BACKUP INCOMPLETO — nao foi gravado nada:\n  ' + failures.join('\n  '));
  process.exit(1);
}

const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
const file = `backups/${stamp}.json`;

const { writeFileSync } = await import('node:fs');
writeFileSync(file, JSON.stringify({ exportedAt: now.toISOString(), base: BASE, ...backup }, null, 2));

console.log(`  backup gravado: ${file}`);
console.log('  registos por endpoint:');
for (const [k, n] of counts) console.log(`    ${k.padEnd(24)} ${n}`);
console.log(`  endpoints OK: ${counts.length}/${ADMIN_ENDPOINTS.length + PUBLIC_ENDPOINTS.length}`);
