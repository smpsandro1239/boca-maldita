import { useState, type FormEvent } from 'react';
import { ScreenType, MenuItem } from '../types';
import { MENU_ITEMS } from '../data/menuData';
import { createReservation } from '../lib/api';
import { 
  Play, 
  Flame, 
  Wine, 
  Utensils, 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  ArrowRight, 
  Car, 
  Check, 
  Copy,
  AlertCircle
} from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onOpenVideo: () => void;
  onSelectDish: (dish: MenuItem) => void;
  heroChefUrl: string;
  reviewerUrl: string;
  diningRoomUrl: string;
  dryAgingUrl: string;
  mapUrl: string;
  contactEmail: string;
  onCopyImageUrl: (url: string) => void;
}

export default function HomeScreen({
  onNavigate,
  onOpenVideo,
  onSelectDish,
  heroChefUrl,
  reviewerUrl,
  diningRoomUrl,
  dryAgingUrl,
  mapUrl,
  contactEmail,
  onCopyImageUrl
}: HomeScreenProps) {
  const [activeMenuTab, setActiveMenuTab] = useState<'carnes' | 'mar'>('carnes');
  const [quickBookingSuccess, setQuickBookingSuccess] = useState(false);
  const [isQuickBookingLoading, setIsQuickBookingLoading] = useState(false);
  const [quickBookingError, setQuickBookingError] = useState<string | null>(null);
  const [bookingFormData, setBookingFormData] = useState({
    nome: '',
    email: '',
    data: '',
    convidados: '2 Pessoas',
    telefone: ''
  });

  const featuredDishes = activeMenuTab === 'carnes'
    ? MENU_ITEMS.filter(i => i.category === 'carnes').slice(0, 4)
    : MENU_ITEMS.filter(i => i.category === 'mar' || i.category === 'entradas').slice(0, 4);

  const handleQuickBooking = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingFormData.nome || !bookingFormData.email || !bookingFormData.telefone) return;
    setIsQuickBookingLoading(true);
    setQuickBookingError(null);
    try {
      const guests = Number.parseInt(bookingFormData.convidados, 10) || 2;
      await createReservation({
        name: bookingFormData.nome,
        email: bookingFormData.email,
        phone: bookingFormData.telefone,
        date: bookingFormData.data,
        time: '20:00',
        guests,
        area: 'Salão Nobre da Brasa',
        occasion: 'Pré-Reserva Rápida',
      });
      setQuickBookingSuccess(true);
      setTimeout(() => {
        setQuickBookingSuccess(false);
        setBookingFormData({
          nome: '',
          email: '',
          data: '',
          convidados: '2 Pessoas',
          telefone: ''
        });
      }, 4500);
    } catch (err) {
      setQuickBookingError(err instanceof Error ? err.message : 'Ocorreu um erro ao enviar a reserva.');
    } finally {
      setIsQuickBookingLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">

      {/* ================= HERO SECTION ================= */}
      <section className="relative w-full overflow-hidden bg-[#0C0D0E]">
        <div className="max-w-7xl mx-auto px-5 lg:px-12 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            
            {/* Left Column: Chef Plating Media + Testimonial Card */}
            <div className="lg:col-span-6 relative w-full group">
              <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[620px] bg-[#141518] border border-[#282A30] overflow-hidden shadow-2xl">
                {heroChefUrl ? (
                  <img
                    src={heroChefUrl}
                    alt="Mestre assador a finalizar prato de carne nobre grelhada com pinça no Boca Maldita"
                    className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0C0D0E]/90 via-[#0C0D0E]/20 to-transparent pointer-events-none"></div>

                {/* Badge Overlay Top Left */}
                <div className="absolute top-4 left-4 bg-[#0C0D0E]/90 backdrop-blur-md px-4 py-1.5 border border-[#282A30] shadow-md flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-[#D4A373]" />
                  <span className="text-[11px] uppercase text-[#D4A373] tracking-[0.25em] font-mono">
                    Fogo &amp; Brasa Nobre
                  </span>
                </div>

                {/* Direct Image Link Button on Media */}
                <button
                  onClick={() => onCopyImageUrl(heroChefUrl)}
                  className="absolute top-4 right-4 bg-[#0C0D0E]/90 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#A6A8AD] text-[10px] uppercase font-mono px-2.5 py-1.5 border border-[#282A30] opacity-90 group-hover:opacity-100 transition-all flex items-center gap-1.5"
                  title="Copiar URL direta da foto do Chef"
                >
                  <Copy className="w-3 h-3" />
                  <span className="hidden sm:inline">Link da Imagem</span>
                </button>

                {/* Overlaid Review Card (Bottom Right, matching AT Restaurant screenshot) */}
                <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 max-w-[320px] sm:max-w-[340px] bg-[#141518]/95 backdrop-blur-md p-5 border border-[#282A30] shadow-2xl">
                  <p className="text-xs sm:text-sm text-[#F7F5F0] italic leading-snug font-sans">
                    “Uma experiência carnívora inesquecível em Vila de Prado. O ponto da carne maturada e os aromas a lenha são de uma perfeição rara.”
                  </p>
                  <div className="mt-3 pt-3 border-t border-[#282A30] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 overflow-hidden bg-[#1C1E22] border border-[#282A30] shrink-0">
                        {reviewerUrl ? (
                          <img
                            src={reviewerUrl}
                            alt="Gonçalo Vilar"
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#F7F5F0] leading-tight">
                          Gonçalo Vilar
                        </div>
                        <div className="text-[10px] text-[#A6A8AD] uppercase tracking-wider">
                          Crítico Gastronómico
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-[#D4A373]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[#D4A373] text-[#D4A373]" />
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Editorial Hero Copy & Actions */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6 lg:pl-4">
              
              {/* Eyebrow badge with horizontal gold rule */}
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.25em] text-[#D4A373] font-sans font-semibold">
                  BEM-VINDO AO BOCA MALDITA
                </span>
                <span className="h-[1.5px] w-14 bg-[#D4A373] block"></span>
              </div>

              {/* Main Display Headline */}
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#F7F5F0] leading-[1.08] tracking-tight">
                Onde o Fogo Encontra a Perfeição Gastronómica.
              </h1>

              {/* Supporting Copy */}
              <p className="text-base sm:text-lg text-[#A6A8AD] leading-relaxed max-w-xl font-sans">
                Uma viagem sensorial de carnes nobres grelhadas com mestria, vinhos selecionados e um ambiente intimista e acolhedor em Vila de Prado.
              </p>

              {/* CTA Action Buttons: Button + Round Video Play Trigger */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <button
                  onClick={() => onNavigate('menu-carnes')}
                  className="inline-flex items-center justify-center bg-[#D4A373] text-[#0C0D0E] font-sans text-xs uppercase px-8 py-3.5 hover:bg-[#C59D5F] transition-all duration-300 font-semibold tracking-[0.18em]"
                >
                  Conhecer o Menu
                </button>

                {/* Round video play button with warm gold aura */}
                <button
                  type="button"
                  onClick={onOpenVideo}
                  className="group flex items-center gap-3.5 cursor-pointer text-left focus:outline-none"
                  aria-label="Assistir ao vídeo da experiência do restaurante"
                >
                  <div className="relative w-13 h-13 sm:w-14 sm:h-14 bg-[#D4A373] flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:bg-[#C59D5F] transition-all duration-300">
                    <Play className="w-6 h-6 text-[#0C0D0E] translate-x-0.5 fill-current" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase text-[#F7F5F0] tracking-widest font-semibold group-hover:text-[#D4A373] transition-colors">
                      Assistir ao Vídeo
                    </span>
                    <span className="text-[11px] text-[#686B73]">
                      A Arte da Brasa (01:45)
                    </span>
                  </div>
                </button>
              </div>

              {/* Quick Badges Metric Strip (45+ Dry-aged, 100% Azinho, 180+ Rótulos) */}
              <div className="pt-4 grid grid-cols-3 gap-3 sm:gap-4 bg-[#141518] border border-[#282A30] p-4 sm:p-5 mt-4">
                <div>
                  <div className="font-serif text-2xl sm:text-3xl text-[#D4A373] font-semibold">45+</div>
                  <div className="text-[10px] sm:text-xs text-[#A6A8AD] uppercase tracking-wider font-sans mt-0.5">
                    Dias Maturação Dry-Aged
                  </div>
                </div>
                <div>
                  <div className="font-serif text-2xl sm:text-3xl text-[#F7F5F0] font-semibold">100%</div>
                  <div className="text-[10px] sm:text-xs text-[#A6A8AD] uppercase tracking-wider font-sans mt-0.5">
                    Carvão de Azinho Nobre
                  </div>
                </div>
                <div>
                  <div className="font-serif text-2xl sm:text-3xl text-[#D4A373] font-semibold">180+</div>
                  <div className="text-[10px] sm:text-xs text-[#A6A8AD] uppercase tracking-wider font-sans mt-0.5">
                    Rótulos na Garrafeira
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Quick Contact & Hours Strip Beneath Hero */}
        <div className="w-full bg-[#141518] border-y border-[#282A30]">
          <div className="max-w-7xl mx-auto px-5 lg:px-12 py-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#A6A8AD]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4A373] shrink-0" />
              <span>Avenida do Cávado, Vila de Prado, Vila Verde 4730-460 Portugal</span>
            </div>
            <div className="flex items-center gap-6">
              <a
                href="tel:+351253031890"
                className="flex items-center gap-2 text-[#F7F5F0] hover:text-[#D4A373] transition-colors font-mono"
              >
                <Phone className="w-3.5 h-3.5 text-[#D4A373]" />
                <span>+351 253 031 890</span>
              </a>
              <span className="hidden sm:inline text-[#686B73]">•</span>
              <span className="text-[#D4A373] font-medium">
                Almoço 12h–15h | Jantar 19h30–23h
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ABOUT & CONCEPT SECTION ================= */}
      <section className="w-full py-20 lg:py-24 bg-[#0C0D0E] border-b border-[#282A30]">
        <div className="max-w-7xl mx-auto px-5 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Story text and philosophy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-xs uppercase text-[#D4A373] tracking-[0.25em] font-sans font-semibold">
                  Tradição &amp; Alta Mestria
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0] leading-tight">
                  O culto da brasa viva e do detalhe culinário.
                </h2>
              </div>
              <p className="text-sm sm:text-base text-[#A6A8AD] leading-relaxed font-sans">
                O Boca Maldita nasceu para celebrar o ritual atemporal do fogo. Em Vila de Prado, à beira do Cávado, criámos um refúgio onde o calor das brasas de azinho revela a essência mais profunda de cada corte selecionado. Não mascaramos a matéria-prima: enaltecemo-la com paciência, temperatura rigorosa e ciência de maturação.
              </p>
              <p className="text-sm sm:text-base text-[#A6A8AD] leading-relaxed font-sans">
                A nossa adega complementa esta narrativa telúrica com colheitas raras das melhores quintas do Douro, Dão, Bairrada e referências internacionais de renome mundial, orquestradas pelo nosso sommelier residente.
              </p>

              {/* 3 Concept Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="bg-[#141518] border border-[#282A30] p-4 space-y-2">
                  <Flame className="w-6 h-6 text-[#D4A373]" />
                  <h3 className="font-serif text-base text-[#F7F5F0]">Carnes Maturadas</h3>
                  <p className="text-xs text-[#A6A8AD] leading-normal">
                    Câmaras de humidade e temperatura controladas até 90 dias.
                  </p>
                </div>
                <div className="bg-[#141518] border border-[#282A30] p-4 space-y-2">
                  <Wine className="w-6 h-6 text-[#D4A373]" />
                  <h3 className="font-serif text-base text-[#F7F5F0]">Garrafeira Curada</h3>
                  <p className="text-xs text-[#A6A8AD] leading-normal">
                    Harmonizações afinadas com castas autóctones e vinhos de guarda.
                  </p>
                </div>
                <div className="bg-[#141518] border border-[#282A30] p-4 space-y-2">
                  <Utensils className="w-6 h-6 text-[#D4A373]" />
                  <h3 className="font-serif text-base text-[#F7F5F0]">Ambiente Exclusivo</h3>
                  <p className="text-xs text-[#A6A8AD] leading-normal">
                    Iluminação cénica e hospitalidade minhota acolhedora.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('o-restaurante')}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D4A373] hover:text-[#F7F5F0] font-sans font-semibold transition-colors"
                >
                  <span>Conhecer a História do Restaurante</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Composition: Mosaic Images */}
            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="h-64 sm:h-80 bg-[#1C1E22] border border-[#282A30] overflow-hidden relative group">
                  {diningRoomUrl ? (
                    <img
                      src={diningRoomUrl}
                      alt="Salão nobre do Boca Maldita em Vila de Prado"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                  <button
                    onClick={() => onCopyImageUrl(diningRoomUrl)}
                    className="absolute bottom-2 right-2 bg-[#0C0D0E]/80 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#F7F5F0] text-[10px] px-2 py-1 uppercase font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copiar link da imagem"
                  >
                    Copiar URL
                  </button>
                </div>
                <div className="p-4 bg-[#141518] border border-[#282A30]">
                  <div className="font-serif text-lg text-[#D4A373]">Vila de Prado</div>
                  <div className="text-xs text-[#A6A8AD] mt-1">
                    Às margens do Cávado, com estacionamento privativo e terraço acolhedor.
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-8 sm:pt-12">
                <div className="p-5 bg-[#D4A373] text-[#0C0D0E]">
                  <div className="text-[10px] uppercase tracking-widest font-mono font-bold">
                    COMPROMISSO
                  </div>
                  <div className="font-serif text-lg sm:text-xl font-semibold mt-1 leading-snug">
                    Carne com Denominação de Origem Protegida
                  </div>
                </div>
                <div className="h-64 sm:h-80 bg-[#1C1E22] border border-[#282A30] overflow-hidden relative group">
                  {dryAgingUrl ? (
                    <img
                      src={dryAgingUrl}
                      alt="Câmara de maturação dry-aged"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                  <button
                    onClick={() => onCopyImageUrl(dryAgingUrl)}
                    className="absolute bottom-2 right-2 bg-[#0C0D0E]/80 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#F7F5F0] text-[10px] px-2 py-1 uppercase font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copiar link da imagem"
                  >
                    Copiar URL
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= FEATURED MENU & SPECIALTIES ================= */}
      <section className="w-full py-20 lg:py-24 bg-[#0C0D0E] border-b border-[#282A30]" id="cardapio">
        <div className="max-w-7xl mx-auto px-5 lg:px-12">
          
          {/* Section Header with Tabs */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase text-[#D4A373] tracking-[0.25em] font-sans font-semibold">
                  Assinaturas da Brasa
                </span>
                <span className="h-[1.5px] w-12 bg-[#D4A373] block"></span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0]">
                Especialidades que Definem a Boca Maldita
              </h2>
              <p className="text-sm text-[#A6A8AD]">
                Cortes selecionados pelo nosso chef executivo, preparados lentamente em grelha basculante de carvão vegetal puro.
              </p>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 bg-[#141518] p-1 border border-[#282A30]">
              <button
                type="button"
                onClick={() => setActiveMenuTab('carnes')}
                className={`text-xs uppercase px-5 py-2.5 font-sans font-semibold tracking-wider transition-colors ${
                  activeMenuTab === 'carnes'
                    ? 'bg-[#D4A373] text-[#0C0D0E]'
                    : 'text-[#A6A8AD] hover:text-[#F7F5F0]'
                }`}
              >
                Carnes Nobres
              </button>
              <button
                type="button"
                onClick={() => setActiveMenuTab('mar')}
                className={`text-xs uppercase px-5 py-2.5 font-sans font-semibold tracking-wider transition-colors ${
                  activeMenuTab === 'mar'
                    ? 'bg-[#D4A373] text-[#0C0D0E]'
                    : 'text-[#A6A8AD] hover:text-[#F7F5F0]'
                }`}
              >
                Mar &amp; Entradas
              </button>
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDishes.map(dish => (
              <div
                key={dish.id}
                onClick={() => onSelectDish(dish)}
                className="bg-[#141518] border border-[#282A30] flex flex-col justify-between group overflow-hidden shadow-lg hover:border-[#D4A373]/60 cursor-pointer transition-all duration-300"
              >
                <div>
                  <div className="h-60 overflow-hidden relative bg-[#0C0D0E]">
                    {dish.imageUrl ? (
                      <img
                        src={dish.imageUrl}
                        alt={dish.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : null}
                    {dish.badge && (
                      <span className="absolute top-3 right-3 bg-[#0C0D0E]/90 text-[#D4A373] text-[10px] px-2.5 py-1 uppercase tracking-wider font-mono border border-[#D4A373]/30">
                        {dish.badge}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-[#D4A373] text-[#0C0D0E] text-[11px] font-sans uppercase tracking-widest px-3 py-1 font-semibold">
                        Ver Detalhes &amp; Prova
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-serif text-lg text-[#F7F5F0] group-hover:text-[#D4A373] transition-colors">
                        {dish.name}
                      </h3>
                      <span className="font-serif text-lg text-[#D4A373] font-semibold shrink-0">
                        {dish.currency}{dish.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-[#A6A8AD] line-clamp-3 leading-relaxed">
                      {dish.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex items-center justify-between border-t border-[#282A30]/50 text-[10px] text-[#686B73] uppercase tracking-widest">
                  <span>{dish.tagline || 'Especialidade da Casa'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#D4A373] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>

          {/* Full Menu Navigation Action */}
          <div className="mt-14 text-center">
            <button
              onClick={() => onNavigate('menu-carnes')}
              className="inline-flex items-center gap-2 text-[#F7F5F0] hover:text-[#D4A373] text-xs uppercase tracking-[0.2em] font-sans font-semibold transition-colors group"
            >
              <span>Consultar Carta de Vinhos e Menu Completo</span>
              <ArrowRight className="w-4 h-4 text-[#D4A373] group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>

        </div>
      </section>

      {/* ================= RESERVATION PROMPT BANNER ================= */}
      <section className="w-full py-20 lg:py-24 bg-[#141518] border-b border-[#282A30] relative">
        <div className="max-w-7xl mx-auto px-5 lg:px-12">
          <div className="bg-[#1C1E22] border border-[#282A30] p-6 sm:p-10 lg:p-14 relative overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
              
              {/* Left: Text and Phone Line Direct */}
              <div className="lg:col-span-7 space-y-6">
                <span className="text-xs uppercase text-[#D4A373] tracking-[0.25em] font-sans font-semibold">
                  Mesa Privilegiada
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0] leading-tight">
                  Reserve a sua experiência gastronómica.
                </h2>
                <p className="text-sm text-[#A6A8AD] max-w-xl leading-relaxed">
                  Garantimos um serviço atento e personalizado. Devido ao processo cuidadoso de preparação dos nossos cortes especiais maturados, recomendamos reserva prévia.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                  <a
                    href="tel:+351253031890"
                    className="flex items-center gap-3.5 text-[#F7F5F0] hover:text-[#D4A373] transition-colors"
                  >
                    <div className="w-12 h-12 bg-[#D4A373] text-[#0C0D0E] flex items-center justify-center font-bold">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-[#A6A8AD] uppercase tracking-wider font-mono">
                        Linha Direta de Reserva
                      </div>
                      <div className="font-serif text-xl font-semibold text-[#D4A373]">
                        +351 253 031 890
                      </div>
                    </div>
                  </a>

                  <div className="h-10 w-[1px] bg-[#282A30] hidden sm:block"></div>

                  <div className="text-xs text-[#A6A8AD]">
                    <div className="text-[10px] uppercase text-[#686B73] tracking-wider font-mono">
                      Confirmação Imediata
                    </div>
                    <div className="text-[#F7F5F0] mt-0.5">
                      Atendimento telefónico das 11h às 23h
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Quick Interactive Booking Form Container */}
              <div className="lg:col-span-5 bg-[#141518] border border-[#282A30] p-6 shadow-xl">
                <form onSubmit={handleQuickBooking} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl text-[#F7F5F0]">
                      Pré-Reserva Rápida
                    </h3>
                    <span className="text-[10px] font-mono text-[#D4A373] uppercase">
                      Passo 1 de 1
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] uppercase text-[#A6A8AD] tracking-wider mb-1 font-sans">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={bookingFormData.nome}
                        onChange={(e) => setBookingFormData({...bookingFormData, nome: e.target.value})}
                        placeholder="Ex.: Bernardo Silva"
                        className="w-full bg-[#1C1E22] text-[#F7F5F0] px-3.5 py-2.5 text-xs border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase text-[#A6A8AD] tracking-wider mb-1 font-sans">
                        Email de Confirmação
                      </label>
                      <input
                        type="email"
                        required
                        value={bookingFormData.email}
                        onChange={(e) => setBookingFormData({...bookingFormData, email: e.target.value})}
                        placeholder="nome@exemplo.pt"
                        className="w-full bg-[#1C1E22] text-[#F7F5F0] px-3.5 py-2.5 text-xs border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] uppercase text-[#A6A8AD] tracking-wider mb-1 font-sans">
                          Data
                        </label>
                        <input
                          type="date"
                          required
                          value={bookingFormData.data}
                          onChange={(e) => setBookingFormData({...bookingFormData, data: e.target.value})}
                          className="w-full bg-[#1C1E22] text-[#F7F5F0] px-3 py-2.5 text-xs border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] uppercase text-[#A6A8AD] tracking-wider mb-1 font-sans">
                          Convidados
                        </label>
                        <select
                          value={bookingFormData.convidados}
                          onChange={(e) => setBookingFormData({...bookingFormData, convidados: e.target.value})}
                          className="w-full bg-[#1C1E22] text-[#F7F5F0] px-3 py-2.5 text-xs border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                        >
                          <option value="2 Pessoas">2 Pessoas</option>
                          <option value="3 Pessoas">3 Pessoas</option>
                          <option value="4 Pessoas">4 Pessoas</option>
                          <option value="6 Pessoas">6 Pessoas</option>
                          <option value="8+ Pessoas (Grupo)">8+ Pessoas (Grupo)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase text-[#A6A8AD] tracking-wider mb-1 font-sans">
                        Telefone / Telemóvel
                      </label>
                      <input
                        type="tel"
                        required
                        value={bookingFormData.telefone}
                        onChange={(e) => setBookingFormData({...bookingFormData, telefone: e.target.value})}
                        placeholder="+351 9xx xxx xxx"
                        className="w-full bg-[#1C1E22] text-[#F7F5F0] px-3.5 py-2.5 text-xs border border-[#282A30] focus:border-[#D4A373] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isQuickBookingLoading}
                    className="w-full bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] disabled:opacity-60 disabled:cursor-not-allowed text-xs uppercase font-sans font-semibold py-3 transition-colors tracking-[0.18em]"
                  >
                    {isQuickBookingLoading ? 'A Enviar Pedido…' : 'Solicitar Reserva de Mesa'}
                  </button>

                  {quickBookingError && (
                    <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{quickBookingError}</span>
                    </div>
                  )}

                  {quickBookingSuccess && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Pedido de reserva recebido com sucesso! A equipa entrará em contacto imediato.</span>
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => onNavigate('reservas')}
                      className="text-[11px] text-[#A6A8AD] hover:text-[#D4A373] underline uppercase tracking-wider"
                    >
                      Ou use o sistema completo com escolha de sala &gt;
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ================= LOCATION & HORÁRIOS SECTION ================= */}
      <section className="w-full py-20 lg:py-24 bg-[#0C0D0E]">
        <div className="max-w-7xl mx-auto px-5 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
            
            {/* Left: Map / Visual Location */}
            <div className="lg:col-span-7 space-y-4">
              <div className="space-y-1">
                <span className="text-xs uppercase text-[#D4A373] tracking-[0.25em] font-sans font-semibold">
                  Como Chegar
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0]">
                  Vila de Prado, Vila Verde
                </h2>
              </div>

              {/* Map Preview Container */}
              <div className="w-full h-80 lg:h-96 bg-[#141518] border border-[#282A30] shadow-2xl relative overflow-hidden group">
                {mapUrl ? (
                  <img
                    src={mapUrl}
                    alt="Mapa de localização do Boca Maldita em Vila de Prado"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : null}
                
                {/* Floating Info Overlay */}
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm bg-[#0C0D0E]/95 backdrop-blur-md p-4 border border-[#282A30] shadow-xl">
                  <div className="flex items-center gap-2 text-[#D4A373]">
                    <Car className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider font-semibold font-sans">
                      Fácil Acesso &amp; Estacionamento
                    </span>
                  </div>
                  <p className="text-xs text-[#A6A8AD] mt-1 leading-relaxed">
                    A apenas 10 minutos do centro de Braga, junto à ponte histórica de Prado e às margens do Cávado.
                  </p>
                </div>

                <button
                  onClick={() => onCopyImageUrl(mapUrl)}
                  className="absolute top-3 right-3 bg-[#0C0D0E]/90 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#A6A8AD] text-[10px] px-2 py-1 font-mono uppercase border border-[#282A30] opacity-80 group-hover:opacity-100 transition-opacity"
                  title="Copiar URL direta da imagem do mapa"
                >
                  Link do Mapa
                </button>
              </div>
            </div>

            {/* Right: Detailed Schedule and Coordinates */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              
              {/* Horário Detalhado */}
              <div className="bg-[#141518] border border-[#282A30] p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2 text-[#D4A373]">
                  <Clock className="w-5 h-5" />
                  <h3 className="text-xs uppercase tracking-[0.2em] font-sans font-semibold">
                    Horário Detalhado
                  </h3>
                </div>

                <div className="space-y-3 text-xs text-[#A6A8AD]">
                  <div className="flex justify-between items-center py-1 border-b border-[#282A30]/60">
                    <span className="text-[#F7F5F0] font-medium">Terça a Sexta-feira</span>
                    <span>19h30 – 23h00</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#282A30]/60">
                    <span className="text-[#F7F5F0] font-medium">Sábado</span>
                    <span>12h00 – 15h00 | 19h30 – 23h30</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-[#282A30]/60">
                    <span className="text-[#F7F5F0] font-medium">Domingo</span>
                    <span>12h00 – 15h30 (Almoço de Família)</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-[#1C1E22] border border-[#282A30]">
                    <span className="text-[#D4A373] font-medium">Segunda-feira</span>
                    <span className="text-[#D4A373] uppercase tracking-widest text-[11px] font-mono">
                      Encerrado para Descanso
                    </span>
                  </div>
                </div>
              </div>

              {/* Coordinates & Direct Contacts */}
              <div className="bg-[#141518] border border-[#282A30] p-6 sm:p-8 space-y-3">
                <h3 className="text-xs uppercase tracking-[0.2em] text-[#D4A373] font-sans font-semibold">
                  Coordenadas &amp; Contactos
                </h3>
                <p className="text-xs text-[#A6A8AD] leading-relaxed">
                  Avenida do Cávado, Vila de Prado, Vila Verde<br />
                  4730-460 Portugal
                </p>
                <div className="pt-2 space-y-1">
                  <a
                    href="tel:+351253031890"
                    className="font-serif text-lg text-[#F7F5F0] hover:text-[#D4A373] transition-colors block"
                  >
                    +351 253 031 890
                  </a>
                  <a
                    href={`mailto:${contactEmail}`}
                    className="text-xs text-[#A6A8AD] hover:underline block"
                  >
                    {contactEmail}
                  </a>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
