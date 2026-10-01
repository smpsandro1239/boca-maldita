import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * O browser autentica por cookie, por isso o servidor exige X-Csrf-Token em TODA
 * mutacao admin (ver auth.ts). Sem esse header, qualquer PUT/POST/DELETE falha com
 * "Token CSRF invalido". Este teste varre o cliente para impedir que um
 * request() de escrita novo fique sem o header.
 */
describe('api.ts mutations carry the CSRF header', () => {
  const source = readFileSync(new URL('./api.ts', import.meta.url), 'utf8');

  // Cada bloco de funcao exportada, com o nome e o corpo.
  const functions = [...source.matchAll(/export (?:async )?function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)].map(
    (match) => ({ name: match[1], body: match[2] }),
  );

  it('encontra as funcoes de escrita conhecidas', () => {
    const names = functions.map((f) => f.name);
    for (const expected of ['saveAdminMenus', 'resetAdminMenus', 'deleteAdminDiaria', 'deleteAdminReservation']) {
      expect(names).toContain(expected);
    }
  });

  it('toda mutacao admin envia X-Csrf-Token', () => {
    const offenders: string[] = [];
    for (const fn of functions) {
      const mutates = /method:\s*'(POST|PUT|PATCH|DELETE)'/.test(fn.body);
      if (!mutates) continue;
      if (!/mutationHeaders\(\)/.test(fn.body)) offenders.push(`${fn.name} (${fn.body.match(/method:\s*'(\w+)'/)![1]})`);
    }
    expect(offenders).toEqual([]);
  });
});