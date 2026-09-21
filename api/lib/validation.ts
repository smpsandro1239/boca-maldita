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
    check: z.string().trim().max(20).optional().default(''),
    checkQuestion: z.string().trim().max(40).optional().default(''),
    honeypot: z.string().trim().max(200).optional().default(''),
  })
  .strict();

export const reservationProtectionSchema = z
  .object({
    enabled: z.boolean(),
    pauseForm: z.boolean(),
    dailyCapacity: z.number().int('Capacidade inválida.').min(1).max(10000, 'Capacidade demasiado alta.'),
    maxPerClient: z.number().int('Limite inválido.').min(1).max(100, 'Limite demasiado alto.'),
    rateLimit: z.boolean(),
    requireCheck: z.boolean(),
  })
  .strict();

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }, 'Data inválida.');

export const closedPeriodSchema = z
  .object({
    title: z.string().trim().min(2, 'Indique um motivo (mínimo de 2 caracteres).').max(160, 'O motivo é demasiado longo.'),
    startDate: dateKeySchema,
    endDate: z.union([dateKeySchema, z.literal('')]).optional().default(''),
    repeat: z.enum(['none', 'weekly', 'yearly'], { message: 'Repetição inválida.' }).optional().default('none'),
    note: z.string().trim().max(500, 'A nota é demasiado longa.').optional().default(''),
  })
  .strict()
  .refine((value) => !value.endDate || value.endDate >= value.startDate, {
    message: 'A data final tem de ser igual ou posterior à data inicial.',
    path: ['endDate'],
  });

export const adminReservationSchema = z
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
      }, 'Data inválida.'),
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

export const reviewSchema = z
  .object({
    name: nameField,
    serviceRating: z.number().int('Classificação inválida.').min(1).max(5),
    foodRating: z.number().int('Classificação inválida.').min(1).max(5),
    ambienceRating: z.number().int('Classificação inválida.').min(1).max(5),
    comment: z.string().trim().min(5, 'A sua opinião é demasiado curta.').max(1000, 'A opinião é demasiado longa.'),
  })
  .strict();

export const reviewStatusSchema = z
  .object({
    status: z.enum(['approved', 'pending', 'rejected'], { message: 'Estado inválido.' }),
  })
  .strict();

export const adminTokenUpdateSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(16, 'O token tem de ter pelo menos 16 caracteres.')
      .max(200, 'O token é demasiado longo.')
      .regex(/[A-Z]/, 'O token tem de conter pelo menos uma letra maiúscula.')
      .regex(/[a-z]/, 'O token tem de conter pelo menos uma letra minúscula.')
      .regex(/[0-9]/, 'O token tem de conter pelo menos um número.')
      .regex(/[^A-Za-z0-9]/, 'O token tem de conter pelo menos um carácter especial.'),
  })
  .strict();

export const siteSettingsSchema = z
  .object({
    contactEmail: emailField,
  })
  .strict();

const assetUrlField = z
  .string()
  .trim()
  .min(1, 'O link da imagem é obrigatório.')
  .max(2000, 'O link da imagem é demasiado longo.')
  .refine((value) => /^https?:\/\//i.test(value), 'O link tem de começar por http:// ou https://.');

export const imageAssetOverrideSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    url: assetUrlField,
    scale: z.number().min(1).max(3).optional(),
    px: z.number().min(0).max(100).optional(),
    py: z.number().min(0).max(100).optional(),
  })
  .strict();

export const assetOverridesSchema = z
  .object({
    overrides: z
      .array(imageAssetOverrideSchema)
      .max(200, 'Demasiadas substituições.'),
  })
  .strict();

export const MENU_CATEGORIES = ['carnes', 'mar', 'entradas', 'acompanhamentos', 'sobremesas', 'vinhos'] as const;

const imageField = z
  .string()
  .trim()
  .max(2000, 'O link da imagem é demasiado longo.')
  .optional()
  .default('')
  .refine((value) => value === '' || /^https?:\/\//i.test(value), 'O link da imagem tem de começar por http:// ou https://.');

export const menuItemSchema = z
  .object({
    id: z.string().trim().min(1, 'O identificador é obrigatório.').max(80),
    name: z.string().trim().min(1, 'O nome do prato é obrigatório.').max(120),
    price: z.number({ invalid_type_error: 'Preço inválido.' }).nonnegative('Preço inválido.').max(10000, 'Preço demasiado alto.'),
    currency: z.string().trim().min(1).max(10).default('€'),
    category: z.enum(MENU_CATEGORIES, { message: 'Categoria inválida.' }),
    badge: z.string().trim().max(80).optional().default(''),
    tagline: z.string().trim().max(160).optional().default(''),
    description: z.string().trim().min(1, 'A descrição é obrigatória.').max(2000),
    imageUrl: imageField,
    dryAgedDays: z.number().int().min(0).max(300).optional(),
    servesCount: z.string().trim().max(80).optional().default(''),
    origin: z.string().trim().max(200).optional().default(''),
    pairingWine: z.string().trim().max(200).optional().default(''),
    isChefSpecial: z.boolean().optional().default(false),
    visible: z.boolean().optional().default(true),
    order: z.number().int().min(0).optional(),
  })
  .strict()
  .nullable();

export const menuItemsSchema = z
  .object({
    items: z.array(menuItemSchema).max(300, 'Demasiados pratos.'),
  })
  .strict();

export const siteContentSchema = z
  .object({
    contactEmail: emailField,
    phone: z.string().trim().max(40).optional().default(''),
    address: z.string().trim().max(200).optional().default(''),
    hours: z.string().trim().max(240).optional().default(''),
    headline: z.string().trim().max(160).optional().default(''),
    heroSubtitle: z.string().trim().max(240).optional().default(''),
    aboutTitle: z.string().trim().max(160).optional().default(''),
    aboutText: z.string().trim().max(4000).optional().default(''),
    instagram: z.string().trim().max(200).optional().default(''),
    facebook: z.string().trim().max(200).optional().default(''),
    videoUrl: z.string().trim().max(2000).optional().default(''),
  })
  .strict();

export const idParamSchema = z.coerce.number().int().positive();

export type ReservationInput = z.infer<typeof reservationSchema>;
export type ReservationProtectionInput = z.infer<typeof reservationProtectionSchema>;
export type AdminReservationInput = z.infer<typeof adminReservationSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReviewStatusInput = z.infer<typeof reviewStatusSchema>;
export type AdminTokenUpdateInput = z.infer<typeof adminTokenUpdateSchema>;
export type ClosedPeriodInput = z.infer<typeof closedPeriodSchema>;
export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
export type AssetOverrideInput = z.infer<typeof assetOverridesSchema>['overrides'][number];
export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type MenuItemsInput = z.infer<typeof menuItemsSchema>;
export type SiteContentInput = z.infer<typeof siteContentSchema>;