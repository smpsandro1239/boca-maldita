async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    const message =
      data && typeof data.error === 'string' ? data.error : 'Erro ao comunicar com o servidor. Tente novamente.';
    throw new Error(message);
  }

  return data as T;
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
}

export function createReservation(payload: ReservationPayload): Promise<CreateReservationResult> {
  return post<CreateReservationResult>('/reservations', payload);
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