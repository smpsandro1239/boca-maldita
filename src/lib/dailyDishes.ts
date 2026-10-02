import type { MenuItem, PublicDailyRef } from '../types';
import { MENU_ITEMS } from '../data/menuData';

/**
 * O endpoint publico /api/diarias devolve so {id, visible}. Os cards do site
 * precisam do prato completo (preco, descricao, imagem), por isso os ids tem de
 * ser resolvidos contra a carta antes de renderizar.
 *
 * Sem isto, um agendamento com pratos devolve objetos sem `price` e o
 * `price.toFixed(2)` rebenta o render inteiro, deixando a pagina em branco.
 */
export function resolveDailyDishes(refs: PublicDailyRef[] | undefined, menuItems: MenuItem[]): MenuItem[] {
  if (!refs?.length) return [];
  const byId = new Map(menuItems.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const out: MenuItem[] = [];
  for (const ref of refs) {
    if (!ref || ref.visible === false) continue;
    if (seen.has(ref.id)) continue;
    const item = byId.get(ref.id);
    if (!item || item.visible === false) continue;
    seen.add(ref.id);
    out.push(item);
  }
  return out;
}

/**
 * Pratos do dia para mostrar: os agendados para a refeicao atual; se nao houver
 * agendamento, cai nos pratos "diarias" da carta; e na ultima instancia nos
 * platos de origem do codigo.
 */
export function pickDailyDishes(refs: PublicDailyRef[] | undefined, menuItems: MenuItem[], limit = 4): MenuItem[] {
  const scheduled = resolveDailyDishes(refs, menuItems);
  if (scheduled.length > 0) return scheduled.slice(0, limit);

  const fromSite = menuItems.filter((item) => item.category === 'diarias' && item.visible !== false);
  if (fromSite.length > 0) return fromSite.slice(0, limit);

  return MENU_ITEMS.filter((item) => item.category === 'diarias').slice(0, limit);
}