export type ScreenType = 
  | 'inicio' 
  | 'o-restaurante' 
  | 'menu-carnes' 
  | 'experiencia' 
  | 'reservas' 
  | 'contactos';

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
  category: 'carnes' | 'mar' | 'entradas' | 'acompanhamentos' | 'sobremesas' | 'vinhos';
  badge?: string;
  tagline?: string;
  description: string;
  imageUrl: string;
  dryAgedDays?: number;
  servesCount?: string;
  origin?: string;
  pairingWine?: string;
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
}
