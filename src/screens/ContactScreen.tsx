import { useState, type FormEvent } from 'react';
import { createContact } from '../lib/api';
import { useSite, telHref } from '../context/SiteContext';
import { MapPin, Phone, Mail, Clock, Send, Check, Navigation, MessageCircle, Copy, AlertCircle } from 'lucide-react';
import AssetImage from '../components/AssetImage';

interface ContactScreenProps {
  mapUrl: string;
  contactEmail: string;
  onCopyImageUrl: (url: string) => void;
}

export default function ContactScreen({ mapUrl, contactEmail, onCopyImageUrl }: ContactScreenProps) {
  const { siteContent } = useSite();
  const phone = siteContent.phone;
  const waPhone = phone.replace(/[^0-9]/g, '');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    assunto: 'Informações Gerais',
    mensagem: ''
  });
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setSubmitError(null);
    try {
      await createContact({
        nome: formData.nome,
        email: formData.email,
        assunto: formData.assunto,
        mensagem: formData.mensagem
      });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setFormData({
          nome: '',
          email: '',
          assunto: 'Informações Gerais',
          mensagem: ''
        });
      }, 4500);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ocorreu um erro ao enviar a mensagem.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full bg-[#0C0D0E] py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-5 lg:px-12 space-y-16">
        
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
            <span className="text-xs uppercase tracking-[0.25em] text-[#D4A373] font-sans font-semibold">
              Estamos em Vila de Prado
            </span>
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#F7F5F0]">
            Contactos &amp; Localização
          </h1>
          <p className="text-base text-[#A6A8AD]">
            Visite-nos junto às margens do Cávado ou fale diretamente com a nossa receção para eventos privados e reservas.
          </p>
        </div>

        {/* 3 Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#141518] border border-[#282A30] p-6 space-y-3">
            <div className="w-10 h-10 bg-[#1C1E22] border border-[#282A30] flex items-center justify-center text-[#D4A373]">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg text-[#F7F5F0]">Localização</h3>
            <p className="text-xs text-[#A6A8AD] leading-relaxed">
              Avenida do Cávado<br />
              Vila de Prado, Vila Verde<br />
              4730-460 Portugal
            </p>
            <div className="pt-2">
              <span className="font-mono text-[11px] text-[#D4A373]">
                GPS: 41.5975° N, 8.4632° W
              </span>
            </div>
          </div>

          <div className="bg-[#141518] border border-[#282A30] p-6 space-y-3">
            <div className="w-10 h-10 bg-[#1C1E22] border border-[#282A30] flex items-center justify-center text-[#D4A373]">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg text-[#F7F5F0]">Linha Telefónica</h3>
            <p className="text-xs text-[#A6A8AD] leading-relaxed">
              Atendimento e confirmações imediatas de mesa:
            </p>
            <div className="space-y-1 pt-1">
              <a
                href={telHref(phone)}
                className="font-mono text-base text-[#D4A373] hover:underline block font-semibold"
              >
                {phone}
              </a>
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline pt-1"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Conversar no WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="bg-[#141518] border border-[#282A30] p-6 space-y-3">
            <div className="w-10 h-10 bg-[#1C1E22] border border-[#282A30] flex items-center justify-center text-[#D4A373]">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg text-[#F7F5F0]">Correio Eletrónico</h3>
            <p className="text-xs text-[#A6A8AD] leading-relaxed">
              Para reservas, eventos de empresa, celebrações ou parcerias:
            </p>
            <div className="pt-1">
              <a
                href={`mailto:${contactEmail}`}
                className="text-xs text-[#F7F5F0] hover:text-[#D4A373] block"
              >
                {contactEmail}
              </a>
            </div>
          </div>
        </div>

        {/* Map and Form Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Map Preview */}
          <div className="lg:col-span-6 space-y-4">
            <div className="h-80 sm:h-96 bg-[#141518] border border-[#282A30] relative overflow-hidden group">
              {mapUrl ? (
                <AssetImage
                  src={mapUrl}
                  alt="Mapa Boca Maldita"
                  className="w-full h-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
              
              <div className="absolute bottom-4 left-4 right-4 bg-[#0C0D0E]/95 p-4 border border-[#282A30]">
                <div className="flex items-center gap-2 text-[#D4A373]">
                  <Navigation className="w-4 h-4" />
                  <span className="text-xs uppercase font-sans font-semibold">Como Chegar de Automóvel</span>
                </div>
                <div className="text-xs text-[#A6A8AD] mt-1 space-y-1">
                  <p>• <strong>De Braga:</strong> 10 min pela EN101 / Variante de Prado.</p>
                  <p>• <strong>Do Porto / Aeroporto:</strong> 45 min pela A3, saída Braga Norte.</p>
                </div>
              </div>

              <button
                onClick={() => onCopyImageUrl(mapUrl)}
                className="absolute top-3 right-3 bg-[#0C0D0E]/90 hover:bg-[#D4A373] hover:text-[#0C0D0E] text-[#F7F5F0] text-[10px] uppercase font-mono px-2 py-1"
              >
                Link do Mapa
              </button>
            </div>
          </div>

          {/* Contact Message Form */}
          <div className="lg:col-span-6 bg-[#141518] border border-[#282A30] p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-serif text-2xl text-[#F7F5F0]">
                Envie uma Mensagem
              </h3>
              <p className="text-xs text-[#A6A8AD]">
                Respondemos habitualmente num prazo máximo de 4 horas úteis.
              </p>

              <div>
                <label className="block text-xs uppercase text-[#A6A8AD] mb-1 font-sans">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="O seu nome"
                  className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-[#A6A8AD] mb-1 font-sans">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@dominio.pt"
                    className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-[#A6A8AD] mb-1 font-sans">
                    Assunto
                  </label>
                  <select
                    value={formData.assunto}
                    onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                    className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                  >
                    <option value="Informações Gerais">Informações Gerais</option>
                    <option value="Eventos Privados & Grupos">Eventos Privados &amp; Grupos</option>
                    <option value="Cortes Especiais / Sommelier">Cortes Especiais / Sommelier</option>
                    <option value="Recrutamento & Carreira">Recrutamento &amp; Carreira</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-[#A6A8AD] mb-1 font-sans">
                  Mensagem
                </label>
                <textarea
                  rows={4}
                  required
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  placeholder="Escreva aqui a sua questão ou detalhe do seu evento..."
                  className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none resize-none"
                ></textarea>
              </div>

              {submitError && (
                <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] disabled:opacity-60 disabled:cursor-not-allowed font-sans text-xs uppercase font-semibold py-3.5 tracking-[0.2em] transition-colors"
              >
                {isSending ? 'A Enviar Mensagem…' : 'Enviar Mensagem'}
              </button>

              {sent && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Mensagem enviada com sucesso! A nossa equipa entrará em contacto brevemente.</span>
                </div>
              )}
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
