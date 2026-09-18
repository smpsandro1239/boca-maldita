import { useState, type MouseEvent } from 'react';
import { MenuItem } from '../types';
import { MENU_ITEMS } from '../data/menuData';
import { Search, Flame, Wine, Clock, Award, ArrowRight, Copy, Check } from 'lucide-react';

interface MenuScreenProps {
  onSelectDish: (dish: MenuItem) => void;
  onBookTable: () => void;
  onCopyImageUrl: (url: string) => void;
}

export default function MenuScreen({
  onSelectDish,
  onBookTable,
  onCopyImageUrl
}: MenuScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const categories = [
    { id: 'todas', label: 'Toda a Carta' },
    { id: 'carnes', label: 'Carnes Nobres & Dry-Aged' },
    { id: 'mar', label: 'Do Mar & Brasas' },
    { id: 'entradas', label: 'Entradas de Assinatura' },
    { id: 'acompanhamentos', label: 'Acompanhamentos' },
    { id: 'sobremesas', label: 'Sobremesas' }
  ];

  const filteredItems = MENU_ITEMS.filter(item => {
    const matchesCat = selectedCategory === 'todas' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.origin && item.origin.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCopyLink = (e: MouseEvent, url: string) => {
    e.stopPropagation();
    onCopyImageUrl(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

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

                    {/* Copy Direct Image Link Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(e, item.imageUrl)}
                      className="absolute bottom-3 left-3 bg-[#0C0D0E]/90 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#A6A8AD] text-[10px] uppercase font-mono px-2 py-1 border border-[#282A30] flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity"
                      title="Copiar URL direta desta imagem do prato"
                    >
                      {copiedUrl === item.imageUrl ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Link Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Link Direto</span>
                        </>
                      )}
                    </button>
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
