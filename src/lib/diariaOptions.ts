import type { MenuItem } from '../types';

export type DiariaSlotKind = 'meat' | 'fish';

/**
 * Os ids guardados num agendamento têm de aparecer nas opcoes do editor, senao
 * o <select> cai no placeholder e faz o utilizador jurar que o agendamento esta vazio.
 * As diarias (category 'diarias') contam como prato de carne e de peixe.
 */
const SLOT_CATEGORIES: Record<DiariaSlotKind, Set<string>> = {
  meat: new Set(['carnes', 'diarias']),
  fish: new Set(['mar', 'diarias']),
};

export function buildDiariaOptions(items: MenuItem[], kind: DiariaSlotKind): MenuItem[] {
  const allowed = SLOT_CATEGORIES[kind];
  const seen = new Set<string>();
  const out: MenuItem[] = [];
  for (const item of items) {
    if (!allowed.has(item.category)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/**
 * Garante que qualquer id ja guardado num agendamento tem uma opcao correspondente,
 * mesmo que nao exista em items (ex.: prato apagado da carta depois de agendado).
 */
export function buildDiariaOptionsWithCurrent(
  items: MenuItem[],
  kind: DiariaSlotKind,
  currentIds: readonly string[],
): MenuItem[] {
  const options = buildDiariaOptions(items, kind);
  const present = new Set(options.map((item) => item.id));
  const missing: MenuItem[] = [];
  for (const id of currentIds) {
    if (!id || present.has(id)) continue;
    present.add(id);
    const known = items.find((item) => item.id === id);
    missing.push(
      known ?? {
        id,
        name: id,
        price: 0,
        currency: '€',
        category: 'diarias',
        description: '',
        imageUrl: '',
      },
    );
  }
  return [...options, ...missing];
}