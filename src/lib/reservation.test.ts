import { describe, expect, it } from 'vitest';
import type { PublicReservationConfig } from '../types';
import {
  QUICK_DEFAULTS,
  buildReservationPayload,
  validateReservation,
  type ReservationCheck,
  type ReservationCore,
  type ReservationExtras,
} from './reservation';

const PHONE = '+351 253 031 890';

const openConfig: PublicReservationConfig = {
  protectionEnabled: true,
  paused: false,
  requireCheck: true,
  closedPeriods: [],
};

const goodCheck: ReservationCheck = { value: '12', question: '5+7', honeypot: '' };

const core: ReservationCore = {
  name: 'Bernardo Silva',
  email: 'nome@exemplo.pt',
  phone: '+351 912 345 678',
  date: '2099-01-10',
  guests: 2,
};

const extras: ReservationExtras = {
  time: '19:30',
  area: 'Terraço do Cávado',
  occasion: 'Aniversário',
  notes: 'Sem frutos secos',
};

const quick = (overrides: Partial<ReservationCore> = {}, cfg = openConfig, check = goodCheck) =>
  validateReservation({ ...core, ...overrides }, null, cfg, check, PHONE);

describe('validateReservation — Pré-Reserva Rápida (extras = null)', () => {
  it('aceita o conjunto mínimo sem exigir hora, área nem ocasião', () => {
    expect(quick()).toBeNull();
  });

  it('bloqueia quando as reservas estão pausadas, com a mensagem do servidor', () => {
    expect(quick({}, { ...openConfig, paused: true })).toBe(
      `As reservas online estão temporariamente pausadas. Ligue ${PHONE} para reservar.`,
    );
  });

  it('recusa nome vazio', () => {
    expect(quick({ name: '   ' })).toBe('Preencha o nome completo.');
  });

  it('recusa email vazio', () => {
    expect(quick({ email: '' })).toBe('Preencha o email de confirmação.');
  });

  it('recusa telefone vazio', () => {
    expect(quick({ phone: '' })).toBe('Preencha o telefone de contacto.');
  });

  it('recusa data fora do formato ISO', () => {
    expect(quick({ date: '10/01/2099' })).toBe('Data inválida.');
  });

  it('recusa data no passado', () => {
    expect(quick({ date: '2020-01-01' })).toBe('A data tem de ser hoje ou uma data futura.');
  });

  it('recusa mais de 16 convidados, como o servidor', () => {
    expect(quick({ guests: 17 })).toBe('Máximo de 16 convidados por reserva.');
  });

  it('recusa resposta anti-robô errada', () => {
    expect(quick({}, openConfig, { ...goodCheck, value: '13' })).toBe(
      'Verificação anti-robô incorreta. Tente de novo.',
    );
  });

  it('recusa honeypot preenchido', () => {
    expect(quick({}, openConfig, { ...goodCheck, honeypot: 'spam' })).toBe(
      'Verificação anti-robô incorreta. Tente de novo.',
    );
  });

  it('aceita subtracção, como o gerador do cliente', () => {
    expect(quick({}, openConfig, { value: '5', question: '9-4', honeypot: '' })).toBeNull();
  });

  it('com verificação desligada não exige a resposta', () => {
    const cfg = { ...openConfig, requireCheck: false };
    expect(quick({}, cfg, { value: '', question: '', honeypot: '' })).toBeNull();
  });

  it('recusa uma data que cai num período fechado', () => {
    const cfg: PublicReservationConfig = {
      ...openConfig,
      closedPeriods: [{ title: 'Férias de Inverno', startDate: '2099-01-10', repeat: 'none' }],
    };
    expect(quick({}, cfg)).toBe('Não é possível reservar para esta data (Férias de Inverno). Escolha outro dia.');
  });
});

describe('validateReservation — Reserva Completa (com extras)', () => {
  it('aceita quando todos os campos obrigatórios estão preenchidos', () => {
    expect(validateReservation(core, extras, openConfig, goodCheck, PHONE)).toBeNull();
  });

  it('exige hora, área e ocasião que a rápida não tem', () => {
    expect(validateReservation(core, { ...extras, time: '' }, openConfig, goodCheck, PHONE)).toBe(
      'Escolha a hora do serviço.',
    );
    expect(validateReservation(core, { ...extras, area: '' }, openConfig, goodCheck, PHONE)).toBe(
      'Selecione uma área do restaurante.',
    );
    expect(validateReservation(core, { ...extras, occasion: '' }, openConfig, goodCheck, PHONE)).toBe(
      'Indique a ocasião da visita.',
    );
  });

  it('nota: as datas fechadas também bloqueiam a completa', () => {
    const cfg: PublicReservationConfig = {
      ...openConfig,
      closedPeriods: [{ title: 'Encerramento anual', startDate: '2099-01-01', endDate: '2099-01-31', repeat: 'yearly' }],
    };
    expect(validateReservation(core, extras, cfg, goodCheck, PHONE)).toBe(
      'Não é possível reservar para esta data (Encerramento anual). Escolha outro dia.',
    );
  });
});

describe('buildReservationPayload', () => {
  it('a rápida mantém EXACTAMENTE o payload que já enviava — sem mudança para o servidor', () => {
    const p = buildReservationPayload(core, null, openConfig, goodCheck);
    expect(p.time).toBe('20:00');
    expect(p.area).toBe('Salão Nobre da Brasa');
    expect(p.occasion).toBe('Pré-Reserva Rápida');
    expect(p.time).toBe(QUICK_DEFAULTS.time);
    expect(p.area).toBe(QUICK_DEFAULTS.area);
    expect(p.occasion).toBe(QUICK_DEFAULTS.occasion);
  });

  it('a completa usa os campos que o utilizador escolheu', () => {
    const p = buildReservationPayload(core, extras, openConfig, goodCheck);
    expect(p.time).toBe('19:30');
    expect(p.area).toBe('Terraço do Cávado');
    expect(p.occasion).toBe('Aniversário');
    expect(p.notes).toBe('Sem frutos secos');
  });

  it('envia pergunta e resposta em conjunto, para o servidor revalidar', () => {
    const p = buildReservationPayload(core, null, openConfig, goodCheck);
    expect(p.checkQuestion).toBe('5+7');
    expect(p.check).toBe('12');
    expect(p.honeypot).toBe('');
  });

  it('com verificação desligada envia os campos anti-robô vazios', () => {
    const cfg = { ...openConfig, requireCheck: false };
    const p = buildReservationPayload(core, null, cfg, { value: '12', question: '5+7', honeypot: 'x' });
    expect(p.check).toBe('');
    expect(p.checkQuestion).toBe('');
    expect(p.honeypot).toBe('');
  });

  it('faz trim nos campos de texto antes de enviar', () => {
    const p = buildReservationPayload({ ...core, name: '  Ana  ', email: ' a@b.pt ' }, null, openConfig, goodCheck);
    expect(p.name).toBe('Ana');
    expect(p.email).toBe('a@b.pt');
  });

  it('a rápida não inventa notas', () => {
    const p = buildReservationPayload(core, null, openConfig, goodCheck);
    expect(p.notes).toBe('');
  });
});
