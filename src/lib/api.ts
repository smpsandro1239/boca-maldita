import type { AssetOverride, ContactAdminRow, MenuItem, NewsletterAdminRow, PublicReservationConfig, ReservationAdminRow, ReservationEditorData, ReservationProtectionConfig, ReviewAdminRow, ReviewInput, ReviewStatus, SiteContent } from '../types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);

  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    const message =
      data && typeof data.error === 'string' ? data.error : 'Erro ao comunicar com o servidor. Tente novamente.';
    throw new Error(message);
  }

  return data as T;
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export interface CreateReservationResult {
  id: number;
  reference: string;
}

export interface ReservationPayload {
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

export function createReservation(payload: ReservationPayload): Promise<CreateReservationResult> {
  return post<CreateReservationResult>('/reservations', payload);
}

export function getReservationConfig(): Promise<PublicReservationConfig> {
  return request<PublicReservationConfig>('/reservations-config');
}

export interface ContactPayload {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
}

export function createContact(payload: ContactPayload): Promise<{ id: number }> {
  return post<{ id: number }>('/contacts', payload);
}

export function subscribeNewsletter(email: string): Promise<{ id: number }> {
  return post<{ id: number }>('/newsletter', { email });
}

export interface SiteSettings {
  contactEmail: string;
}

export function getSite(): Promise<SiteSettings> {
  return request<SiteSettings>('/site');
}

export function saveSiteSettings(contactEmail: string, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/site', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ contactEmail }),
  });
}

export interface AdminAssetsStatus {
  enabled: boolean;
  overrides: Record<string, { url: string; scale?: number; px?: number; py?: number }>;
}

export function verifyAdminToken(token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/verify-token', {
    headers: { 'X-Admin-Token': token },
  });
}

export function getAdminAssets(): Promise<AdminAssetsStatus> {
  return request<AdminAssetsStatus>('/admin/assets');
}

export function saveAdminAssets(overrides: AssetOverride[], token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/assets', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ overrides }),
  });
}

export function resetAdminAssets(token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/assets', {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
}

export function getMenus(): Promise<{ items: MenuItem[] | null }> {
  return request<{ items: MenuItem[] | null }>('/menus');
}

export function saveAdminMenus(items: MenuItem[], token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/menus', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ items }),
  });
}

export function resetAdminMenus(token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/menus', {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
}

export function getSiteContent(): Promise<SiteContent> {
  return request<SiteContent>('/site-content');
}

export function saveSiteContent(content: SiteContent, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/site-content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(content),
  });
}

export function getAdminReservations(token: string): Promise<{ items: ReservationAdminRow[] }> {
  return request<{ items: ReservationAdminRow[] }>('/admin/reservations', {
    headers: { 'X-Admin-Token': token },
  });
}

export function getAdminReservationProtection(token: string): Promise<ReservationProtectionConfig> {
  return request<ReservationProtectionConfig>('/admin/reservation-protection', {
    headers: { 'X-Admin-Token': token },
  });
}

export function saveAdminReservationProtection(config: ReservationProtectionConfig, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/reservation-protection', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(config),
  });
}

export function deleteAdminReservation(id: number, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/reservations/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
}

export function createAdminReservation(payload: ReservationEditorData, token: string): Promise<{ id: number; reference: string }> {
  return request<{ id: number; reference: string }>('/admin/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(payload),
  });
}

export function updateAdminReservation(id: number, payload: ReservationEditorData, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/reservations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify(payload),
  });
}

export function getAdminContacts(token: string): Promise<{ items: ContactAdminRow[] }> {
  return request<{ items: ContactAdminRow[] }>('/admin/contacts', {
    headers: { 'X-Admin-Token': token },
  });
}

export function deleteAdminContact(id: number, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/contacts/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
}

export function getAdminNewsletter(token: string): Promise<{ items: NewsletterAdminRow[] }> {
  return request<{ items: NewsletterAdminRow[] }>('/admin/newsletter', {
    headers: { 'X-Admin-Token': token },
  });
}

export function deleteAdminNewsletter(id: number, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/newsletter/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
}

export function createReview(payload: ReviewInput): Promise<{ id: number }> {
  return post<{ id: number }>('/reviews', payload);
}

export function getReviews(): Promise<{ items: ReviewAdminRow[] }> {
  return request<{ items: ReviewAdminRow[] }>('/reviews');
}

export function getAdminReviews(token: string): Promise<{ items: ReviewAdminRow[] }> {
  return request<{ items: ReviewAdminRow[] }>('/admin/reviews', {
    headers: { 'X-Admin-Token': token },
  });
}

export function setAdminReviewStatus(id: number, status: ReviewStatus, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/reviews/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ status }),
  });
}

export function deleteAdminReview(id: number, token: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/reviews/${id}`, {
    method: 'DELETE',
    headers: { 'X-Admin-Token': token },
  });
}

export function updateAdminToken(newToken: string, currentToken: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/security/token', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': currentToken },
    body: JSON.stringify({ token: newToken }),
  });
}