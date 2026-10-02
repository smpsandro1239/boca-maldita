import type { PublicDailyRef } from '../../shared/contracts';

export type DiariaRepeat = 'none' | 'weekly' | 'biweekly' | 'monthly';
export type DiariaMeal = 'lunch' | 'dinner';

export interface DiariaSchedule {
  id: string;
  anchorDate: string;
  repeat: DiariaRepeat;
  activeFrom: string;
  activeTo: string | null;
  lunch: boolean;
  dinner: boolean;
  itemIds: string[];
}

export interface ResolvedDiariasDay {
  lunch: PublicDailyRef[];
  dinner: PublicDailyRef[];
  hasSchedule: boolean;
  servedMeals: { lunch: boolean; dinner: boolean };
}

export const LUNCH_CUTOFF_HOUR = 16;

const RESTAURANT_TIME_ZONE = 'Europe/Lisbon';

const lisbonFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: RESTAURANT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function lisbonParts(now: Date): { year: number; month: number; day: number; hour: number } {
  const parts = lisbonFormatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((part) => part.type === type)?.value ?? '0');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
  };
}

export function currentMeal(now: Date = new Date()): DiariaMeal {
  return lisbonParts(now).hour < LUNCH_CUTOFF_HOUR ? 'lunch' : 'dinner';
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86400000);
}

export function todayKey(now: Date = new Date()): string {
  const { year, month, day } = lisbonParts(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function scheduleAppliesOn(schedule: DiariaSchedule, date: string): boolean {
  if (date < schedule.anchorDate) return false;
  if (date < schedule.activeFrom) return false;
  if (schedule.activeTo && date > schedule.activeTo) return false;

  switch (schedule.repeat) {
    case 'none':
      return date === schedule.anchorDate;
    case 'weekly':
      return diffDays(schedule.anchorDate, date) % 7 === 0;
    case 'biweekly':
      return diffDays(schedule.anchorDate, date) % 14 === 0;
    case 'monthly': {
      const anchor = parseDateKey(schedule.anchorDate);
      const day = parseDateKey(date);
      return day.getDate() === anchor.getDate();
    }
  }
}

export function resolveDiariasDay(
  schedules: DiariaSchedule[],
  menuItems: PublicDailyRef[],
  date: string,
): ResolvedDiariasDay {
  const byId = new Map<string, PublicDailyRef>();
  for (const item of menuItems) {
    if (item.visible === false) continue;
    byId.set(item.id, item);
  }

  const lunch: PublicDailyRef[] = [];
  const dinner: PublicDailyRef[] = [];
  const seenLunch = new Set<string>();
  const seenDinner = new Set<string>();
  let hasSchedule = false;
  let lunchServed = false;
  let dinnerServed = false;

  for (const schedule of schedules) {
    if (!scheduleAppliesOn(schedule, date)) continue;
    hasSchedule = true;

    if (schedule.lunch) lunchServed = true;
    if (schedule.dinner) dinnerServed = true;

    for (const id of schedule.itemIds) {
      const item = byId.get(id);
      if (!item) continue;

      if (schedule.lunch && !seenLunch.has(id)) {
        seenLunch.add(id);
        lunch.push(item);
      }
      if (schedule.dinner && !seenDinner.has(id)) {
        seenDinner.add(id);
        dinner.push(item);
      }

      if (lunch.length >= 4 && dinner.length >= 4) break;
    }
  }

  return {
    lunch: lunch.slice(0, 4),
    dinner: dinner.slice(0, 4),
    hasSchedule,
    servedMeals: { lunch: lunchServed, dinner: dinnerServed },
  };
}

export function isDiariaSchedule(value: unknown): value is DiariaSchedule {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.anchorDate === 'string' &&
    typeof record.repeat === 'string' &&
    typeof record.activeFrom === 'string' &&
    (record.activeTo === null || typeof record.activeTo === 'string') &&
    typeof record.lunch === 'boolean' &&
    typeof record.dinner === 'boolean' &&
    Array.isArray(record.itemIds)
  );
}

export function normalizeDiariaSchedule(value: unknown): DiariaSchedule | null {
  if (!isDiariaSchedule(value)) return null;
  const record = value as unknown as DiariaSchedule;
  return {
    ...record,
    activeTo: record.activeTo || null,
    itemIds: record.itemIds.filter((id) => typeof id === 'string' && id.trim().length > 0).slice(0, 4),
  };
}

export const DEFAULT_DIARIA_ITEM_IDS = [
  'diaria-bife-minhota',
  'diaria-pescada-minhota',
  'diaria-frango-churrasco',
  'diaria-sardinha-assada',
];

/** Monday of the week 2024-01-01, used as the stable anchor for the weekday seeds. */
const SEED_ANCHOR_MONDAY = '2024-01-01';

export function buildDefaultDiariaSchedules(): DiariaSchedule[] {
  return [0, 1, 2, 3, 4].map((offset) => {
    const anchorDate = new Date(`${SEED_ANCHOR_MONDAY}T12:00:00Z`);
    anchorDate.setUTCDate(anchorDate.getUTCDate() + offset);
    const date = anchorDate.toISOString().slice(0, 10);
    return {
      id: `default-${date}`,
      anchorDate: date,
      repeat: 'weekly' as const,
      activeFrom: date,
      activeTo: null,
      lunch: true,
      dinner: false,
      itemIds: [...DEFAULT_DIARIA_ITEM_IDS],
    };
  });
}