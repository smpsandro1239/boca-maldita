import type { ClosedPeriodRepeat, PublicClosedPeriod } from '../types';

export interface BlockedInfo {
  title: string;
  startDate: string;
  endDate?: string;
  repeat: ClosedPeriodRepeat;
}

function dayOfWeek(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function monthDay(key: string): number {
  const [, month, day] = key.split('-').map(Number);
  return month * 100 + day;
}

function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

function isClosed(date: string, period: PublicClosedPeriod): boolean {
  const end = period.endDate && period.endDate >= period.startDate ? period.endDate : period.startDate;

  if (period.repeat === 'weekly') {
    const spanDays = daysBetween(period.startDate, end);
    const rel = (dayOfWeek(date) - dayOfWeek(period.startDate) + 7) % 7;
    return rel <= spanDays;
  }

  if (period.repeat === 'yearly') {
    const startMd = monthDay(period.startDate);
    const endMd = monthDay(end);
    const dateMd = monthDay(date);
    if (startMd <= endMd) return dateMd >= startMd && dateMd <= endMd;
    return dateMd >= startMd || dateMd <= endMd;
  }

  return date >= period.startDate && date <= end;
}

export function findBlockedPeriod(date: string, periods: PublicClosedPeriod[]): BlockedInfo | null {
  if (!date) return null;
  const period = periods.find((p) => isClosed(date, p));
  if (!period) return null;
  return {
    title: period.title,
    startDate: period.startDate,
    endDate: period.endDate,
    repeat: period.repeat,
  };
}

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function formatClosedPeriod(b: BlockedInfo): string {
  const start = new Date(`${b.startDate}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
  const end = b.endDate ? new Date(`${b.endDate}T12:00:00`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  let repeatLabel = '';
  if (b.repeat === 'weekly') {
    const wd = WEEKDAYS[dayOfWeek(b.startDate)];
    repeatLabel = ` (todos os ${wd})`;
  } else if (b.repeat === 'yearly') {
    repeatLabel = ' (todos os anos)';
  }
  if (end && end !== start) return `${start} → ${end}${repeatLabel}`;
  return `${start}${repeatLabel}`;
}