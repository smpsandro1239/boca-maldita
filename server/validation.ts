import { z } from 'zod';

export const AVAILABLE_TIMES = [
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
] as const;

const nameField = z
  .string()
  .trim()
  .min(2, 'O nome é obrigatório (mínimo de 2 caracteres).')
  .max(120, 'O nome é demasiado longo.');

const emailField = z
  .string()
  .trim()
  .email('Endereço de email inválido.')
  .max(200, 'Endereço de email demasiado longo.');

const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{6,20}$/, 'Número de telefone inválido.');

export const reservationSchema = z
  .object({
    name: nameField,
    email: emailField,
    phone: phoneField,
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
      .refine((value) => {
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
      }, 'Data inválida.')
      .refine((value) => {
        const [year, month, day] = value.split('-').map(Number);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(year, month - 1, day) >= today;
      }, 'A data tem de ser hoje ou uma data futura.'),
    time: z.enum(AVAILABLE_TIMES, { message: 'Hora não disponível para reserva.' }),
    guests: z.number().int('Número de convidados inválido.').min(1).max(16, 'Máximo de 16 convidados por reserva.'),
    area: z.string().trim().min(2, 'Selecione uma área do restaurante.').max(120),
    occasion: z.string().trim().min(1, 'A ocasião é obrigatória.').max(120),
    notes: z.string().trim().max(1000, 'Notas demasiado longas.').optional().default(''),
  })
  .strict();

export const contactSchema = z
  .object({
    nome: nameField,
    email: emailField,
    assunto: z.string().trim().min(1, 'O assunto é obrigatório.').max(120),
    mensagem: z.string().trim().min(5, 'A mensagem é demasiado curta.').max(5000, 'A mensagem é demasiado longa.'),
  })
  .strict();

export const newsletterSchema = z
  .object({
    email: emailField,
  })
  .strict();

const assetUrlField = z
  .string()
  .trim()
  .min(1, 'O link da imagem é obrigatório.')
  .max(2000, 'O link da imagem é demasiado longo.')
  .refine((value) => /^https?:\/\//i.test(value), 'O link tem de começar por http:// ou https://.');

export const assetOverridesSchema = z
  .object({
    overrides: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(80),
          url: assetUrlField,
        }),
      )
      .max(100, 'Demasiadas substituições.'),
  })
  .strict();

export type ReservationInput = z.infer<typeof reservationSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type AssetOverrideInput = z.infer<typeof assetOverridesSchema>['overrides'][number];