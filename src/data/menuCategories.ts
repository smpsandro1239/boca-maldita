export const MENU_CATEGORIES = ['carnes', 'mar', 'entradas', 'acompanhamentos', 'sobremesas', 'vinhos'] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const MENU_CATEGORY_LABELS: Record<MenuCategory, string> = {
  carnes: 'Carnes Nobres & Dry-Aged',
  mar: 'Do Mar & Brasas',
  entradas: 'Entradas de Assinatura',
  acompanhamentos: 'Acompanhamentos',
  vinhos: 'Carta de Vinhos',
  sobremesas: 'Sobremesas',
};