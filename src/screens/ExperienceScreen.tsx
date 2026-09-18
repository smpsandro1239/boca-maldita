import { ScreenType } from '../types';
import { Play, Flame, Wine, Sparkles, Clock, Compass, Shield, ArrowRight } from 'lucide-react';

interface ExperienceScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onOpenVideo: () => void;
  heroChefUrl: string;
  diningRoomUrl: string;
}

export default function ExperienceScreen({
  onNavigate,
  onOpenVideo,
  heroChefUrl,
  diningRoomUrl
}: ExperienceScreenProps) {
  const steps = [
    {
      step: '01',
      title: 'A Seleção Rigorosa dos Cortes',
      desc: 'Trabalhamos com animais criados em pastoreio livre e alimentação natural no Norte de Portugal e Galiza. Apenas os animais com índice de marmoreio superior a 4 são selecionados para a nossa câmara.'
    },
    {
      step: '02',
      title: 'O Silêncio da Maturação a Seco',
      desc: 'Cada peça repousa entre 30 a 90 dias com humidade e temperatura controladas sobre blocos de sal dos Himalaias, desenvolvendo uma complexidade aromática comparável aos grandes vinhos de guarda.'
    },
    {
      step: '03',
      title: 'A Alquimia da Brasa de Azinho',
      desc: 'O fogo acende-se duas horas antes de cada serviço com carvão vegetal de azinho nobre, gerando brasas densas e puras sem chama viva direta, permitindo uma selagem estaladiça com centro aveludado.'
    },
    {
      step: '04',
      title: 'O Descanso & A Fatiagem à Mesa',
      desc: 'A carne descansa na grelha basculante superior para que os sucos e a temperatura se equilibrem. É servida em pratos de pedra vulcânica aquecida com flor de sal de Castro Marim.'
    }
  ];

  return (
    <div className="w-full bg-[#0C0D0E] py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-5 lg:px-12 space-y-16 lg:space-y-24">
        
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
            <span className="text-xs uppercase tracking-[0.25em] text-[#D4A373] font-sans font-semibold">
              Teatro Gastronómico
            </span>
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#F7F5F0] leading-tight">
            A Experiência Boca Maldita
          </h1>
          <p className="text-base sm:text-lg text-[#A6A8AD] leading-relaxed">
            Mais do que uma refeição: um ritual telúrico onde a matéria-prima, o fogo ancestral e o tempo se harmonizam com vinhos de exceção.
          </p>
        </div>

        {/* Video Feature Card */}
        <div className="relative bg-[#141518] border border-[#282A30] overflow-hidden shadow-2xl">
          <div className="relative h-[360px] sm:h-[460px] w-full">
            {heroChefUrl ? (
              <img
                src={heroChefUrl}
                alt="A Arte da Brasa"
                className="w-full h-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0C0D0E] via-[#0C0D0E]/40 to-transparent"></div>
            
            <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 space-y-4">
              <div className="flex items-center gap-2 text-[#D4A373]">
                <Flame className="w-5 h-5" />
                <span className="text-xs uppercase tracking-[0.2em] font-mono">DOCUMENTÁRIO OFICIAL</span>
              </div>
              
              <h2 className="font-serif text-2xl sm:text-4xl text-[#F7F5F0] max-w-2xl leading-tight">
                Assista ao documentário: “A Alma do Fogo em Vila de Prado”
              </h2>
              
              <div className="pt-2">
                <button
                  onClick={onOpenVideo}
                  className="inline-flex items-center gap-3 bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] text-xs uppercase font-sans font-semibold px-6 py-3.5 tracking-wider transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Assistir ao Filme (01:45)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* The 4 Ritual Steps */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase text-[#D4A373] tracking-[0.2em] font-mono">
                O RITUAL PASSO A PASSO
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#F7F5F0] mt-1">
                As Quatro Fases da Nossa Alquimia
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(step => (
              <div
                key={step.step}
                className="p-6 bg-[#141518] border border-[#282A30] space-y-4 relative group hover:border-[#D4A373]/60 transition-colors"
              >
                <div className="font-serif text-3xl text-[#D4A373] font-light">
                  {step.step}
                </div>
                <h3 className="font-serif text-lg text-[#F7F5F0] leading-snug">
                  {step.title}
                </h3>
                <p className="text-xs text-[#A6A8AD] leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Specialized Tables (Chef's Table & Wine Pairing) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-8 bg-[#141518] border border-[#282A30] space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#D4A373]">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs uppercase font-mono tracking-widest">EXCLUSIVIDADE</span>
              </div>
              <h3 className="font-serif text-2xl text-[#F7F5F0]">Mesa do Mestre Assador</h3>
              <p className="text-sm text-[#A6A8AD] leading-relaxed">
                Um balcão exclusivo para até 6 convidados, com vista frontal para a grelha basculante de carvão vegetal. O chef conduz pessoalmente um menu de 7 momentos com os cortes mais nobres da câmara.
              </p>
            </div>
            <div className="pt-4 border-t border-[#282A30]">
              <button
                onClick={() => onNavigate('reservas')}
                className="text-xs uppercase tracking-widest text-[#D4A373] hover:text-[#F7F5F0] font-sans font-semibold flex items-center gap-2"
              >
                <span>Solicitar Reserva no Balcão</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-8 bg-[#141518] border border-[#282A30] space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#D4A373]">
                <Wine className="w-4 h-4" />
                <span className="text-xs uppercase font-mono tracking-widest">HARMONIZAÇÃO</span>
              </div>
              <h3 className="font-serif text-2xl text-[#F7F5F0]">A Garrafeira Subterrânea</h3>
              <p className="text-sm text-[#A6A8AD] leading-relaxed">
                Mais de 180 referências selecionadas com curadoria rigorosa: vinhos velhos do Douro e Dão, colheitas raras da Bairrada, Alvarinhos de altitude e ícones de Bordeaux e Toscana guardados à temperatura ideal.
              </p>
            </div>
            <div className="pt-4 border-t border-[#282A30]">
              <button
                onClick={() => onNavigate('menu-carnes')}
                className="text-xs uppercase tracking-widest text-[#D4A373] hover:text-[#F7F5F0] font-sans font-semibold flex items-center gap-2"
              >
                <span>Explorar Carta de Vinhos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
