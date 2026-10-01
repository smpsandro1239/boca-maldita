import { describe, expect, it } from 'vitest';
import {
  buildDefaultDiariaSchedules,
  currentMeal,
  diffDays,
  resolveDiariasDay,
  scheduleAppliesOn,
  todayKey,
  type DiariaSchedule,
} from './diarias';

const menuItemsForSeed = [
  { id: 'diaria-bife-minhota' },
  { id: 'diaria-pescada-minhota' },
  { id: 'diaria-frango-churrasco' },
  { id: 'diaria-sardinha-assada' },
];

const baseSchedule = (overrides: Partial<DiariaSchedule> = {}): DiariaSchedule => ({
  id: 's1',
  anchorDate: '2026-10-05',
  repeat: 'weekly',
  activeFrom: '2026-10-05',
  activeTo: null,
  lunch: true,
  dinner: true,
  itemIds: ['a', 'b'],
  ...overrides,
});

describe('scheduleAppliesOn', () => {
  it('aplica day exactly for repeat none', () => {
    const schedule = baseSchedule({ repeat: 'none', anchorDate: '2026-10-05' });
    expect(scheduleAppliesOn(schedule, '2026-10-05')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-10-12')).toBe(false);
  });

  it('aplica todas as semanas no mesmo dia da semana', () => {
    const schedule = baseSchedule({ repeat: 'weekly', anchorDate: '2026-10-05' });
    expect(scheduleAppliesOn(schedule, '2026-10-05')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-10-12')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-10-19')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-10-06')).toBe(false);
  });

  it('aplica quinzenalmente (a cada 14 dias)', () => {
    const schedule = baseSchedule({ repeat: 'biweekly', anchorDate: '2026-10-05' });
    expect(scheduleAppliesOn(schedule, '2026-10-05')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-10-19')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-11-02')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-10-12')).toBe(false);
  });

  it('aplica mensalmente no mesmo dia do mês', () => {
    const schedule = baseSchedule({ repeat: 'monthly', anchorDate: '2026-10-05' });
    expect(scheduleAppliesOn(schedule, '2026-10-05')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-11-05')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-12-05')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-10-12')).toBe(false);
  });

  it('respeita a janela de validade ativa', () => {
    const schedule = baseSchedule({ repeat: 'weekly', activeFrom: '2026-10-05', activeTo: '2026-10-31' });
    expect(scheduleAppliesOn(schedule, '2026-10-12')).toBe(true);
    expect(scheduleAppliesOn(schedule, '2026-11-09')).toBe(false);
  });

  it('nunca aplica antes da data âncora', () => {
    const schedule = baseSchedule({ repeat: 'weekly', anchorDate: '2026-10-05' });
    expect(scheduleAppliesOn(schedule, '2026-09-28')).toBe(false);
  });
});

describe('resolveDiariasDay', () => {
  const menuItems = [
    { id: 'a', name: 'Bife' },
    { id: 'b', name: 'Frango' },
    { id: 'c', name: 'Pescada' },
    { id: 'd', name: 'Sardinha' },
    { id: 'e', name: 'Secretos' },
  ];

  it('resolve carne+peixe para almoço e jantar com base no histórico semanal', () => {
    const schedules: DiariaSchedule[] = [
      baseSchedule({
        id: 'l1',
        repeat: 'weekly',
        anchorDate: '2026-10-05',
        lunch: true,
        dinner: false,
        itemIds: ['a', 'b', 'c', 'd'],
      }),
    ];
    const day = resolveDiariasDay(schedules, menuItems, '2026-10-12');
    expect(day.hasSchedule).toBe(true);
    expect(day.lunch.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(day.dinner).toEqual([]);
    expect(day.servedMeals).toEqual({ lunch: true, dinner: false });
  });

  it('suporta 2 pratos de carne + 2 de peixe por dia com pratos diferentes por dia da semana', () => {
    const schedules: DiariaSchedule[] = [
      baseSchedule({ id: 'mon', repeat: 'none', anchorDate: '2026-10-05', itemIds: ['a', 'b', 'c', 'd'] }),
      baseSchedule({ id: 'tue', repeat: 'none', anchorDate: '2026-10-06', itemIds: ['e', 'b', 'c', 'd'] }),
    ];
    const monday = resolveDiariasDay(schedules, menuItems, '2026-10-05');
    const tuesday = resolveDiariasDay(schedules, menuItems, '2026-10-06');
    expect(monday.lunch.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(tuesday.lunch.map((i) => i.id)).toEqual(['e', 'b', 'c', 'd']);
  });

  it('ignora ids inexistentes e faz deduplicação', () => {
    const schedules: DiariaSchedule[] = [
      baseSchedule({ id: 'x1', repeat: 'none', anchorDate: '2026-10-05', itemIds: ['a', 'ghost', 'a', 'b'] }),
    ];
    const day = resolveDiariasDay(schedules, menuItems, '2026-10-05');
    expect(day.lunch.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('sem agendamento devolve lista vazia e hasSchedule false', () => {
    const day = resolveDiariasDay([], menuItems, '2026-10-05');
    expect(day.hasSchedule).toBe(false);
    expect(day.lunch).toEqual([]);
    expect(day.dinner).toEqual([]);
  });

  it('divide almoço e jantar quando ambos servidos', () => {
    const schedules: DiariaSchedule[] = [
      baseSchedule({ repeat: 'none', anchorDate: '2026-10-05', lunch: true, dinner: true, itemIds: ['a', 'c'] }),
    ];
    const day = resolveDiariasDay(schedules, menuItems, '2026-10-05');
    expect(day.lunch.map((i) => i.id)).toEqual(['a', 'c']);
    expect(day.dinner.map((i) => i.id)).toEqual(['a', 'c']);
    expect(day.servedMeals).toEqual({ lunch: true, dinner: true });
  });
});

describe('currentMeal', () => {
  it('antes das 16h de Lisboa é almoço', () => {
    // Inverno em Lisboa = UTC+0
    expect(currentMeal(new Date('2026-01-15T11:30:00Z'))).toBe('lunch');
  });

  it('após as 16h de Lisboa é jantar', () => {
    expect(currentMeal(new Date('2026-01-15T20:00:00Z'))).toBe('dinner');
  });

  it('usa Europe/Lisbon e não o fuso do servidor (verão = UTC+1)', () => {
    // 15:30 UTC = 16:30 em Lisboa -> já é jantar, apesar de ser 15h no servidor
    expect(currentMeal(new Date('2026-07-15T15:30:00Z'))).toBe('dinner');
    // 00:30 UTC = 01:30 em Lisboa -> ainda é almoço, apesar de ser noite no servidor
    expect(currentMeal(new Date('2026-07-15T23:30:00Z'))).toBe('lunch');
  });
});

describe('todayKey', () => {
  it('devolve a data de Lisboa, não a do servidor', () => {
    // 23:30 UTC de 15/07 = 00:30 de 16/07 em Lisboa
    expect(todayKey(new Date('2026-07-15T23:30:00Z'))).toBe('2026-07-16');
    expect(todayKey(new Date('2026-01-15T11:30:00Z'))).toBe('2026-01-15');
  });
});

describe('buildDefaultDiariaSchedules', () => {
  it('sem 5 agendamentos semanais, de segunda a sexta', () => {
    const schedules = buildDefaultDiariaSchedules();
    expect(schedules).toHaveLength(5);
    expect(schedules.map((s) => s.anchorDate)).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
      '2024-01-05',
    ]);
    for (const schedule of schedules) {
      expect(schedule.repeat).toBe('weekly');
      expect(schedule.lunch).toBe(true);
      expect(schedule.dinner).toBe(false);
      expect(schedule.activeTo).toBeNull();
      expect(schedule.itemIds).toHaveLength(4);
    }
  });

  it('cobre segunda a sexta e exclui fim de semana', () => {
    const schedules = buildDefaultDiariaSchedules();
    // 2026-10-05 é uma segunda-feira
    expect(resolveDiariasDay(schedules, menuItemsForSeed, '2026-10-05').hasSchedule).toBe(true);
    expect(resolveDiariasDay(schedules, menuItemsForSeed, '2026-10-09').hasSchedule).toBe(true);
    expect(resolveDiariasDay(schedules, menuItemsForSeed, '2026-10-10').hasSchedule).toBe(false);
    expect(resolveDiariasDay(schedules, menuItemsForSeed, '2026-10-11').hasSchedule).toBe(false);
  });

  it('serve as 4 diárias ao almoço e nada ao jantar', () => {
    const day = resolveDiariasDay(buildDefaultDiariaSchedules(), menuItemsForSeed, '2026-10-05');
    expect(day.lunch.map((i) => i.id)).toHaveLength(4);
    expect(day.dinner).toEqual([]);
    expect(day.servedMeals).toEqual({ lunch: true, dinner: false });
  });
});

describe('visibility', () => {
  it('ignora itens com visible false', () => {
    const schedules: DiariaSchedule[] = [
      baseSchedule({ repeat: 'none', anchorDate: '2026-10-05', itemIds: ['a', 'b', 'c'] }),
    ];
    const day = resolveDiariasDay(schedules, [{ id: 'a' }, { id: 'b', visible: false }, { id: 'c', visible: true }], '2026-10-05');
    expect(day.lunch.map((i) => i.id)).toEqual(['a', 'c']);
  });

  it('inclui itens sem a propriedade visible (visíveis por defeito)', () => {
    const schedules: DiariaSchedule[] = [
      baseSchedule({ repeat: 'none', anchorDate: '2026-10-05', itemIds: ['a', 'b'] }),
    ];
    const day = resolveDiariasDay(schedules, [{ id: 'a' }, { id: 'b' }], '2026-10-05');
    expect(day.lunch.map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('diffDays', () => {
  it('calcula diferença em dias', () => {
    expect(diffDays('2026-10-05', '2026-10-19')).toBe(14);
    expect(diffDays('2026-10-05', '2026-10-05')).toBe(0);
  });
});