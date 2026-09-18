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
}

export interface ReservationData {
  name: string;
  phone: string;
  email: string;
  date: string;
  timeSlot: string;
  guests: number;
  zone: 'salao' | 'terraco' | 'garrafeira';
  occasion: string;
  specialRequests?: string;
}
