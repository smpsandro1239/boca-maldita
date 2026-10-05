import { useEffect, useState } from 'react';
import { MenuItem, PublicDiarias } from '../types';
import { useSite } from '../context/SiteContext';
import { Search, Flame, Wine, Clock, Award, ArrowRight, Check, UtensilsCrossed } from 'lucide-react';
import { MENU_CATEGORY_LABELS } from '../data/menuCategories';
import { MENU_ITEMS } from '../data/menuData';
import { getDiarias, diariaMealLabel } from '../lib/api';
import { pickDailyDishes } from '../lib/dailyDishes';

interface MenuScreenProps {
  onSelectDish: (dish: MenuItem) => void;
  onBookTable: () => void;
}

export default function MenuScreen({
  onSelectDish,
  onBookTable,
}: MenuScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [todayDiarias, setTodayDiarias] = useState<PublicDiarias | null>(null);
  const { menuItems } = useSite();

  useEffect(() => {
    let cancelled = false;
    getDiarias()
      .then((data) => {
        if (!cancelled) setTodayDiarias(data);
      })
      .catch(() => {
        if (!cancelled) setTodayDiarias(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = [
    { id: 'todas', label: 'Toda a Carta' },
    ...Object.entries(MENU_CATEGORY_LABELS).map(([id, label]) => ({ id, label }))
  ];

  const serviceDishes = todayDiarias && todayDiarias.currentMeal !== 'closed'
    ? pickDailyDishes(todayDiarias.currentMeal === 'lunch' ? todayDiarias.lunch : todayDiarias.dinner, menuItems)
    : [];

  const filteredItems = (() => {
    if (selectedCategory === 'diarias') {
      return pickDailyDishes(
        serviceDishes.length > 0 ? serviceDishes.map((d) => ({ id: d.id })) : undefined,
        menuItems,
      ).filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              (item.origin && item.origin.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      });
    }

    const merged = selectedCategory === 'todas'
      ? [...serviceDishes.filter((d) => !menuItems.some((m) => m.id === d.id)), ...menuItems]
      : menuItems;

    return merged.filter(item => {
      if (item.visible === false) return false;
      const matchesCat = selectedCategory === 'todas' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.origin && item.origin.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  })();

  return (
    <div className="w-full bg-[#0C0D0E] py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-5 lg:px-12 space-y-12">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
            <span className="text-xs uppercase tracking-[0.25em] text-[#D4A373] font-sans font-semibold">
              Carta Gastronómica &amp; Garrafeira
            </span>
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#F7F5F0] leading-tight">
            Menu &amp; Carnes Nobres
          </h1>
          <p className="text-base sm:text-lg text-[#A6A8AD] leading-relaxed">
            Cada corte é uma obra de paciência, maturação em câmara de sal dos Himalaias e mestria sobre as brasas de azinho alentejano.
          </p>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-[#141518] border border-[#282A30] p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Categories Horizontal Scroll */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-xs uppercase px-4 py-2 font-sans font-semibold tracking-wider transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#D4A373] text-[#0C0D0E]'
                    : 'bg-[#1C1E22] text-[#A6A8AD] hover:text-[#F7F5F0] border border-[#282A30]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#A6A8AD] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar corte ou prato..."
              className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] pl-9 pr-4 py-2.5 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
            />
          </div>

        </div>

        {/* Menu Executivo service note */}
        {selectedCategory === 'diarias' && (
          <div className="bg-[#141518] border border-[#282A30] px-4 py-3 text-xs text-[#A6A8AD] flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="flex items-center gap-2 text-[#D4A373] font-mono uppercase tracking-widest text-[10px]">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Menu Executivo
            </span>
            {todayDiarias && todayDiarias.currentMeal === 'closed' ? (
              <span>Hoje encerrado{todayDiarias.closedTitle ? ` — ${todayDiarias.closedTitle}` : ''}. A mostrar os pratos disponíveis.</span>
            ) : (
              <>
                <span>
                  Servido {diariaMealLabel(todayDiarias?.currentMeal ?? 'lunch').toLowerCase()} ({todayDiarias?.currentMeal === 'dinner' ? '19h30–23h' : '12h–16h'})
                </span>
                {todayDiarias?.hasSchedule && (
                  <span>
                    {todayDiarias.servedMeals.lunch && todayDiarias.servedMeals.dinner
                      ? 'Além disso, programado para almoço e jantar'
                      : todayDiarias.servedMeals.lunch
                        ? 'Programado só para o almoço'
                        : todayDiarias.servedMeals.dinner
                          ? 'Programado só para o jantar'
                          : 'Programação do dia sem serviço definido'}
                  </span>
                )}
                {!todayDiarias?.hasSchedule && <span>A mostrar os pratos regulares do Menu Executivo.</span>}
              </>
            )}
          </div>
        )}

        {/* Menu Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 text-[#A6A8AD] bg-[#141518] border border-[#282A30] p-8">
            <p className="text-lg">Nenhum item corresponde à sua pesquisa.</p>
            <button
              onClick={() => { setSelectedCategory('todas'); setSearchQuery(''); }}
              className="mt-4 text-xs uppercase tracking-widest text-[#D4A373] underline"
            >
              Limpar filtros e ver toda a carta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectDish(item)}
                className="bg-[#141518] border border-[#282A30] hover:border-[#D4A373]/60 transition-all duration-300 flex flex-col justify-between group cursor-pointer overflow-hidden shadow-xl"
              >
                <div>
                  {/* Item Image with Badges */}
                  <div className="h-64 overflow-hidden relative bg-[#0C0D0E]">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : null}
                    
                    {item.badge && (
                      <span className="absolute top-3 right-3 bg-[#0C0D0E]/90 text-[#D4A373] text-[10px] px-2.5 py-1 uppercase tracking-wider font-mono border border-[#D4A373]/40">
                        {item.badge}
                      </span>
                    )}

                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-serif text-xl text-[#F7F5F0] group-hover:text-[#D4A373] transition-colors leading-snug">
                        {item.name}
                      </h3>
                      <span className="font-serif text-xl text-[#D4A373] font-semibold shrink-0">
                        {item.currency}{item.price.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-[#A6A8AD] leading-relaxed line-clamp-3">
                      {item.description}
                    </p>

                    {/* Specifications */}
                    <div className="space-y-1.5 pt-2 border-t border-[#282A30]/60 text-[11px] text-[#A6A8AD]">
                      {item.category === 'vinhos' && (item.producer || item.vintage) && (
                        <div className="flex items-center gap-2">
                          <Wine className="w-3.5 h-3.5 text-[#D4A373] shrink-0" />
                          <span className="truncate">
                            {[item.producer, item.vintage].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                      )}
                      {item.origin && (
                        <div className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-[#D4A373] shrink-0" />
                          <span>{item.origin}</span>
                        </div>
                      )}
                      {item.pairingWine && (
                        <div className="flex items-center gap-2 text-[#D4A373]">
                          <Wine className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.pairingWine}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 flex items-center justify-between border-t border-[#282A30]/40">
                  <span className="text-[10px] uppercase tracking-widest text-[#686B73]">
                    {item.servesCount || 'Porção Individual'}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#D4A373] font-semibold uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                    <span>Detalhes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Booking Prompt */}
        <div className="p-8 lg:p-12 bg-[#141518] border border-[#282A30] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="font-serif text-2xl text-[#F7F5F0]">Deseja reservar uma prova especial?</h3>
            <p className="text-sm text-[#A6A8AD]">Preparamos cortes exclusivos sob encomenda com o sommelier residente.</p>
          </div>
          <button
            onClick={onBookTable}
            className="bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] font-sans text-xs uppercase font-semibold px-8 py-3.5 tracking-[0.18em] transition-colors whitespace-nowrap"
          >
            Garantir a Sua Mesa
          </button>
        </div>

      </div>
    </div>
  );
}
