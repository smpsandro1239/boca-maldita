import { MenuCategory } from './data/menuCategories';

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
  category: 'logo' | 'hero' | 'ambiente' | 'carnes' | 'mar' | 'entradas' | 'mapa' | 'pessoas';
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
  address: string;
  hours: string;
  headline: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  instagram: string;
  facebook: string;
  videoUrl: string;
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
