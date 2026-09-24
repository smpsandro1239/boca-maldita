import { describe, expect, it } from 'vitest';
import { findBlockedPeriod, formatClosedPeriod } from './closedDays';
import type { PublicClosedPeriod } from '../types';

describe('findBlockedPeriod', () => {
  it('returns null for empty date and empty periods', () => {
    expect(findBlockedPeriod('', [])).toBeNull();
    expect(findBlockedPeriod('2026-09-24', [])).toBeNull();
  });

  it('blocks a single day (repeat none)', () => {
    const period: PublicClosedPeriod = { title: 'Férias de Verão', startDate: '2026-09-30', repeat: 'none' };
    expect(findBlockedPeriod('2026-09-30', [period])).toEqual({ title: 'Férias de Verão', startDate: '2026-09-30', repeat: 'none' });
    expect(findBlockedPeriod('2026-10-01', [period])).toBeNull();
  });

  it('blocks a date range (repeat none)', () => {
    const period: PublicClosedPeriod = { title: 'Fecho de Manutenção', startDate: '2026-10-05', endDate: '2026-10-10', repeat: 'none' };
    expect(findBlockedPeriod('2026-10-05', [period])).not.toBeNull();
    expect(findBlockedPeriod('2026-10-07', [period])).not.toBeNull();
    expect(findBlockedPeriod('2026-10-10', [period])).not.toBeNull();
    expect(findBlockedPeriod('2026-10-11', [period])).toBeNull();
  });

  it('treats an endDate before startDate as a single day', () => {
    const period: PublicClosedPeriod = { title: 'Invalida', startDate: '2026-10-05', endDate: '2026-10-01', repeat: 'none' };
    expect(findBlockedPeriod('2026-10-05', [period])).not.toBeNull();
    expect(findBlockedPeriod('2026-10-01', [period])).toBeNull();
  });

  it('blocks weekly recurrence on the matching weekday', () => {
    const weekly: PublicClosedPeriod = { title: 'Segunda de Encerramento', startDate: '2026-09-21', repeat: 'weekly' };
    expect(findBlockedPeriod('2026-09-21', [weekly])).not.toBeNull();
    expect(findBlockedPeriod('2026-09-28', [weekly])).not.toBeNull();
    expect(findBlockedPeriod('2026-09-25', [weekly])).toBeNull();
  });

  it('blocks weekly recurrence spanning multiple days', () => {
    const weekly: PublicClosedPeriod = { title: 'Semanada', startDate: '2026-09-21', endDate: '2026-09-23', repeat: 'weekly' };
    expect(findBlockedPeriod('2026-09-23', [weekly])).not.toBeNull();
    expect(findBlockedPeriod('2026-09-24', [weekly])).toBeNull();
    expect(findBlockedPeriod('2026-10-05', [weekly])).not.toBeNull();
    expect(findBlockedPeriod('2026-10-08', [weekly])).toBeNull();
  });

  it('blocks yearly recurrence within the same months', () => {
    const yearly: PublicClosedPeriod = { title: 'Aniversário do Espaço', startDate: '2026-06-01', endDate: '2026-06-02', repeat: 'yearly' };
    expect(findBlockedPeriod('2027-06-01', [yearly])).not.toBeNull();
    expect(findBlockedPeriod('2027-06-02', [yearly])).not.toBeNull();
    expect(findBlockedPeriod('2027-06-03', [yearly])).toBeNull();
  });

  it('blocks yearly recurrence crossing the year boundary', () => {
    const yearly: PublicClosedPeriod = { title: 'Fecho de Fim de Ano', startDate: '2026-12-28', endDate: '2027-01-03', repeat: 'yearly' };
    expect(findBlockedPeriod('2026-12-29', [yearly])).not.toBeNull();
    expect(findBlockedPeriod('2027-01-01', [yearly])).not.toBeNull();
    expect(findBlockedPeriod('2027-01-10', [yearly])).toBeNull();
  });

  it('returns the first matching blocked period', () => {
    const a: PublicClosedPeriod = { title: 'Primeira', startDate: '2026-11-01', endDate: '2026-11-05', repeat: 'none' };
    const b: PublicClosedPeriod = { title: 'Segunda', startDate: '2026-11-04', endDate: '2026-11-08', repeat: 'none' };
    expect(findBlockedPeriod('2026-11-04', [a, b])?.title).toBe('Primeira');
  });
});

describe('formatClosedPeriod', () => {
  it('formats a single-day period', () => {
    const text = formatClosedPeriod({ title: 'X', startDate: '2026-09-30', repeat: 'none' });
    expect(text).toContain('2026');
  });

  it('uses an arrow for ranges', () => {
    const text = formatClosedPeriod({ title: 'X', startDate: '2026-10-05', endDate: '2026-10-10', repeat: 'none' });
    expect(text).toContain('2026');
    expect(text).toContain('→');
  });

  it('marks weekly recurrence', () => {
    const text = formatClosedPeriod({ title: 'X', startDate: '2026-09-21', repeat: 'weekly' });
    expect(text).toContain('todos os');
  });

  it('marks yearly recurrence', () => {
    const text = formatClosedPeriod({ title: 'X', startDate: '2026-12-28', endDate: '2027-01-03', repeat: 'yearly' });
    expect(text).toContain('todos os anos');
  });
});