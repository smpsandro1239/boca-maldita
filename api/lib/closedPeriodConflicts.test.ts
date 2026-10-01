import { describe, expect, it } from 'vitest';
import { findClosedPeriodConflicts } from './closedPeriodConflicts';
import type { ReservationRow } from './storage';

function reservation(date: string, overrides: Partial<ReservationRow> = {}): ReservationRow {
  return {
    id: 1,
    reference: 'BM-0001',
    name: 'Cliente',
    email: 'cliente@test.pt',
    phone: '911 111 111',
    date,
    time: '20:00',
    guests: 2,
    area: 'Sala principal',
    occasion: 'Outro',
    notes: '',
    status: 'confirmed',
    ip_address: '',
    created_at: '',
    ...overrides,
  };
}

const singleDay = { start_date: '2026-10-09', end_date: null, repeat: 'none' };

describe('findClosedPeriodConflicts', () => {
  it('retorna vazio quando não há reservas no período', () => {
    const result = findClosedPeriodConflicts([reservation('2026-10-10')], singleDay);
    expect(result.total).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.dates).toEqual([]);
  });

  it('deteta reservas dentro de um único dia fechado', () => {
    const reservations = [
      reservation('2026-10-09', { reference: 'BM-0001', name: 'Ana' }),
      reservation('2026-10-09', { reference: 'BM-0002', name: 'Bruno', time: '21:30' }),
      reservation('2026-10-10', { reference: 'BM-0003', name: 'Carla' }),
    ];
    const result = findClosedPeriodConflicts(reservations, singleDay);
    expect(result.total).toBe(2);
    expect(result.dates).toEqual([{ date: '2026-10-09', count: 2 }]);
    expect(result.rows.map((r) => r.reference)).toEqual(['BM-0001', 'BM-0002']);
  });

  it('agrupa por data e preserva a ordem por data/hora', () => {
    const reservations = [
      reservation('2026-10-09', { reference: 'BM-0001', time: '21:00' }),
      reservation('2026-10-09', { reference: 'BM-0002', time: '19:30' }),
      reservation('2026-10-10', { reference: 'BM-0003', time: '20:00' }),
      reservation('2026-10-10', { reference: 'BM-0004', time: '20:30' }),
    ];
    const result = findClosedPeriodConflicts(reservations, {
      start_date: '2026-10-09',
      end_date: '2026-10-10',
      repeat: 'none',
    });
    expect(result.dates).toEqual([
      { date: '2026-10-09', count: 2 },
      { date: '2026-10-10', count: 2 },
    ]);
    expect(result.rows[0].reference).toBe('BM-0002');
    expect(result.rows[1].reference).toBe('BM-0001');
  });

  it('considera datas de reserva armazenadas com sufixo temporal (Turso "YYYY-MM-DD HH:MM")', () => {
    const result = findClosedPeriodConflicts([reservation('2026-10-09 19:30:00')], singleDay);
    expect(result.total).toBe(1);
    expect(result.rows[0].date).toBe('2026-10-09');
  });

  it('respeita a repetição semanal', () => {
    // 2026-10-09 foi uma sexta-feira. A repetição semanal nessa data bloqueia todas as sextas.
    const weekly = { start_date: '2026-10-09', end_date: null, repeat: 'weekly' };
    const reservations = [
      reservation('2026-10-16', { reference: 'BM-0001' }), // sexta-feira seguinte
      reservation('2026-10-17', { reference: 'BM-0002' }), // sábado — livre
    ];
    const result = findClosedPeriodConflicts(reservations, weekly);
    expect(result.total).toBe(1);
    expect(result.rows[0].reference).toBe('BM-0001');
  });

  it('respeita a repetição anual (incluindo viragem de ano)', () => {
    const yearly = { start_date: '2026-12-24', end_date: '2026-12-25', repeat: 'yearly' };
    const reservations = [
      reservation('2025-12-25', { reference: 'BM-0001' }),
      reservation('2027-12-24', { reference: 'BM-0002' }),
      reservation('2026-06-01', { reference: 'BM-0003' }),
    ];
    const result = findClosedPeriodConflicts(reservations, yearly);
    expect(result.total).toBe(2);
    expect(result.rows.map((r) => r.reference)).toEqual(['BM-0001', 'BM-0002']);
  });

  it('período sem fim bloqueia apenas a data de início no modo simples', () => {
    const reservations = [reservation('2026-10-09'), reservation('2026-10-10')];
    const result = findClosedPeriodConflicts(reservations, { start_date: '2026-10-09', end_date: null, repeat: 'none' });
    expect(result.total).toBe(1);
  });
});