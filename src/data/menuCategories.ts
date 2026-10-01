export const MENU_CATEGORIES = ['diarias', 'carnes', 'mar', 'entradas', 'acompanhamentos', 'sobremesas', 'vinhos', 'bebidas'] as const;

export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const MENU_CATEGORY_LABELS: Record<MenuCategory, string> = {
  diarias: 'Prato do Dia',
  carnes: 'Carnes Nobres & Dry-Aged',
  mar: 'Peixe & Mar',
  entradas: 'Entradas de Assinatura',
  acompanhamentos: 'Acompanhamentos',
  vinhos: 'Carta de Vinhos',
  sobremesas: 'Sobremesas',
  bebidas: 'Bebidas & Refrescos',
};

export const MENU_CATEGORY_ORDER: MenuCategory[] = ['entradas', 'acompanhamentos', 'sobremesas', 'diarias', 'carnes', 'mar', 'vinhos', 'bebidas'];