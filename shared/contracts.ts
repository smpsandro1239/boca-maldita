/**
 * Contratos de RESPOSTA da API pública.
 *
 * Fonte única, partilhada entre o cliente (src/) e o servidor (server/).
 * Sem UI, sem zod, sem imports de src/ nem de server/.
 *
 * Porque isto existe: o Express declara `ResBody = any`, portanto `res.json()`
 * aceita qualquer objecto. Sem um tipo partilhado, o tsc nunca mais comparou a
 * forma que o servidor envia com a forma que o cliente declara — foi assim que
 * `PublicDailyRef` chegou ao cliente como `MenuItem` e o site caiu em runtime
 * (price undefined) com o typecheck verde.
 *
 * Tipar `res: Response<Tipo>` é o que fecha o buraco. Declarar o tipo aqui sem
 * o ligar ao handler é arrumação, não protecção.
 */

/** Endpoint → tipo de resposta. A FONTE DE VERDADE é o `Response<Tipo>` em cada
 *  handler; isto é só um índice para saber o que já está tipado.
 *
 *  GET /api/diarias              → PublicDiarias          [tipado]
 *  GET /api/menus                → (por tipar, fase 2)
 *  GET /api/reservations-config  → (por tipar, fase 2)
 *  resto dos endpoints públicos  → (por tipar, fase 2)
 *
 *  Não transformer isto num `const`: um mapa que nada lê diverge do primeiro
 *  endpoint que se acrescenta. */

/* ------------------------------------------------------------------ */
/* Categorias e carta                                                  */
/* ------------------------------------------------------------------ */

/** Array puro (sem UI) — o servidor valida com `z.enum(MENU_CATEGORIES)`.
 *  MENU_CATEGORY_LABELS e MENU_CATEGORY_ORDER continuam no cliente. */
export const MENU_CATEGORIES = ['diarias', 'carnes', 'mar', 'entradas', 'acompanhamentos', 'sobremesas', 'vinhos', 'bebidas'] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

/** Para os itens da categoria 'diarias': se o prato do dia é carne ou peixe. */
export type DailyKind = 'carne' | 'peixe';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  category: MenuCategory;
  badge?: string;
  tagline?: string;
  description: string;
  imageUrl: string;
  dryAgedDays?: number;
  servesCount?: string;
  origin?: string;
  pairingWine?: string;
  producer?: string;
  vintage?: string;
  isChefSpecial?: boolean;
  dailyKind?: DailyKind;
  visible?: boolean;
  order?: number;
}

/* ------------------------------------------------------------------ */
/* Diárias — a resposta que causou a queda                              */
/* ------------------------------------------------------------------ */

/**
 * Assimetria conhecida e intencional, registada aqui para não voltar a
 * parecer bug: o `DiariaSchedule` do cliente (src/types.ts) exige `lunch` e
 * `dinner`, mas o request do servidor (`DiariaScheduleRequest = z.input`)
 * torna-os opcionais por causa do `.default(true)`. O payload guardado
 * (`DiariaSchedulePayload = z.infer`, pós-transform) exige-os.
 *
 * O cliente é mais estrito do que o servidor, o que é seguro: nada do que o
 * cliente possa enviar é rejeitado. Alinhar os dois só faria ripple no
 * DiariasManager.
 */

export type PublicDiariaPeriod = 'lunch' | 'dinner' | 'closed';

/**
 * O endpoint público /api/diarias devolve apenas a referencia {id, visible} dos
 * pratos agendados, nao o prato completo. Usar isto como MenuItem rebenta em
 * runtime (price undefined), por isso ha que resolver contra a carta.
 *
 * Substitui o MenuItemLike duplicado em server/lib/diarias.ts.
 */
export interface PublicDailyRef {
  id: string;
  visible?: boolean;
}

export interface PublicDiarias {
  date: string;
  currentMeal: PublicDiariaPeriod;
  lunch: PublicDailyRef[];
  dinner: PublicDailyRef[];
  hasSchedule: boolean;
  servedMeals: { lunch: boolean; dinner: boolean };
  closedTitle: string | null;
}