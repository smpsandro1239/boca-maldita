import { MENU_CATEGORIES, type MenuCategory } from '../../shared/contracts';

// A lista de categorias vive em shared/contracts.ts para servidor e cliente
// discordarem nunca. As labels e a ordem continuam aqui porque são UI.
export { MENU_CATEGORIES };
export type { MenuCategory };

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