import { LegalDoc } from '../types';
import { ArrowLeft } from 'lucide-react';

interface LegalScreenProps {
  doc: LegalDoc;
  onBack: () => void;
}

const CONTENT: Record<LegalDoc, { title: string; sections: { heading: string; body: string[] }[]; updated: string }> = {
  privacidade: {
    title: 'Política de Privacidade',
    updated: 'Atualizada em outubro de 2026',
    sections: [
      {
        heading: '1. Dados que tratamos',
        body: [
          'A Boca Maldita Restaurante & Grill, em Vila de Prado (Vila Verde), trata os dados pessoais que nos fornece quando reserva uma mesa, submete uma avaliação, envia uma mensagem de contacto ou subscreve o Boletim Exclusivo: nome, email, telefone, número de convidados, data e hora da reserva, área preferida e ocasião, bem como o conteúdo da mensagem ou avaliação.',
          'Os dados são recolhidos única e exclusivamente para gerir a sua reserva, responder aos seus pedidos, preparar a sua visita e, quando solicitado, enviar convites do boletim.',
        ],
      },
      {
        heading: '2. Base legal e finalidade',
        body: [
          'O tratamento fundamenta-se na execução do contrato de reserva/prestação de serviço (art.º 6.º/1-b do RGPD) e no consentimento explícito para o boletim (art.º 6.º/1-a). Tratamos apenas o mínimo necessário para cada finalidade e não utilizamos os dados para fins incompatíveis.',
        ],
      },
      {
        heading: '3. Partilha e conservação',
        body: [
          'Não vendemos nem partilhamos os seus dados com terceiros, salvo prestadores técnicos indispensáveis ao funcionamento do serviço (alojamento do site e envio de emails), sempre com as garantias exigidas pelo RGPD.',
          'Os dados de reservas são conservados pelo tempo necessário à gestão da relação e ao cumprimento de obrigações legais (incluindo fiscais). As subscrições do boletim são conservadas até serem removidas por si.',
        ],
      },
      {
        heading: '4. Os seus direitos',
        body: [
          'Pode, a qualquer momento, pedir o acesso, retificação, apagamento, limitação do tratamento, portabilidade dos dados ou opor-se ao tratamento dos seus dados pessoais, bem como retirar o consentimento de subscrição do boletim. Para o efeito, contacte-nos por email em smpsandro1239@gmail.com ou telefone +351 253 031 890.',
          'Tem ainda o direito de apresentar uma reclamação junto da Comissão Nacional de Proteção de Dados (CNPD) — www.cnpd.pt.',
        ],
      },
      {
        heading: '5. Segurança',
        body: [
          'Adotamos medidas técnicas e organizativas adequadas para proteger os seus dados contra acesso não autorizado, alteração ou perda, incluindo comunicações encriptadas (HTTPS) e controlo de acesso ao painel de gestão.',
        ],
      },
      {
        heading: '6. Cookies',
        body: [
          'Este site não utiliza cookies de publicidade nem de monitorização de terceiros. Poderão existir cookies estritamente necessários ao funcionamento técnico do site e à manutenção da sessão de administração.',
        ],
      },
    ],
  },
  termos: {
    title: 'Termos de Reserva',
    updated: 'Atualizados em outubro de 2026',
    sections: [
      {
        heading: '1. Como reservar',
        body: [
          'As reservas podem ser efetuadas pelo formulário online, por telefone (+351 253 031 890) ou email. A reserva online fica registada com uma referência própria (ex.: BM-0001) e é confirmada pela nossa receção, que entra em contacto consigo para confirmar os detalhes.',
          'Em datas com grande procura, a confirmação da mesa fica sujeita à disponibilidade e à resposta da nossa equipa.',
        ],
      },
      {
        heading: '2. Dias e horários',
        body: [
          'O restaurante está encerrado à segunda-feira. Em dias de encerramento extraordinário (feriados, férias, eventos privados) as reservas online para essas datas são automaticamente bloqueadas — o site indica sempre quando a data escolhida está encerrada.',
          'O horário de mesa habitual é: terça a sexta das 19h30 às 23h30; sábado das 12h30 às 15h30 e das 19h30 às 23h30; domingo das 12h30 às 16h00.',
        ],
      },
      {
        heading: '3. Cancelamentos',
        body: [
          'Compreendemos que os planos mudam. Pedimos apenas o favor de avisar, sempre que possível, com a maior antecedência para que possamos libertar a mesa para outros clientes.',
          'Em grupos a partir de 8 pessoas ou na Sala Privada da Garrafeira, poderá ser pedida confirmação por telefone com até 24 horas de antecedência.',
        ],
      },
      {
        heading: '4. Atrasos',
        body: [
          'As mesas são normalmente mantidas durante 15 minutos após a hora marcada. Em caso de atraso, contacte-nos para que possamos ajustar a disponibilidade.',
        ],
      },
      {
        heading: '5. Menores e alergias',
        body: [
          'Informe a nossa equipa de alergias ou intolerâncias alimentares no momento da reserva ou da chegada. O espaço é acolhedor para famílias, mas por questões de segurança a zona das brasas é de acesso exclusivo à equipa.',
        ],
      },
    ],
  },
  livro: {
    title: 'Livro de Reclamações',
    updated: 'Atualizado em outubro de 2026',
    sections: [
      {
        heading: 'Livro de Reclamações Eletrónico',
        body: [
          'Nos termos da lei aplicável, está à sua disposição o Livro de Reclamações. Se não está inteiramente satisfeito com algum aspeto do nosso serviço, apresente a sua reclamação:',
          '• Presencialmente, no próprio restaurante — pedindo o Livro de Reclamações à nossa equipa.',
          '• Eletronicamente, através do Portal do Consumidor em livroreclamacoes.pt ou pela aplicação móvel «Livro de Reclamações».',
        ],
      },
      {
        heading: 'Conte também connosco primeiro',
        body: [
          'Queremos corrigir qualquer falha no momento. Fale com o responsável de sala ou com a equipa no restaurante e faremos o possível por resolver a situação imediatamente.',
          'Pode igualmente enviar-nos a sua apreciação por email em smpsandro1239@gmail.com — lemos todas as mensagens com atenção.',
        ],
      },
      {
        heading: 'Contactos',
        body: [
          'Boca Maldita Restaurante & Grill · Avenida do Cávado, Vila de Prado, Vila Verde 4730-460 · +351 253 031 890 · smpsandro1239@gmail.com',
          'Autoridade de fiscalização do setor: Direção-Geral do Consumidor (dgcon.pt).',
        ],
      },
    ],
  },
};

export default function LegalScreen({ doc, onBack }: LegalScreenProps) {
  const data = CONTENT[doc];
  return (
    <div className="w-full bg-[#0C0D0E] py-12 lg:py-20">
      <div className="max-w-3xl mx-auto px-5 lg:px-12 space-y-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#D4A373] hover:text-[#e0b585] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="space-y-2">
          <span className="text-xs uppercase text-[#686B73] tracking-[0.2em] font-mono">{data.updated}</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#F7F5F0]">{data.title}</h1>
        </div>

        <div className="border-t border-[#282A30] pt-8 space-y-8">
          {data.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="font-serif text-xl text-[#D4A373]">{section.heading}</h2>
              {section.body.map((paragraph, index) => (
                <p key={index} className="text-sm text-[#A6A8AD] leading-relaxed whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="border-t border-[#282A30] pt-6 text-xs text-[#686B73]">
          <p>Boca Maldita Restaurante &amp; Grill · Vila de Prado, Vila Verde</p>
        </div>
      </div>
    </div>
  );
}