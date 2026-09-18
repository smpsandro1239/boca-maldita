import { ScreenType } from '../types';
import { Flame, Wine, ShieldCheck, Award, Users, ThermometerSnowflake, ArrowRight, Copy } from 'lucide-react';
import AssetImage from '../components/AssetImage';

interface RestaurantScreenProps {
  onNavigate: (screen: ScreenType) => void;
  diningRoomUrl: string;
  dryAgingUrl: string;
  heroChefUrl: string;
  onCopyImageUrl: (url: string) => void;
}

export default function RestaurantScreen({
  onNavigate,
  diningRoomUrl,
  dryAgingUrl,
  heroChefUrl,
  onCopyImageUrl
}: RestaurantScreenProps) {
  return (
    <div className="w-full bg-[#0C0D0E] py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-5 lg:px-12 space-y-16 lg:space-y-24">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
            <span className="text-xs uppercase tracking-[0.25em] text-[#D4A373] font-sans font-semibold">
              A Nossa Casa &amp; Filosofia
            </span>
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#F7F5F0] leading-tight">
            O Santuário da Brasa em Vila de Prado
          </h1>
          <p className="text-base sm:text-lg text-[#A6A8AD] leading-relaxed">
            À beira das águas serenas do Rio Cávado, erguemos uma homenagem aos métodos ancestrais de assar na brasa com o rigor técnico da alta gastronomia contemporânea.
          </p>
        </div>

        {/* Section 1: The Origin Story & Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase text-[#D4A373] tracking-[0.2em] font-mono">
              CAPÍTULO I • HISTÓRIA &amp; GEOGRAFIA
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0] leading-tight">
              Entre a força do granito minhoto e a nobreza da lenha.
            </h2>
            <p className="text-sm text-[#A6A8AD] leading-relaxed">
              O Boca Maldita nasceu da ambição de criar no Minho um espaço de culto carnívoro de craveira internacional. Situado na histórica Vila de Prado, concelho de Vila Verde, o restaurante ocupa um edifício desenhado com materiais autóctones: pedra de granito escurecida, vigas de carvalho maciço e ferro forjado a fogo.
            </p>
            <p className="text-sm text-[#A6A8AD] leading-relaxed">
              Cada detalhe do espaço foi concebido para intensificar a experiência sensorial: a iluminação cénica rebaixa-se à mesa, destacando o brilho das facas forjadas à mão, os tons rubi dos vinhos e a caramelização perfeita da gordura na brasa.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-[#141518] border border-[#282A30]">
                <div className="font-serif text-2xl text-[#D4A373]">1.5°C</div>
                <div className="text-xs text-[#A6A8AD] mt-1">Temperatura precisa na câmara de maturação</div>
              </div>
              <div className="p-4 bg-[#141518] border border-[#282A30]">
                <div className="font-serif text-2xl text-[#F7F5F0]">100%</div>
                <div className="text-xs text-[#A6A8AD] mt-1">Carvão de azinho puro sem aditivos químicos</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-[400px] sm:h-[500px] bg-[#141518] border border-[#282A30] overflow-hidden group">
              {diningRoomUrl ? (
                <AssetImage
                  src={diningRoomUrl}
                  alt="Salão nobre do restaurante"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#D4A373] font-mono">Salão Principal</span>
                  <p className="text-sm text-[#F7F5F0] font-serif">Conforto intimista e vista para a garrafeira</p>
                </div>
                <button
                  onClick={() => onCopyImageUrl(diningRoomUrl)}
                  className="bg-[#0C0D0E]/80 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#F7F5F0] text-[10px] uppercase font-mono px-3 py-1.5 border border-[#282A30] flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  <span>Link da Imagem</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: The Science of Dry-Aging */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="relative h-[400px] sm:h-[500px] bg-[#141518] border border-[#282A30] overflow-hidden group">
              {dryAgingUrl ? (
                <AssetImage
                  src={dryAgingUrl}
                  alt="Câmara de maturação dry-aged"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#D4A373] font-mono">Câmara com Sal Rosa</span>
                  <p className="text-sm text-[#F7F5F0] font-serif">Processo Dry-Aged controlado até 90 dias</p>
                </div>
                <button
                  onClick={() => onCopyImageUrl(dryAgingUrl)}
                  className="bg-[#0C0D0E]/80 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#F7F5F0] text-[10px] uppercase font-mono px-3 py-1.5 border border-[#282A30] flex items-center gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  <span>Link da Imagem</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
            <span className="text-xs uppercase text-[#D4A373] tracking-[0.2em] font-mono">
              CAPÍTULO II • A MATURAÇÃO DRY-AGED
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0] leading-tight">
              O tempo como ingrediente secreto e invisível.
            </h2>
            <p className="text-sm text-[#A6A8AD] leading-relaxed">
              A nossa câmara envidraçada de maturação dry-aged é o coração biológico do Boca Maldita. Aqui, quartos traseiros inteiros de Vaca Velha Minhota, Barrosã e Rubia Galega repousam sob um microclima milimetricamente calibrado: temperatura entre 1°C e 2°C, humidade relativa de 75-80% e paredes revestidas com blocos maciços de sal rosa dos Himalaias.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <ThermometerSnowflake className="w-5 h-5 text-[#D4A373] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm text-[#F7F5F0] font-medium">Concentração de Sabores Naturais</h4>
                  <p className="text-xs text-[#A6A8AD]">A evaporação controlada de humidade intensifica as notas de nozes, manteiga tostada e cogumelos selvagens.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#D4A373] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm text-[#F7F5F0] font-medium">Quebra Enzimática de Fibras</h4>
                  <p className="text-xs text-[#A6A8AD]">As enzimas naturais quebram as ligações colagénicas, resultando numa maciez tão suave que a carne se corta apenas com garfo.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-[#D4A373] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm text-[#F7F5F0] font-medium">Certificação &amp; Rastreabilidade</h4>
                  <p className="text-xs text-[#A6A8AD]">Trabalhamos exclusivamente com produtores locais que garantem bem-estar animal e alimentação 100% a pasto.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: The Chef & The Flame */}
        <div className="bg-[#141518] border border-[#282A30] p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-4 h-72 sm:h-80 bg-[#0C0D0E] border border-[#282A30] overflow-hidden relative group">
            {heroChefUrl ? (
              <AssetImage
                src={heroChefUrl}
                alt="Mestre da grelha"
                className="w-full h-full object-cover"
              />
            ) : null}
            <button
              onClick={() => onCopyImageUrl(heroChefUrl)}
              className="absolute top-3 right-3 bg-[#0C0D0E]/80 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#F7F5F0] text-[10px] uppercase font-mono px-2 py-1"
            >
              Link da Imagem
            </button>
          </div>

          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#D4A373]" />
              <span className="text-xs uppercase tracking-widest text-[#D4A373] font-mono">
                A EQUIPA &amp; OS MESTRES ASSADORES
              </span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#F7F5F0]">
              “Grelhar não é queimar: é conduzir o calor com respeito e paciência.”
            </h3>
            <p className="text-sm text-[#A6A8AD] leading-relaxed">
              O nosso chef executivo e a sua brigada dominam as grelhas basculantes de manivela, desenhadas à medida para permitir um controlo milimétrico da distância entre a carne e o leito incandescente de carvão de azinho. Cada corte recebe a sua curva de calor ideal: selagem rápida a altas temperaturas ou descanso paciente no topo da lareira para distribuição homogénea dos sucos.
            </p>
            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={() => onNavigate('menu-carnes')}
                className="bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] text-xs uppercase font-sans font-semibold px-6 py-3 tracking-widest transition-colors"
              >
                Explorar Carta de Cortes
              </button>
              <button
                onClick={() => onNavigate('reservas')}
                className="bg-[#1C1E22] hover:bg-[#282A30] text-[#F7F5F0] border border-[#282A30] text-xs uppercase font-sans px-6 py-3 tracking-widest transition-colors"
              >
                Reservar Mesa
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
