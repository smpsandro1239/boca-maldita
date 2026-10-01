export interface BlockedPeriodShape {
  start_date: string;
  end_date: string | null;
  repeat: string;
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

export function isDateBlocked(date: string, period: BlockedPeriodShape): boolean {
  const end = period.end_date && period.end_date >= period.start_date ? period.end_date : period.start_date;

  if (period.repeat === 'weekly') {
    const dayOfWeek = (dateKey: string): number => {
      const { year, month, day } = parseDateKey(dateKey);
      return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    };
    const startDow = dayOfWeek(period.start_date);
    const spanDays = Math.round(
      (new Date(Date.UTC(parseDateKey(end).year, parseDateKey(end).month - 1, parseDateKey(end).day)).getTime() -
        new Date(Date.UTC(parseDateKey(period.start_date).year, parseDateKey(period.start_date).month - 1, parseDateKey(period.start_date).day)).getTime()) /
        86400000,
    );
    const rel = (dayOfWeek(date) - startDow + 7) % 7;
    return rel <= spanDays;
  }

  if (period.repeat === 'yearly') {
    const { month, day } = parseDateKey(date);
    const s = parseDateKey(period.start_date);
    const e = parseDateKey(end);
    const key = (m: number, d: number): number => m * 100 + d;
    const sd = key(s.month, s.day);
    const ed = key(e.month, e.day);
    const cd = key(month, day);
    if (sd <= ed) return cd >= sd && cd <= ed;
    return cd >= sd || cd <= ed;
  }

  return date >= period.start_date && date <= end;
}