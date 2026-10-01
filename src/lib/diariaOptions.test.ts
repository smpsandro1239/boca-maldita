import { describe, expect, it } from 'vitest';
import { MENU_ITEMS } from '../data/menuData';
import { buildDiariaOptions, buildDiariaOptionsWithCurrent } from './diariaOptions';

const dailyIds = MENU_ITEMS.filter((i) => i.category === 'diarias').map((i) => i.id);

describe('buildDiariaOptions', () => {
  it('as 4 diarias seed estao marcadas como carne ou peixe', () => {
    const kinds = MENU_ITEMS.filter((i) => i.category === 'diarias').map((i) => i.dailyKind);
    expect(kinds.filter(Boolean)).toHaveLength(dailyIds.length);
    expect(kinds.filter((k) => k === 'carne')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'peixe')).toHaveLength(2);
  });

it('nenhuma diaria aparece nos dois lados ao mesmo tempo', () => {
    const meat = buildDiariaOptions(MENU_ITEMS, 'meat').map((i) => i.id);
    const fish = buildDiariaOptions(MENU_ITEMS, 'fish').map((i) => i.id);
    for (const item of MENU_ITEMS.filter((i) => i.category === 'diarias' && i.dailyKind)) {
      const inMeat = meat.includes(item.id);
      const inFish = fish.includes(item.id);
      expect(inMeat !== inFish).toBe(true);
    }
  });

  it('a lista de carne nao contem itens de mar, e a de peixe nao contem carnes', () => {
    const meat = buildDiariaOptions(MENU_ITEMS, 'meat');
    const fish = buildDiariaOptions(MENU_ITEMS, 'fish');
    expect(meat.some((i) => i.category === 'mar')).toBe(false);
    expect(fish.some((i) => i.category === 'carnes')).toBe(false);
    for (const item of meat.filter((i) => i.category === 'diarias')) {
      expect(item.dailyKind).toBe('carne');
    }
    for (const item of fish.filter((i) => i.category === 'diarias')) {
      expect(item.dailyKind).toBe('peixe');
    }
  });

  it('as 4 diarias seed aparecem todas em algum dos lados', () => {
    const ids = [...buildDiariaOptions(MENU_ITEMS, 'meat'), ...buildDiariaOptions(MENU_ITEMS, 'fish')].map((i) => i.id);
    for (const id of dailyIds) {
      expect(ids).toContain(id);
    }
  });

  it('uma diaria sem dailyKind definido aparece nos dois lados em vez de desaparecer', () => {
    const items = [...MENU_ITEMS, { ...MENU_ITEMS[0], id: 'sem-tipo', category: 'diarias' as const, dailyKind: undefined }];
    expect(buildDiariaOptions(items, 'meat').map((i) => i.id)).toContain('sem-tipo');
    expect(buildDiariaOptions(items, 'fish').map((i) => i.id)).toContain('sem-tipo');
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