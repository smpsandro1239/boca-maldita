import type { AssetOverride, ClosedPeriod, ClosedPeriodInput, ContactAdminRow, MenuItem, NewsletterAdminRow, PublicReservationConfig, ReservationAdminRow, ReservationEditorData, ReservationProtectionConfig, ReviewAdminRow, ReviewInput, ReviewStatus, SiteContent } from '../types';

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);

  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    const message =
      data && typeof data.error === 'string' ? data.error : 'Erro ao comunicar com o servidor. Tente novamente.';
    throw new HttpError(message, response.status);
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

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const raw = part.slice(eq + 1).trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

function mutationHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrf = readCookie('bmcsrf');
  if (csrf) headers['X-Csrf-Token'] = csrf;
  return headers;
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

export function saveSiteSettings(contactEmail: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/site', {
    method: 'PUT',
    headers: mutationHeaders(),
    body: JSON.stringify({ contactEmail }),
  });
}

export function adminLogin(token: string): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/admin/login', { token });
}

export function adminSession(): Promise<{ authenticated: boolean }> {
  return request<{ authenticated: boolean }>('/admin/session');
}

export function adminLogout(): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/admin/logout', {});
}

export interface AdminAssetsStatus {
  enabled: boolean;
  overrides: Record<string, { url: string; scale?: number; px?: number; py?: number }>;
}

export function getAdminAssets(): Promise<AdminAssetsStatus> {
  return request<AdminAssetsStatus>('/admin/assets');
}

export function saveAdminAssets(overrides: AssetOverride[]): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/assets', {
    method: 'PUT',
    headers: mutationHeaders(),
    body: JSON.stringify({ overrides }),
  });
}

export function resetAdminAssets(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/assets', {
    method: 'DELETE',
  });
}

export function getMenus(): Promise<{ items: MenuItem[] | null }> {
  return request<{ items: MenuItem[] | null }>('/menus');
}

export function saveAdminMenus(items: MenuItem[]): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/menus', {
    method: 'PUT',
    headers: mutationHeaders(),
    body: JSON.stringify({ items }),
  });
}

export function resetAdminMenus(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/menus', {
    method: 'DELETE',
  });
}

export function getSiteContent(): Promise<SiteContent> {
  return request<SiteContent>('/site-content');
}

export function saveSiteContent(content: SiteContent): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/site-content', {
    method: 'PUT',
    headers: mutationHeaders(),
    body: JSON.stringify(content),
  });
}

export function getAdminReservations(): Promise<{ items: ReservationAdminRow[] }> {
  return request<{ items: ReservationAdminRow[] }>('/admin/reservations');
}

export function getAdminReservationProtection(): Promise<ReservationProtectionConfig> {
  return request<ReservationProtectionConfig>('/admin/reservation-protection');
}

export function saveAdminReservationProtection(config: ReservationProtectionConfig): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/reservation-protection', {
    method: 'PUT',
    headers: mutationHeaders(),
    body: JSON.stringify(config),
  });
}

export function deleteAdminReservation(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/reservations/${id}`, {
    method: 'DELETE',
  });
}

export function createAdminReservation(payload: ReservationEditorData): Promise<{ id: number; reference: string }> {
  return request<{ id: number; reference: string }>('/admin/reservations', {
    method: 'POST',
    headers: mutationHeaders(),
    body: JSON.stringify(payload),
  });
}

export function updateAdminReservation(id: number, payload: ReservationEditorData): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/reservations/${id}`, {
    method: 'PUT',
    headers: mutationHeaders(),
    body: JSON.stringify(payload),
  });
}

export function getAdminContacts(): Promise<{ items: ContactAdminRow[] }> {
  return request<{ items: ContactAdminRow[] }>('/admin/contacts');
}

export function deleteAdminContact(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/contacts/${id}`, {
    method: 'DELETE',
  });
}

export function getAdminNewsletter(): Promise<{ items: NewsletterAdminRow[] }> {
  return request<{ items: NewsletterAdminRow[] }>('/admin/newsletter');
}

export function deleteAdminNewsletter(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/newsletter/${id}`, {
    method: 'DELETE',
  });
}

export function createReview(payload: ReviewInput): Promise<{ id: number }> {
  return post<{ id: number }>('/reviews', payload);
}

export function getReviews(): Promise<{ items: ReviewAdminRow[] }> {
  return request<{ items: ReviewAdminRow[] }>('/reviews');
}

export function getAdminReviews(): Promise<{ items: ReviewAdminRow[] }> {
  return request<{ items: ReviewAdminRow[] }>('/admin/reviews');
}

export function setAdminReviewStatus(id: number, status: ReviewStatus): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/reviews/${id}`, {
    method: 'PUT',
    headers: mutationHeaders(),
    body: JSON.stringify({ status }),
  });
}

export function deleteAdminReview(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/reviews/${id}`, {
    method: 'DELETE',
  });
}

export function updateAdminToken(newToken: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/admin/security/token', {
    method: 'PUT',
    headers: mutationHeaders(),
    body: JSON.stringify({ token: newToken }),
  });
}

export function getAdminClosedDays(): Promise<{ items: ClosedPeriod[] }> {
  return request<{ items: ClosedPeriod[] }>('/admin/closed-days');
}

export function createAdminClosedDay(input: ClosedPeriodInput): Promise<{ id: number }> {
  return request<{ id: number }>('/admin/closed-days', {
    method: 'POST',
    headers: mutationHeaders(),
    body: JSON.stringify(input),
  });
}

export function deleteAdminClosedDay(id: number): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/admin/closed-days/${id}`, {
    method: 'DELETE',
  });
}