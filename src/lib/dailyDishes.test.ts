import { describe, expect, it } from 'vitest';
import { MENU_ITEMS } from '../data/menuData';
import type { MenuItem } from '../types';
import { pickDailyDishes, resolveDailyDishes } from './dailyDishes';

const dailyItems = MENU_ITEMS.filter((i) => i.category === 'diarias');

/** O que o servidor devolve de facto: {id, visible}, sem preco nem nome. */
const refs = dailyItems.map((i) => ({ id: i.id, visible: true }));

describe('resolveDailyDishes', () => {
  it('transforma as referencias do servidor em pratos completos', () => {
    const resolved = resolveDailyDishes(refs, MENU_ITEMS);
    expect(resolved).toHaveLength(dailyItems.length);
    for (const item of resolved) {
      expect(typeof item.price).toBe('number');
      expect(typeof item.name).toBe('string');
      expect(item.name.length).toBeGreaterThan(0);
    }
  });

  it('preserva a ordem do agendamento', () => {
    const reversed = [...dailyItems].reverse().map((i) => ({ id: i.id }));
    expect(resolveDailyDishes(reversed, MENU_ITEMS).map((i) => i.id)).toEqual(reversed.map((i) => i.id));
  });

  it('ignora referencias desconhecidas, ocultas e repetidas', () => {
    const resolved = resolveDailyDishes(
      [{ id: dailyItems[0].id }, { id: 'nao-existe' }, { id: dailyItems[0].id }, { id: dailyItems[1].id, visible: false }],
      MENU_ITEMS,
    );
    expect(resolved.map((i) => i.id)).toEqual([dailyItems[0].id]);
  });

  it('nao devolve prato oculto na carta', () => {
    const hidden: MenuItem = { ...dailyItems[0], visible: false };
    const menu = [...MENU_ITEMS.filter((i) => i.id !== dailyItems[0].id), hidden];
    expect(resolveDailyDishes([{ id: dailyItems[0].id }], menu)).toEqual([]);
  });

  it('devolve lista vazia sem referencias', () => {
    expect(resolveDailyDishes([], MENU_ITEMS)).toEqual([]);
    expect(resolveDailyDishes(undefined, MENU_ITEMS)).toEqual([]);
  });
});

describe('pickDailyDishes', () => {
  it('usa os agendados quando existem', () => {
    expect(pickDailyDishes(refs.slice(0, 2), MENU_ITEMS).map((i) => i.id)).toEqual(dailyItems.slice(0, 2).map((i) => i.id));
  });

  it('cai nos diarios da carta quando nao ha agendamento', () => {
    const noDaily: MenuItem[] = MENU_ITEMS.filter((i) => i.category !== 'diarias');
    const picked = pickDailyDishes([], noDaily);
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((i) => typeof i.price === 'number')).toBe(true);
  });

  it('cai nos pratos de origem se a carta nao tiver diarios', () => {
    const picked = pickDailyDishes([], []);
    expect(picked.map((i) => i.id)).toEqual(dailyItems.map((i) => i.id));
  });

  it('respeita o limite e nunca devolve mais de 4 pratos', () => {
    expect(pickDailyDishes(refs, MENU_ITEMS).length).toBeLessThanOrEqual(4);
  });

  it('o resultado e sempre renderizavel: preco numerico em todos os pratos', () => {
    for (const input of [refs, [], undefined]) {
      for (const item of pickDailyDishes(input, MENU_ITEMS)) {
        expect(() => item.price.toFixed(2)).not.toThrow();
        expect(() => item.name.toLowerCase()).not.toThrow();
      }
    }
  });
});