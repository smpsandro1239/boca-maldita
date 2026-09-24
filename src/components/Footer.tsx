import { useState, type FormEvent } from 'react';
import { LegalDoc, ScreenType } from '../types';
import { subscribeNewsletter } from '../lib/api';
import { useSite, telHref } from '../context/SiteContext';
import { Camera, Globe, Share2, Check, Flame, AlertCircle } from 'lucide-react';

interface FooterProps {
  onNavigate: (screen: ScreenType) => void;
  onOpenLegal: (doc: LegalDoc) => void;
  contactEmail: string;
}

export default function Footer({ onNavigate, onOpenLegal, contactEmail }: FooterProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const { siteContent } = useSite();
  const phone = siteContent.phone;

  const handleSubscribe = async (e: FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setIsSubscribing(true);
    setSubscribeError(null);
    try {
      await subscribeNewsletter(newsletterEmail);
      setSubscribed(true);
      setTimeout(() => {
        setSubscribed(false);
        setNewsletterEmail('');
      }, 4000);
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Ocorreu um erro na subscrição.');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="w-full bg-[#141518] border-t border-[#282A30] text-[#A6A8AD]">
      <div className="max-w-7xl mx-auto px-5 lg:px-12 py-16 lg:py-20">
        
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          
          {/* Col 1: Brand & Philosophy */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl text-[#F7F5F0] tracking-tight">
                Boca Maldita
              </span>
            </div>
            <p className="text-sm text-[#A6A8AD] leading-relaxed">
              Teatro culinário com mestria no fogo nobre, carnes maturadas seletas e alta hospitalidade no coração do Minho, em Vila de Prado.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#instagram"
                onClick={(e) => e.preventDefault()}
                className="w-9 h-9 flex items-center justify-center bg-[#1C1E22] text-[#D4A373] hover:text-[#F7F5F0] hover:bg-[#282A30] border border-[#282A30] transition-colors"
                title="Instagram"
              >
                <Camera className="w-4 h-4" />
              </a>
              <a
                href="#site"
                onClick={(e) => e.preventDefault()}
                className="w-9 h-9 flex items-center justify-center bg-[#1C1E22] text-[#D4A373] hover:text-[#F7F5F0] hover:bg-[#282A30] border border-[#282A30] transition-colors"
                title="Website Oficial"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Localização */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase text-[#D4A373] tracking-[0.2em] font-sans font-semibold">
              Localização
            </h4>
            <address className="not-italic text-sm text-[#A6A8AD] space-y-1 leading-relaxed">
              <p>Avenida do Cávado</p>
              <p>Vila de Prado, Vila Verde</p>
              <p>4730-460 Portugal</p>
            </address>
            <div className="pt-2 space-y-1">
              <a
                href={telHref(phone)}
                className="text-sm text-[#D4A373] hover:underline block font-mono"
              >
                {phone}
              </a>
              <a
                href={`mailto:${contactEmail}`}
                className="text-sm text-[#A6A8AD] hover:text-[#F7F5F0] block"
              >
                {contactEmail}
              </a>
            </div>
          </div>

          {/* Col 3: Horário de Mesa */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase text-[#D4A373] tracking-[0.2em] font-sans font-semibold">
              Horário de Mesa
            </h4>
            <div className="text-sm text-[#A6A8AD] space-y-2">
              <div className="flex justify-between border-b border-[#282A30]/50 pb-1">
                <span className="text-[#F7F5F0]">Terça – Sexta:</span>
                <span>19h30 – 23h30</span>
              </div>
              <div className="flex justify-between border-b border-[#282A30]/50 pb-1">
                <span className="text-[#F7F5F0]">Sábado:</span>
                <span className="text-right">12h30–15h30 | 19h30–23h30</span>
              </div>
              <div className="flex justify-between border-b border-[#282A30]/50 pb-1">
                <span className="text-[#F7F5F0]">Domingo:</span>
                <span>12h30 – 16h00</span>
              </div>
              <div className="flex justify-between pt-1 text-[#D4A373]">
                <span className="text-[#686B73]">Segunda-feira:</span>
                <span className="uppercase text-xs font-mono font-semibold">Encerrado</span>
              </div>
            </div>
          </div>

          {/* Col 4: Boletim Exclusivo */}
          <div className="space-y-4">
            <h4 className="text-xs uppercase text-[#D4A373] tracking-[0.2em] font-sans font-semibold">
              Boletim Exclusivo
            </h4>
            <p className="text-sm text-[#A6A8AD] leading-relaxed">
              Receba convites prioritários para experiências gastronómicas sazonais e cortes raros.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="O seu endereço eletrónico"
                className="w-full bg-[#1C1E22] text-sm text-[#F7F5F0] px-4 py-2.5 border border-[#282A30] placeholder:text-[#686B73] focus:border-[#D4A373] focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubscribing}
                className="w-full bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] disabled:opacity-60 disabled:cursor-not-allowed font-sans text-xs uppercase font-semibold py-2.5 tracking-[0.15em] transition-colors"
              >
                {subscribed ? 'Inscrição Confirmada!' : isSubscribing ? 'A Subscrever…' : 'Subscrever'}
              </button>
            </form>
            {subscribed && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Obrigado! Enviamos um convite de boas-vindas.</span>
              </div>
            )}
            {subscribeError && (
              <div className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{subscribeError}</span>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-[#282A30] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#686B73]">
          <p>© {new Date().getFullYear()} Boca Maldita Restaurante &amp; Grill. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => onOpenLegal('privacidade')} className="hover:text-[#A6A8AD] transition-colors">
              Política de Privacidade
            </button>
            <button type="button" onClick={() => onOpenLegal('termos')} className="hover:text-[#A6A8AD] transition-colors">
              Termos de Reserva
            </button>
            <button type="button" onClick={() => onOpenLegal('livro')} className="hover:text-[#A6A8AD] transition-colors">
              Livro de Reclamações
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
