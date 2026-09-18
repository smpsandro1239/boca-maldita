import { createServer } from 'node:http';

const mod = await import(new URL('../api/index.js', import.meta.url));
const app = mod.default ?? mod;
let handler = app;
if (app && app.app) handler = app.app;
if (typeof handler !== 'function') {
  console.error('No express app found in api/index.js. Exports:', Object.keys(app || {}));
  process.exit(1);
}

const server = createServer(handler);
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  const base = (p) => `http://127.0.0.1:${port}${p}`;
  const token = process.env.ADMIN_TOKEN ?? '';

  async function req(method, path, body, headers = {}) {
    const res = await fetch(base(path), {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { }
    return { status: res.status, json };
  }

  const results = [];

  async function run() {

  const h = await req('GET', '/api/health');
  results.push(['GET /api/health', h.status, JSON.stringify(h.json)]);

  const menus = await req('GET', '/api/menus');
  results.push(['GET /api/menus (sem dados)', menus.status, JSON.stringify(menus.json)]);

  const content = await req('GET', '/api/site-content');
  results.push(['GET /api/site-content', content.status, JSON.stringify(content.json)]);

  const putMenus = await req('PUT', '/api/admin/menus', { items: [{ id: 'teste-1', name: 'Teste', price: 10, currency: '€', category: 'carnes', description: 'prato de teste', imageUrl: '', visible: true }] }, { 'X-Admin-Token': token });
  results.push(['PUT /api/admin/menus', putMenus.status, JSON.stringify(putMenus.json)]);

  const menus2 = await req('GET', '/api/menus');
  results.push(['GET /api/menus (com dados)', menus2.status, JSON.stringify(menus2.json)]);

  const putBad = await req('PUT', '/api/admin/menus', { items: [{ name: 'sem id' }] }, { 'X-Admin-Token': token });
  results.push(['PUT menus inválido', putBad.status, JSON.stringify(putBad.json)]);

  const noToken = await req('GET', '/api/admin/reservations');
  results.push(['GET /api/admin/reservations sem token', noToken.status, JSON.stringify(noToken.json)]);

  const resv = await req('POST', '/api/reservations', { name: 'Ana', email: 'ana@example.com', phone: '912345678', date: '2027-01-10', time: '20:00', guests: 2, area: 'salão', occasion: 'jantar' });
  results.push(['POST /api/reservations', resv.status, JSON.stringify(resv.json)]);

  const resvList = await req('GET', '/api/admin/reservations', null, { 'X-Admin-Token': token });
  results.push(['GET /api/admin/reservations', resvList.status, JSON.stringify(resvList.json)]);

  const putContent = await req('PUT', '/api/admin/site-content', { contactEmail: 'novo@example.com', phone: '253 000 000', address: '', hours: '', headline: '', heroSubtitle: '', aboutTitle: '', aboutText: '', instagram: '', facebook: '', videoUrl: '' }, { 'X-Admin-Token': token });
  results.push(['PUT /api/admin/site-content', putContent.status, JSON.stringify(putContent.json)]);

  const content2 = await req('GET', '/api/site-content');
  results.push(['GET /api/site-content depois', content2.status, JSON.stringify(content2.json)]);

  const assets = await req('GET', '/api/admin/assets');
  results.push(['GET /api/admin/assets', assets.status, JSON.stringify(assets.json)]);

  const putAssets = await req('PUT', '/api/admin/assets', { overrides: [{ id: 'logo-brand', url: 'https://example.com/logo.png', scale: 1.4, px: 30, py: 60 }] }, { 'X-Admin-Token': token });
  results.push(['PUT /api/admin/assets com zoom', putAssets.status, JSON.stringify(putAssets.json)]);

  const assets2 = await req('GET', '/api/admin/assets');
  results.push(['GET /api/admin/assets depois', assets2.status, JSON.stringify(assets2.json)]);

  const del = await req('DELETE', '/api/admin/reservations/1', null, { 'X-Admin-Token': token });
  results.push(['DELETE /api/admin/reservations/1', del.status, JSON.stringify(del.json)]);

  const resvList2 = await req('GET', '/api/admin/reservations', null, { 'X-Admin-Token': token });
  results.push(['GET /api/admin/reservations depois delete', resvList2.status, JSON.stringify(resvList2.json)]);

  for (const [name, status, body] of results) {
    console.log(`${status >= 400 ? '✗' : '✓'} ${name.padEnd(38)} ${status} ${body}`);
  }

  const realFails = results.filter(([name, s]) => {
    const expected = {
      'PUT menus inválido': 400,
      'GET /api/admin/reservations sem token': 401,
    };
    return expected[name] !== s && s >= 400;
  });
  console.log(realFails.length === 0 ? '\nOK — todos os endpoints esperados funcionam.' : `\nFALHAS: ${realFails.map(([n]) => n).join(', ')}`);
  server.close();
  process.exit(realFails.length === 0 ? 0 : 1);
  }

  void run();
});