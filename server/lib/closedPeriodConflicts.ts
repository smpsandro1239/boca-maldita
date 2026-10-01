import { isDateBlocked, type BlockedPeriodShape } from './blockedDates';
import type { ReservationRow } from './storage';

export interface ClosedPeriodConflictRow {
  reference: string;
  name: string;
  date: string;
  time: string;
  guests: number;
}

export interface ClosedPeriodConflictDates {
  total: number;
  dates: { date: string; count: number }[];
}

export interface ClosedPeriodConflicts {
  total: number;
  rows: ClosedPeriodConflictRow[];
  dates: { date: string; count: number }[];
}

function reservationDateKey(date: string): string {
  return String(date).split(/[T ]/)[0] || String(date);
}

export function findClosedPeriodConflicts(reservations: ReservationRow[], period: BlockedPeriodShape): ClosedPeriodConflicts {
  const rows = reservations
    .filter((r) => isDateBlocked(reservationDateKey(r.date), period))
    .map((r) => ({
      reference: r.reference,
      name: r.name,
      date: reservationDateKey(r.date),
      time: r.time,
      guests: r.guests,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const byDate = new Map<string, number>();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + 1);
  }
  const dates = [...byDate.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { total: rows.length, rows, dates };
}