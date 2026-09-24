import { describe, expect, it } from 'vitest';
import {
  closedPeriodSchema,
  contactSchema,
  menuItemSchema,
  newsletterSchema,
  reservationSchema,
  reviewSchema,
} from './validation';

const FUTURE_DATE = '2026-12-25';

const validReservation = {
  name: 'Sandro Martins',
  email: 'sandro@example.com',
  phone: '+351 253 000 000',
  date: FUTURE_DATE,
  time: '20:00',
  guests: 2,
  area: 'Salão Nobre da Brasa',
  occasion: 'Jantar romântico',
};

describe('reservationSchema', () => {
  it('accepts a valid reservation', () => {
    expect(reservationSchema.safeParse(validReservation).success).toBe(true);
  });

  it('rejects an invalid calendar date', () => {
    const result = reservationSchema.safeParse({ ...validReservation, date: '2026-02-30' });
    expect(result.success).toBe(false);
  });

  it('rejects a past date', () => {
    const result = reservationSchema.safeParse({ ...validReservation, date: '2020-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects an unavailable time', () => {
    const result = reservationSchema.safeParse({ ...validReservation, time: '18:00' });
    expect(result.success).toBe(false);
  });

  it('rejects more than 16 guests', () => {
    const result = reservationSchema.safeParse({ ...validReservation, guests: 17 });
    expect(result.success).toBe(false);
  });

  it('rejects empty occasion', () => {
    const result = reservationSchema.safeParse({ ...validReservation, occasion: '' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    const result = reservationSchema.safeParse({ ...validReservation, hacker: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('menuItemSchema', () => {
  const base = {
    id: 'item-1',
    name: 'Entrecôte maturado',
    price: 24,
    currency: '€',
    category: 'carnes',
    description: 'Maturado 30 dias.',
    imageUrl: 'https://example.com/entrecote.jpg',
  };

  it('accepts a valid item', () => {
    expect(menuItemSchema.safeParse(base).success).toBe(true);
  });

  it('accepts wine-specific fields producer and vintage', () => {
    const result = menuItemSchema.safeParse({
      ...base,
      category: 'vinhos',
      name: 'Quinta do Vale',
      origin: 'Douro',
      producer: 'Quinta do Vale',
      vintage: '2020',
    });
    expect(result.success).toBe(true);
    expect(result.data?.producer).toBe('Quinta do Vale');
    expect(result.data?.vintage).toBe('2020');
  });

  it('rejects relative image urls', () => {
    const result = menuItemSchema.safeParse({ ...base, imageUrl: '/images/prato.jpg' });
    expect(result.success).toBe(false);
  });

  it('rejects negative price', () => {
    const result = menuItemSchema.safeParse({ ...base, price: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid category', () => {
    const result = menuItemSchema.safeParse({ ...base, category: 'bebidas' });
    expect(result.success).toBe(false);
  });
});

describe('newsletterSchema', () => {
  it('accepts a valid email', () => {
    expect(newsletterSchema.safeParse({ email: 'cliente@example.com' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(newsletterSchema.safeParse({ email: 'nao-e-um-email' }).success).toBe(false);
  });

  it('rejects unknown keys (strict)', () => {
    expect(newsletterSchema.safeParse({ email: 'a@b.com', extra: true }).success).toBe(false);
  });
});

describe('contactSchema', () => {
  it('accepts a valid contact message', () => {
    const result = contactSchema.safeParse({
      nome: 'Ana Sousa',
      email: 'ana@example.com',
      assunto: 'Reserva de grupo',
      mensagem: 'Gostaríamos de reservar para 10 pessoas.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects too-short messages', () => {
    const result = contactSchema.safeParse({
      nome: 'Ana Sousa',
      email: 'ana@example.com',
      assunto: 'Reserva',
      mensagem: 'ola',
    });
    expect(result.success).toBe(false);
  });
});

describe('reviewSchema', () => {
  const base = {
    name: 'João Silva',
    serviceRating: 5,
    foodRating: 4,
    ambienceRating: 5,
    comment: 'Experiência fantástica do início ao fim.',
  };

  it('accepts valid ratings', () => {
    expect(reviewSchema.safeParse(base).success).toBe(true);
  });

  it('rejects ratings out of range', () => {
    expect(reviewSchema.safeParse({ ...base, serviceRating: 0 }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...base, foodRating: 6 }).success).toBe(false);
  });
});

describe('closedPeriodSchema', () => {
  it('accepts a valid period with defaults', () => {
    const result = closedPeriodSchema.safeParse({
      title: 'Fecho de Manutenção',
      startDate: '2026-10-05',
    });
    expect(result.success).toBe(true);
    expect(result.data?.repeat).toBe('none');
  });

  it('rejects endDate before startDate', () => {
    const result = closedPeriodSchema.safeParse({
      title: 'Invalida',
      startDate: '2026-10-10',
      endDate: '2026-10-05',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain('endDate');
  });

  it('rejects an invalid repeat value', () => {
    const result = closedPeriodSchema.safeParse({
      title: 'X',
      startDate: '2026-10-05',
      repeat: 'anual',
    });
    expect(result.success).toBe(false);
  });
});