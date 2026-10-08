import { createReservation, type CreateReservationResult, type ReservationPayload } from './api';
import { findBlockedPeriod } from './closedDays';
import type { PublicReservationConfig } from '../types';

/**
 * Defaults para os campos que a Pré-Reserva Rápida não mostra.
 * São exactamente os valores que a rápida já enviava — o payload ao
 * servidor não muda com a unificação.
 */
export const QUICK_DEFAULTS = {
  time: '20:00',
  area: 'Salão Nobre da Brasa',
  occasion: 'Pré-Reserva Rápida',
} as const;

export interface ReservationCheck {
  value: string;
  question: string;
  honeypot: string;
}

export interface ReservationCore {
  name: string;
  email: string;
  phone: string;
  date: string;
  guests: number;
}

export interface ReservationExtras {
  time: string;
  area: string;
  occasion: string;
  notes: string;
}

/**
 * Resultado de uma submissão.
 *
 * Tipo plano e nao união discriminada de propósito: o tsconfig do
 * projecto não tem `strict`, logo `strictNullChecks` está desligado, e
 * nesse modo o TypeScript não estreita uniões discriminadas por
 * literais (`if (!r.ok)` não reduz). Com campos opcionais o narrowing
 * funciona nos dois regimes.
 */
export interface SubmitOutcome {
  /** Referência da reserva (ex. "BM-0031"). Null quando falhou. */
  reference: string | null;
  /** Mensagem para o utilizador. Null quando correu bem. */
  error: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Validação única, usada pelas duas variantes.
 * `extras === null` => Pré-Reserva Rápida (hora/área/ocasião vêm de QUICK_DEFAULTS).
 * Devolve a mensagem de erro, ou null se está tudo certo.
 */
export function validateReservation(
  core: ReservationCore,
  extras: ReservationExtras | null,
  config: PublicReservationConfig | null,
  check: ReservationCheck,
  phone: string,
): string | null {
  if (config?.paused) {
    return `As reservas online estão temporariamente pausadas. Ligue ${phone} para reservar.`;
  }

  if (!core.name.trim()) return 'Preencha o nome completo.';
  if (!core.email.trim()) return 'Preencha o email de confirmação.';
  if (!core.phone.trim()) return 'Preencha o telefone de contacto.';

  if (!core.date || !ISO_DATE.test(core.date)) return 'Data inválida.';
  if (core.date < todayKey()) return 'A data tem de ser hoje ou uma data futura.';

  if (!Number.isInteger(core.guests) || core.guests < 1) return 'Número de convidados inválido.';
  if (core.guests > 16) return 'Máximo de 16 convidados por reserva.';

  if (extras) {
    if (!extras.time.trim()) return 'Escolha a hora do serviço.';
    if (!extras.area.trim()) return 'Selecione uma área do restaurante.';
    if (!extras.occasion.trim()) return 'Indique a ocasião da visita.';
  }

  const blocked = findBlockedPeriod(core.date, config?.closedPeriods ?? []);
  if (blocked) {
    return `Não é possível reservar para esta data (${blocked.title}). Escolha outro dia.`;
  }

  if (config?.requireCheck) {
    if (check.honeypot) return 'Verificação anti-robô incorreta. Tente de novo.';
    if (!check.question.trim()) return 'Verificação anti-robô incorreta. Tente de novo.';
    const expected = solveSimpleExpression(check.question);
    if (expected === null || Number(check.value.trim()) !== expected) {
      return 'Verificação anti-robô incorreta. Tente de novo.';
    }
  }

  return null;
}

/**
 * Recria aqui o cálculo do servidor (app.ts:262) para que a resposta
 * enviada seja validada com a MESMA pergunta, não com o estado interno
 * do cliente. Só aceita "a+b" e "a-b", como o servidor.
 */
function solveSimpleExpression(expr: string): number | null {
  const m = /^(\d{1,3})\s*([+-])\s*(\d{1,3})$/.exec(expr.trim());
  if (!m) return null;
  const left = Number(m[1]);
  const right = Number(m[3]);
  return m[2] === '+' ? left + right : left - right;
}

export function buildReservationPayload(
  core: ReservationCore,
  extras: ReservationExtras | null,
  config: PublicReservationConfig | null,
  check: ReservationCheck,
): ReservationPayload {
  const e = extras ?? (QUICK_DEFAULTS as unknown as ReservationExtras);
  const requireCheck = config?.requireCheck ?? false;
  return {
    name: core.name.trim(),
    email: core.email.trim(),
    phone: core.phone.trim(),
    date: core.date,
    time: e.time,
    guests: core.guests,
    area: e.area,
    occasion: e.occasion,
    notes: (e.notes ?? '').trim(),
    check: requireCheck ? check.value.trim() : '',
    checkQuestion: requireCheck ? check.question.trim() : '',
    honeypot: requireCheck ? check.honeypot : '',
  };
}

/**
 * Ponto único de submissão: valida, envia e devolve a referência.
 * Nenhum dos ecrãs deve voltar a montar um payload por conta própria.
 */
export async function submitReservation(
  core: ReservationCore,
  extras: ReservationExtras | null,
  config: PublicReservationConfig | null,
  check: ReservationCheck,
  phone: string,
): Promise<SubmitOutcome> {
  const error = validateReservation(core, extras, config, check, phone);
  if (error) return { reference: null, error };

  try {
    const created: CreateReservationResult = await createReservation(
      buildReservationPayload(core, extras, config, check),
    );
    return { reference: created.reference, error: null };
  } catch (err) {
    return {
      reference: null,
      error: err instanceof Error ? err.message : 'Ocorreu um erro ao enviar a reserva.',
    };
  }
}
