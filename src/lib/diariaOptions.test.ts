import { describe, expect, it } from 'vitest';
import { MENU_ITEMS } from '../data/menuData';
import { buildDiariaOptions, buildDiariaOptionsWithCurrent } from './diariaOptions';

const dailyIds = MENU_ITEMS.filter((i) => i.category === 'diarias').map((i) => i.id);

describe('buildDiariaOptions', () => {
  it('inclui as diarias tanto em carne como em peixe', () => {
    for (const id of dailyIds) {
      expect(buildDiariaOptions(MENU_ITEMS, 'meat').map((i) => i.id)).toContain(id);
      expect(buildDiariaOptions(MENU_ITEMS, 'fish').map((i) => i.id)).toContain(id);
    }
  });

  it('inclui as categorias normais: carnes em carne, mar em peixe', () => {
    expect(buildDiariaOptions(MENU_ITEMS, 'meat').some((i) => i.category === 'carnes')).toBe(true);
    expect(buildDiariaOptions(MENU_ITEMS, 'fish').some((i) => i.category === 'mar')).toBe(true);
  });

  it('exclui sobremesas e bebidas dos dois lados', () => {
    for (const kind of ['meat', 'fish'] as const) {
      const ids = buildDiariaOptions(MENU_ITEMS, kind).map((i) => i.category);
      expect(ids).not.toContain('sobremesas');
      expect(ids).not.toContain('vinhos');
      expect(ids).not.toContain('bebidas');
      expect(ids).not.toContain('entradas');
    }
  });

  it('nao devolve ids duplicados', () => {
    const doubled = [...MENU_ITEMS, ...MENU_ITEMS];
    for (const kind of ['meat', 'fish'] as const) {
      const ids = buildDiariaOptions(doubled, kind).map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('buildDiariaOptionsWithCurrent', () => {
  it('garante que um id guardado no agendamento tem sempre opcao (regressao do placeholder)', () => {
    const options = buildDiariaOptionsWithCurrent(MENU_ITEMS, 'meat', dailyIds);
    for (const id of dailyIds) {
      expect(options.some((o) => o.id === id)).toBe(true);
    }
  });

  it('inclui ids desconhecidos em vez de os esconder', () => {
    const options = buildDiariaOptionsWithCurrent(MENU_ITEMS, 'meat', ['prato-apagado']);
    expect(options.some((o) => o.id === 'prato-apagado')).toBe(true);
  });

  it('nao duplica ids que ja existem nas opcoes', () => {
    const options = buildDiariaOptionsWithCurrent(MENU_ITEMS, 'fish', dailyIds);
    const ids = options.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ignora ids vazios', () => {
    const options = buildDiariaOptionsWithCurrent(MENU_ITEMS, 'meat', ['', '']);
    expect(options.every((o) => o.id !== '')).toBe(true);
  });
});