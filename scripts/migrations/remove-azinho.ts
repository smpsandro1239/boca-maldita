// Remove "azinho" dos textos dos itens em `menu_items` (Turso).
//
// Autorizado em 2026-10-06 ("Retira azinho nao quero"). Ver a regra
// "Escritas de dados em producao exigem autorizacao explicita" na
// secção 6 do GUIA-DEPLOY.md.
//
// O mesmo texto ja foi corrigido em src/data/menuData.ts no commit
// c0f85db; isto e' a parte que o commit nao alcancou — a BD de producao,
// que e' de onde o site ao vivo le.
//
// Fail-closed: se depois da transformacao restar um unico "azinho", nao
// escreve. DRY-RUN por omissao, --write para aplicar.

import { menuItemsSchema } from '../../server/lib/validation';

type Item = Record<string, unknown>;

const PAIRS: Array<[RegExp, string]> = [
  ['grelhado na brasa de azinho com molho da casa', 'grelhado na brasa com molho da casa'],
  ['assadas em brasa de azinho com pimento assado', 'assadas em brasa com pimento assado'],
  ['assada ao osso sobre brasa lenta de azinho.', 'assada ao osso sobre brasa lenta.'],
  ['Brasa de Azinho', 'Brasa'],
  ['brasa de azinho', 'brasa'],
  ['brasas de azinho', 'brasas'],
  ['carvão vegetal de azinho nobre', 'carvão vegetal nobre'],
  ['Carvão de Azinho', 'Carvão'],
  ['carvão de azinho', 'carvão'],
].map(([from, to]) => [new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to]) as Array<
  [RegExp, string]
>;

const countAzinho = (value: unknown): number => {
  if (typeof value === 'string') return (value.match(/azinho/gi) ?? []).length;
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + countAzinho(v), 0);
  if (value && typeof value === 'object')
    return Object.values(value as Record<string, unknown>).reduce<number>((n, v) => n + countAzinho(v), 0);
  return 0;
};

function transform(items: Item[]): { next: Item[]; changes: string[] } {
  const changes: string[] = [];
  const next = items.map((item) => {
    const copy: Item = { ...item };
    for (const field of Object.keys(copy)) {
      const before = copy[field];
      if (typeof before !== 'string') continue;
      let after = before;
      for (const [re, to] of PAIRS) after = after.replace(re, to);
      if (after !== before) {
        copy[field] = after;
        changes.push(
          `${String(item.name)} · ${field}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
        );
      }
    }
    return copy;
  });
  return { next, changes };
}

const token = process.env.ADMIN_TOKEN;
if (!token) throw new Error('ADMIN_TOKEN em falta no ambiente.');

const res = await fetch('https://bmaldita.vercel.app/api/admin/menus', {
  headers: { 'x-admin-token': token },
});
if (!res.ok) throw new Error(`GET /api/admin/menus -> HTTP ${res.status}`);
const body = (await res.json()) as { items: Item[] | null };
const items = body.items;
if (!Array.isArray(items)) throw new Error('A base de dados nao devolveu items; abortado.');

const before = countAzinho(items);
const { next, changes } = transform(items);
const after = countAzinho(next);

console.log(`items recebidos        : ${items.length}`);
console.log(`azinho antes           : ${before}`);
console.log(`azinho depois          : ${after}`);
console.log(`alteracoes (${changes.length}):`);
for (const c of changes) console.log('  - ' + c);

if (after > 0) {
  console.error('\nFAIL-CLOSED: restam ' + after + ' ocorrencias de azinho. Nada sera escrito.');
  process.exit(1);
}
if (before === 0) {
  console.log('\nNada a fazer: a BD ja' + ' nao contem azinho.');
  process.exit(0);
}

const parsed = menuItemsSchema.safeParse({ items: next });
if (!parsed.success) {
  console.error('\nVALIDACAO FALHOU - nada sera escrito:');
  console.error(JSON.stringify(parsed.error.issues.slice(0, 10), null, 2));
  process.exit(1);
}
console.log(`validacao do schema    : OK`);

if (process.argv.includes('--write')) {
  const put = await fetch('https://bmaldita.vercel.app/api/admin/menus', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-admin-token': token },
    body: JSON.stringify({ items: parsed.data.items }),
  });
  console.log(`\nPUT -> HTTP ${put.status} ${await put.text()}`);
} else {
  console.log('\nDRY-RUN: nada escrito. Corre com --write para aplicar.');
}
