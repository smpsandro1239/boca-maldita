import { MenuCategory } from './data/menuCategories';

/** Para os itens da categoria 'diarias': se o prato do dia é carne ou peixe. */
export type DailyKind = 'carne' | 'peixe';

export type ScreenType = 
  | 'inicio' 
  | 'o-restaurante' 
  | 'menu-carnes' 
  | 'experiencia' 
  | 'reservas' 
  | 'contactos' 
  | 'legal';

export type LegalDoc = 'privacidade' | 'termos' | 'livro';

export interface ImageAsset {
  id: string;
  name: string;
  category: 'logo' | 'hero' | 'ambiente' | 'carnes' | 'mar' | 'entradas' | 'diarias' | 'mapa' | 'pessoas';
  url: string;
  description: string;
  alt: string;
  scale?: number;
  px?: number;
  py?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: MenuCategory;
  badge?: string;
  tagline?: string;
  description: string;
  imageUrl: string;
  dryAgedDays?: number;
  servesCount?: string;
  origin?: string;
  pairingWine?: string;
  producer?: string;
  vintage?: string;
  isChefSpecial?: boolean;
  dailyKind?: DailyKind;
  visible?: boolean;
  order?: number;
}

export interface AssetOverride {
  id: string;
  url: string;
  scale?: number;
  px?: number;
  py?: number;
}

export interface SiteContent {
  contactEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  headline: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  instagram: string;
  facebook: string;
  videoUrl: string;
  testimonialText: string;
  testimonialName: string;
  testimonialRole: string;
  testimonialStars: string;
}

export interface ReservationAdminRow {
  id: number;
  reference: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  area: string;
  occasion: string;
  notes: string;
  status: string;
  ip_address?: string;
  created_at: string;
}

export interface ContactAdminRow {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface NewsletterAdminRow {
  id: number;
  email: string;
  created_at: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewAdminRow {
  id: number;
  name: string;
  service_rating: number;
  food_rating: number;
  ambience_rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
}

export interface ReviewInput {
  name: string;
  serviceRating: number;
  foodRating: number;
  ambienceRating: number;
  comment: string;
}

export interface ReservationEditorData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  area: string;
  occasion: string;
  notes: string;
}

export interface ReservationData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  area: string;
  occasion: string;
  notes?: string;
  check?: string;
  checkQuestion?: string;
  honeypot?: string;
}

export type ClosedPeriodRepeat = 'none' | 'weekly' | 'yearly';

export interface ClosedPeriod {
  id: number;
  title: string;
  start_date: string;
  end_date: string | null;
  repeat: ClosedPeriodRepeat;
  note: string;
  created_at: string;
}

export interface ClosedPeriodInput {
  title: string;
  startDate: string;
  endDate?: string;
  repeat: ClosedPeriodRepeat;
  note?: string;
}

export interface ClosedDayConflictDates {
  total: number;
  dates: { date: string; count: number }[];
}

export interface PublicClosedPeriod {
  title: string;
  startDate: string;
  endDate?: string;
  repeat: ClosedPeriodRepeat;
}

export interface PublicReservationConfig {
  protectionEnabled: boolean;
  paused: boolean;
  requireCheck: boolean;
  closedPeriods: PublicClosedPeriod[];
}

export interface ReservationProtectionConfig {
  enabled: boolean;
  pauseForm: boolean;
  dailyCapacity: number;
  maxPerClient: number;
  rateLimit: boolean;
  requireCheck: boolean;
}

export type DiariaRepeat = 'none' | 'weekly' | 'biweekly' | 'monthly';

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

export interface DiariaScheduleInput {
  anchorDate: string;
  repeat: DiariaRepeat;
  activeFrom?: string;
  activeTo?: string | null;
  lunch: boolean;
  dinner: boolean;
  itemIds: string[];
}

export type PublicDiariaPeriod = 'lunch' | 'dinner' | 'closed';

/**
 * O endpoint público /api/diarias devolve apenas a referencia {id, visible} dos
 * pratos agendados, nao o prato completo. Usar isto como MenuItem rebenta em
 * runtime (price undefined), por isso ha que resolver contra a carta.
 */
export interface PublicDailyRef {
  id: string;
  visible?: boolean;
}

export interface PublicDiarias {
  date: string;
  currentMeal: PublicDiariaPeriod;
  lunch: PublicDailyRef[];
  dinner: PublicDailyRef[];
  hasSchedule: boolean;
  servedMeals: { lunch: boolean; dinner: boolean };
  closedTitle: string | null;
}
