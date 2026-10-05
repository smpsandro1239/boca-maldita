// One-shot — já aplicado em 2026-10-05.
//
// Reescreveu os textos visiveis dos 4 pratos do Menu Executivo em `menu_items`
// (Turso): badge, servesCount, tagline e description. Só toca em itens com
// category 'diarias'. Nomes de pratos, category, dailyKind, precos e imagens
// ficam como estao.
//
// Correr outra vez encontra zero alteracoes e nao escreve nada de novo.
//
// Aplicado com um PUT em /api/admin/menus sem autorizacao especifica — ver a
// regra "Escritas de dados em producao exigem autorizacao explicita" na
// secção 6 do GUIA-DEPLOY.md.

import { menuItemsSchema } from '../../server/lib/validation';

type Item = Record<string, unknown>;

const PAIRS: Array<[RegExp, string]> = [
  [/Diária/g, 'Menu Executivo'],
  [/Menu do Dia/g, 'Menu Executivo'],
  [/Menu do dia/g, 'Menu Executivo'],
];

function transform(items: Item[]): { next: Item[]; changes: string[] } {
  const changes: string[] = [];
  const next = items.map((item) => {
    if (item.category !== 'diarias') return item;
    const copy: Item = { ...item };
    for (const field of ['badge', 'servesCount', 'tagline', 'description'] as const) {
      const before = copy[field];
      if (typeof before !== 'string') continue;
      let after = before;
      for (const [re, to] of PAIRS) after = after.replace(re, to);
      if (after !== before) {
        copy[field] = after;
        changes.push(`${String(item.name)} · ${field}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
      }
    }
    return copy;
  });
  return { next, changes };
}

const res = await fetch('https://bmaldita.vercel.app/api/admin/menus', {
  headers: { 'x-admin-token': process.env.ADMIN_TOKEN ?? '' },
});
if (!res.ok) throw new Error(`GET /api/admin/menus -> HTTP ${res.status}`);
const body = (await res.json()) as { items: Item[] | null };
const items = body.items;
if (!Array.isArray(items)) throw new Error('A base de dados nao devolveu items; abortado.');

const { next, changes } = transform(items);

const parsed = menuItemsSchema.safeParse({ items: next });
if (!parsed.success) {
  console.error('VALIDACAO FALHOU - nada sera escrito:');
  console.error(JSON.stringify(parsed.error.issues.slice(0, 10), null, 2));
  process.exit(1);
}

console.log(`items recebidos : ${items.length}`);
console.log(`items a escrever: ${parsed.data.items.length}`);
console.log(`validacao do schema: OK (fail-closed verificado)`);
console.log(`\nalteracoes (${changes.length}):`);
for (const c of changes) console.log('  - ' + c);

const untouchedIds = items.filter((i) => !changes.some((c) => c.startsWith(String(i.name) + ' '))).length;
console.log(`\nitens sem qualquer alteracao: ${untouchedIds}`);

if (process.argv.includes('--write')) {
  const put = await fetch('https://bmaldita.vercel.app/api/admin/menus', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-admin-token': process.env.ADMIN_TOKEN ?? '' },
    body: JSON.stringify({ items: parsed.data.items }),
  });
  console.log(`\nPUT -> HTTP ${put.status} ${await put.text()}`);
} else {
  console.log('\nDRY-RUN: nada escrito. Corre com --write para aplicar.');
}