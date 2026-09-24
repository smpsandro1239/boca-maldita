import { useEffect, useState, type FormEvent } from 'react';
import { ReservationData, PublicReservationConfig } from '../types';
import { createReservation, getReservationConfig } from '../lib/api';
import { generateCheckQuestion } from '../lib/checkQuestion';
import { findBlockedPeriod } from '../lib/closedDays';
import { useSite, telHref } from '../context/SiteContext';
import { Calendar, Clock, Users, MapPin, Phone, Check, Award, Flame, AlertCircle } from 'lucide-react';

export default function ReservationScreen() {
  const { siteContent } = useSite();
  const phone = siteContent.phone;
  const [config, setConfig] = useState<PublicReservationConfig | null>(null);
  const [checkValue, setCheckValue] = useState('');
  const [honeypotValue, setHoneypotValue] = useState('');
  const [checkQuestion, setCheckQuestion] = useState(() => generateCheckQuestion());

  const [formData, setFormData] = useState<ReservationData>({
    name: '',
    email: '',
    phone: '',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    time: '20:00',
    guests: 2,
    area: 'Salão Nobre da Brasa',
    occasion: 'Jantar romântico',
    notes: ''
  });

  const [confirmedReservation, setConfirmedReservation] = useState<{
    id: string;
    data: ReservationData;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getReservationConfig()
      .then(setConfig)
      .catch(() => setConfig({ protectionEnabled: true, paused: false, requireCheck: true, closedPeriods: [] }));
  }, []);

  const availableTimes = [
    // Almoço (Sábado e Domingo)
    '12:30', '13:00', '13:30', '14:00',
    // Jantar (Terça a Sábado)
    '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  const areas = [
    { id: 'Salão Nobre da Brasa', desc: 'Ambiente acolhedor com vista para a adega e iluminação intimista' },
    { id: 'Balcão do Assador (Chef)', desc: 'Experiência exclusiva para ver a arte do fogo em primeira fila' },
    { id: 'Terraço do Cávado', desc: 'Espaço climatizado com vista serena para o vale do rio' },
    { id: 'Sala Privada Garrafeira', desc: 'Reserva exclusiva para grupos a partir de 6 pessoas' }
  ];

  const occasionOptions = ['Jantar romântico', 'Aniversário', 'Negócios', 'Família', 'Outro'];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const blocked = findBlockedPeriod(formData.date, config?.closedPeriods ?? []);
    if (blocked) {
      setSubmitError(`Não é possível reservar para esta data (${blocked.title}). Escolha outro dia.`);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createReservation({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        area: formData.area,
        occasion: formData.occasion,
        notes: formData.notes,
        check: config?.requireCheck ? checkValue : '',
        checkQuestion: config?.requireCheck ? checkQuestion.expression : '',
        honeypot: config?.requireCheck ? honeypotValue : '',
      });
      setConfirmedReservation({
        id: created.reference,
        data: { ...formData }
      });
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ocorreu um erro ao enviar a reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setConfirmedReservation(null);
    setCheckValue('');
    setHoneypotValue('');
    setCheckQuestion(generateCheckQuestion());
    setFormData({
      name: '',
      email: '',
      phone: '',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '20:00',
      guests: 2,
      area: 'Salão Nobre da Brasa',
      occasion: 'Jantar romântico',
      notes: ''
    });
  };

  return (
    <div className="w-full bg-[#0C0D0E] py-12 lg:py-20">
      <div className="max-w-5xl mx-auto px-5 lg:px-12 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
            <span className="text-xs uppercase tracking-[0.25em] text-[#D4A373] font-sans font-semibold">
              Reserva de Mesa
            </span>
            <span className="h-[1.5px] w-10 bg-[#D4A373]"></span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#F7F5F0]">
            Garanta a Sua Experiência
          </h1>
          <p className="text-sm text-[#A6A8AD]">
            Recomendamos a reserva antecipada para garantir a disponibilidade dos nossos cortes nobres de maturação prolongada.
          </p>
        </div>

        {/* Paused State — online form temporarily closed by administration */}
        {config?.paused ? (
          <div className="bg-[#141518] border border-[#D4A373]/60 p-8 lg:p-12 shadow-2xl space-y-6 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-[#D4A373]/10 border border-[#D4A373]/40 text-[#D4A373] flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-3xl text-[#F7F5F0]">
              Reservas online temporariamente pausadas
            </h2>
            <p className="text-sm text-[#A6A8AD] leading-relaxed max-w-lg mx-auto">
              De momento, as reservas online estão suspensas para garantir o serviço da melhor forma. Para fazer a sua
              reserva, contacte a nossa receção por telefone:
            </p>
            <a
              href={telHref(phone)}
              className="inline-block bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] font-sans text-sm uppercase font-semibold px-8 py-4 tracking-[0.2em] transition-colors"
            >
              {phone}
            </a>
            <p className="text-[11px] text-[#686B73]">
              Linha de reservas aberta das 11h00 às 23h30
            </p>
          </div>
        ) : confirmedReservation ? (
          <div className="bg-[#141518] border border-[#D4A373] p-8 lg:p-12 shadow-2xl relative space-y-8 animate-fadeIn">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#282A30] pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#D4A373] text-[#0C0D0E] flex items-center justify-center font-bold">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs uppercase text-[#D4A373] tracking-widest font-mono">
                    PEDIDO DE RESERVA CONFIRMADO
                  </span>
                  <h2 className="font-serif text-2xl text-[#F7F5F0]">
                    Esperamos por si no Boca Maldita
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-[#A6A8AD] block font-mono uppercase">Referência</span>
                <span className="font-mono text-xl text-[#D4A373] font-bold">
                  {confirmedReservation.id}
                </span>
              </div>
            </div>

            {/* Voucher Details Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 bg-[#1C1E22] p-6 border border-[#282A30]">
              <div>
                <span className="text-xs text-[#A6A8AD] uppercase tracking-wider block font-sans">Data</span>
                <span className="font-serif text-lg text-[#F7F5F0] font-medium">{confirmedReservation.data.date}</span>
              </div>
              <div>
                <span className="text-xs text-[#A6A8AD] uppercase tracking-wider block font-sans">Hora da Mesa</span>
                <span className="font-serif text-lg text-[#D4A373] font-medium">{confirmedReservation.data.time}</span>
              </div>
              <div>
                <span className="text-xs text-[#A6A8AD] uppercase tracking-wider block font-sans">Convidados</span>
                <span className="font-serif text-lg text-[#F7F5F0] font-medium">{confirmedReservation.data.guests} Pessoas</span>
              </div>
              <div>
                <span className="text-xs text-[#A6A8AD] uppercase tracking-wider block font-sans">Espaço</span>
                <span className="font-serif text-base text-[#F7F5F0] font-medium truncate block">{confirmedReservation.data.area}</span>
              </div>
            </div>

            <div className="text-xs text-[#A6A8AD] space-y-2 bg-[#1C1E22]/50 p-4 border border-[#282A30]">
              <p>
                • O pedido de reserva foi registado em nome de <strong className="text-[#F7F5F0]">{confirmedReservation.data.name}</strong>. A nossa receção só entrará em contacto consigo caso seja necessário (por exemplo, se existir algum problema com a reserva).
              </p>
              <p>
                • Tolerância de mesa: 15 minutos. Em caso de atraso ou alteração, contacte diretamente a nossa recepção através do número <a href={telHref(phone)} className="text-[#D4A373] underline">{phone}</a>.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#282A30]">
              <div className="text-xs text-[#686B73]">
                Avenida do Cávado, Vila de Prado, Vila Verde • Estacionamento reservado no local
              </div>
              <button
                onClick={resetForm}
                className="bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] text-xs uppercase font-sans font-semibold px-6 py-2.5 tracking-wider transition-colors"
              >
                Fazer Nova Reserva
              </button>
            </div>
          </div>
        ) : (
          /* Interactive Reservation Form */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form */}
            <div className="lg:col-span-8 bg-[#141518] border border-[#282A30] p-6 sm:p-10 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Step 1: Mesa & Espaço */}
                <div className="space-y-4">
                  <h3 className="font-serif text-lg text-[#F7F5F0] flex items-center gap-2 border-b border-[#282A30] pb-2">
                    <Calendar className="w-4 h-4 text-[#D4A373]" />
                    <span>1. Data, Hora &amp; Espaço da Sala</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                        Data Pretendida
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                      />
                      {formData.date && config?.closedPeriods && (() => {
                        const blocked = findBlockedPeriod(formData.date, config.closedPeriods);
                        if (!blocked) return null;
                        return (
                          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-300 bg-amber-950/50 border border-amber-500/40 p-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>
                              Encerrado: {blocked.title}. Escolha outro dia.
                            </span>
                          </p>
                        );
                      })()}
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                        Hora do Serviço
                      </label>
                      <select
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                      >
                        {availableTimes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                        Número de Pessoas
                      </label>
                      <select
                        value={formData.guests}
                        onChange={(e) => setFormData({ ...formData, guests: Number(e.target.value) })}
                        className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16].map(n => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Pessoa' : 'Pessoas'}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Area selection */}
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-2">
                      Seleção da Área do Restaurante
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {areas.map(ar => (
                        <div
                          key={ar.id}
                          onClick={() => setFormData({ ...formData, area: ar.id })}
                          className={`p-3.5 border cursor-pointer transition-all ${
                            formData.area === ar.id
                              ? 'bg-[#1C1E22] border-[#D4A373] text-[#F7F5F0]'
                              : 'bg-[#141518] border-[#282A30] text-[#A6A8AD] hover:border-[#686B73]'
                          }`}
                        >
                          <div className="text-xs font-semibold text-[#F7F5F0] flex items-center justify-between">
                            <span>{ar.id}</span>
                            {formData.area === ar.id && (
                              <span className="w-2 h-2 rounded-full bg-[#D4A373]"></span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#A6A8AD] mt-1 leading-snug">
                            {ar.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 2: Contactos do Titular */}
                <div className="space-y-4 pt-4">
                  <h3 className="font-serif text-lg text-[#F7F5F0] flex items-center gap-2 border-b border-[#282A30] pb-2">
                    <Users className="w-4 h-4 text-[#D4A373]" />
                    <span>2. Titular da Reserva</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                        Nome Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex.: Dr. António Ribeiro"
                        className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                        Telemóvel / Telefone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+351 9xx xxx xxx"
                        className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                        Email de Confirmação *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="nome@exemplo.pt"
                        className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                      Ocasião da Visita
                    </label>
                    <select
                      value={formData.occasion}
                      onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                      className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none appearance-none"
                    >
                      {occasionOptions.map((option) => (
                        <option key={option} value={option} className="bg-[#1C1E22]">
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                      Preferências ou Cortes Especiais Desejados (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Ex.: Reservar Tomahawk Maturado 60 dias, aniversário de casamento, alergias..."
                      className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none resize-none"
                    ></textarea>
                  </div>
                </div>

                {/* Submit Action */}
                {config?.requireCheck && (
                  <div className="space-y-4 pt-4 border-t border-[#282A30]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="hidden" aria-hidden="true">
                        <label>Não preencher</label>
                        <input
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={honeypotValue}
                          onChange={(e) => setHoneypotValue(e.target.value)}
                          className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-[#A6A8AD] mb-1">
                          Verificação anti-robô: quanto é {checkQuestion.label}?
                        </label>
                        <input
                          type="text"
                          required
                          value={checkValue}
                          onChange={(e) => setCheckValue(e.target.value)}
                          autoComplete="off"
                          className="w-full bg-[#1C1E22] text-xs text-[#F7F5F0] p-3 border border-[#282A30] focus:border-[#D4A373] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {submitError && (
                  <div className="p-3 bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#D4A373] text-[#0C0D0E] hover:bg-[#C59D5F] disabled:opacity-60 disabled:cursor-not-allowed font-sans text-xs uppercase font-semibold py-4 tracking-[0.2em] transition-colors shadow-lg"
                >
                  {isSubmitting ? 'A Enviar Pedido de Reserva…' : 'Confirmar Pedido de Reserva'}
                </button>
              </form>
            </div>

            {/* Sidebar with Guidelines and Direct Phone */}
            <div className="lg:col-span-4 space-y-6">
              
              <div className="bg-[#141518] border border-[#282A30] p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#D4A373]">
                  <Phone className="w-5 h-5" />
                  <h4 className="text-xs uppercase font-mono tracking-widest">
                    RESERVA IMEDIATA POR TELEFONE
                  </h4>
                </div>
                <p className="text-xs text-[#A6A8AD] leading-relaxed">
                  Para mesas de grupos com mais de 8 pessoas ou pedidos com menos de 2 horas de antecedência, ligue diretamente:
                </p>
                <a
                  href={telHref(phone)}
                  className="block font-serif text-2xl text-[#F7F5F0] hover:text-[#D4A373] transition-colors font-semibold"
                >
                  {phone}
                </a>
                <span className="text-[11px] text-[#686B73] block">
                  Linha de reservas aberta das 11h00 às 23h30
                </span>
              </div>

              <div className="bg-[#141518] border border-[#282A30] p-6 space-y-3">
                <h4 className="text-xs uppercase tracking-wider text-[#D4A373] font-semibold">
                  Política de Reserva &amp; Dress Code
                </h4>
                <ul className="text-xs text-[#A6A8AD] space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A373]">•</span>
                    <span>Tolerância de chegada de 15 minutos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A373]">•</span>
                    <span>Traje casual elegante (smart casual).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#D4A373]">•</span>
                    <span>Estacionamento privativo gratuito com carregador elétrico.</span>
                  </li>
                </ul>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
