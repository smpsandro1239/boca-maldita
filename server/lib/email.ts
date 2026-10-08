import type { ReservationInput } from './validation';

export interface ConfirmationPayload extends ReservationInput {
  reference: string;
}

function escapeHtml(value: string | number | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface EmailTransporter {
  sendMail(options: { from: string; to: string; subject: string; html: string }): Promise<unknown>;
}

let transporterPromise: Promise<EmailTransporter | null> | null = null;

function getTransporter(): Promise<EmailTransporter | null> {
  const host = (process.env.SMTP_HOST ?? '').trim();
  if (!host) {
    return Promise.resolve(null);
  }
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const nodemailer = await import('nodemailer');
      return nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
          : undefined,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 15000,
      }) as EmailTransporter;
    })();
  }
  return transporterPromise;
}

function buildConfirmationHtml(payload: ConfirmationPayload): string {
  const lines = [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #282A30;background:#141518;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#D4A373;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita · Fine Dining &amp; Grill</p>`,
    `    <h1 style="font-size:28px;margin:0 0 16px;">Confirmação de reserva</h1>`,
    `    <p style="color:#A6A8AD;margin:0 0 24px;">A sua reserva foi registada. Guarde a referência <strong style="color:#D4A373;">${escapeHtml(payload.reference)}</strong> e apresente-a ao chegar.</p>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:14px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Nome</td><td style="padding:8px 0;">${escapeHtml(payload.name)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Telefone</td><td style="padding:8px 0;">${escapeHtml(payload.phone)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Data</td><td style="padding:8px 0;">${escapeHtml(payload.date)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Hora</td><td style="padding:8px 0;">${escapeHtml(payload.time)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Convidados</td><td style="padding:8px 0;">${escapeHtml(payload.guests)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Área</td><td style="padding:8px 0;">${escapeHtml(payload.area)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Ocasião</td><td style="padding:8px 0;">${escapeHtml(payload.occasion)}</td></tr>`,
    payload.notes
      ? `      <tr><td style="padding:8px 0;color:#A6A8AD;vertical-align:top;">Notas</td><td style="padding:8px 0;">${escapeHtml(payload.notes)}</td></tr>`
      : '',
    `    </table>`,
    `    <p style="color:#A6A8AD;font-size:13px;margin:24px 0 0;">Rua de Vila de Prado, Vila Verde · geral@bocamaldita.pt</p>`,
    `  </div>`,
    `</div>`,
  ];
  return lines.join('\n');
}

export async function sendReservationConfirmation(payload: ConfirmationPayload): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn('[email] SMTP não configurado — confirmação de reserva não enviada.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? '').trim() || 'Boca Maldita <smpsandro1239@gmail.com>',
      to: payload.email,
      subject: `Confirmação de reserva ${payload.reference} — Boca Maldita`,
      html: buildConfirmationHtml(payload),
    });
    console.log('[email] Confirmação enviada', payload.reference, '->', payload.email);
    return true;
  } catch (err) {
    console.error('[email] Erro ao enviar confirmação:', err);
    return false;
  }
}

function buildWelcomeHtml(): string {
  return [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #282A30;background:#141518;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#D4A373;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita · Boletim Exclusivo</p>`,
    `    <h1 style="font-size:28px;margin:0 0 16px;">Bem-vindo ao clube exclusivo</h1>`,
    `    <p style="color:#A6A8AD;margin:0 0 16px;font-size:14px;line-height:1.6;">Receberá convites prioritários para experiências gastronómicas sazonais, cortes raros e acesso antecipado às datas mais desejadas.</p>`,
    `    <p style="color:#A6A8AD;margin:0;font-size:14px;line-height:1.6;">Fique atento à caixa de entrada — o próximo convite chega em breve.</p>`,
    `    <p style="color:#686B73;font-size:12px;margin:24px 0 0;">Boca Maldita · Fine Dining &amp; Grill · Avenida do Cávado, Vila de Prado, Vila Verde</p>`,
    `  </div>`,
    `</div>`,
  ].join('\n');
}

export async function sendNewsletterWelcome(email: string): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn('[email] SMTP não configurado — boas-vindas do boletim não enviada.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? '').trim() || 'Boca Maldita <smpsandro1239@gmail.com>',
      to: email,
      subject: 'Bem-vindo ao Boletim Exclusivo — Boca Maldita',
      html: buildWelcomeHtml(),
    });
    console.log('[email] Boas-vindas do boletim enviada ->', email);
    return true;
  } catch (err) {
    console.error('[email] Erro ao enviar boas-vindas do boletim:', err);
    return false;
  }
}

function getAdminInbox(): string {
  const contactEmail = (process.env.SITE_CONTACT_EMAIL ?? '').trim();
  if (contactEmail) return contactEmail;
  const from = (process.env.MAIL_FROM ?? '').trim();
  const match = /<([^>]+)>/.exec(from);
  if (match) return match[1];
  const fallback = from || 'smpsandro1239@gmail.com';
  return fallback;
}

export interface ContactNotificationPayload {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
}

function buildContactHtml(payload: ContactNotificationPayload): string {
  return [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #282A30;background:#141518;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#D4A373;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita · Nova Mensagem de Contacto</p>`,
    `    <h1 style="font-size:24px;margin:0 0 16px;">${escapeHtml(payload.assunto)}</h1>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:14px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Nome</td><td style="padding:8px 0;">${escapeHtml(payload.nome)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Email</td><td style="padding:8px 0;">${escapeHtml(payload.email)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;vertical-align:top;">Mensagem</td><td style="padding:8px 0;white-space:pre-line;">${escapeHtml(payload.mensagem)}</td></tr>`,
    `    </table>`,
    `    <p style="color:#A6A8AD;font-size:13px;margin:24px 0 0;">Responda diretamente a este email para contactar o remetente.</p>`,
    `  </div>`,
    `</div>`,
  ].join('\n');
}

export async function sendContactNotification(payload: ContactNotificationPayload): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn('[email] SMTP não configurado — notificação de contacto não enviada.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? '').trim() || 'Boca Maldita <smpsandro1239@gmail.com>',
      to: getAdminInbox(),
      subject: `Nova mensagem de ${payload.nome} — ${payload.assunto}`,
      html: buildContactHtml(payload),
    });
    console.log('[email] Notificação de contacto enviada ->', getAdminInbox());
    return true;
  } catch (err) {
    console.error('[email] Erro ao enviar notificação de contacto:', err);
    return false;
  }
}

function buildReservationAdminHtml(payload: ConfirmationPayload): string {
  return [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #282A30;background:#141518;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#D4A373;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita · Novo Pedido de Reserva</p>`,
    `    <h1 style="font-size:24px;margin:0 0 8px;">Reserva ${escapeHtml(payload.reference)}</h1>`,
    `    <p style="color:#A6A8AD;margin:0 0 20px;font-size:13px;">Ver detalhes e gerir a reserva no painel de administração.</p>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:14px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Nome</td><td style="padding:8px 0;">${escapeHtml(payload.name)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Email</td><td style="padding:8px 0;">${escapeHtml(payload.email)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Telefone</td><td style="padding:8px 0;">${escapeHtml(payload.phone)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Data</td><td style="padding:8px 0;">${escapeHtml(payload.date)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Hora</td><td style="padding:8px 0;">${escapeHtml(payload.time)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Convidados</td><td style="padding:8px 0;">${escapeHtml(payload.guests)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Área</td><td style="padding:8px 0;">${escapeHtml(payload.area)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Ocasião</td><td style="padding:8px 0;">${escapeHtml(payload.occasion)}</td></tr>`,
    payload.notes
      ? `      <tr><td style="padding:8px 0;color:#A6A8AD;vertical-align:top;">Notas</td><td style="padding:8px 0;white-space:pre-line;">${escapeHtml(payload.notes)}</td></tr>`
      : '',
    `    </table>`,
    `  </div>`,
    `</div>`,
  ].join('\n');
}

export async function sendReservationAdminNotification(payload: ConfirmationPayload): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn('[email] SMTP não configurado — notificação de reserva não enviada.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? '').trim() || 'Boca Maldita <smpsandro1239@gmail.com>',
      to: getAdminInbox(),
      subject: `Nova reserva ${payload.reference} — ${payload.name} — ${payload.date} ${payload.time}`,
      html: buildReservationAdminHtml(payload),
    });
    console.log('[email] Notificação de reserva enviada', payload.reference, '->', getAdminInbox());
    return true;
  } catch (err) {
    console.error('[email] Erro ao enviar notificação de reserva:', err);
    return false;
  }
}

export interface ClosedDayConflictRow {
  reference: string;
  name: string;
  date: string;
  time: string;
  guests: number;
}

export interface ClosedDayConflictEmailPayload {
  title: string;
  startDate: string;
  endDate?: string;
  repeat: string;
  total: number;
  rows: ClosedDayConflictRow[];
}

const REPEAT_LABELS_EMAIL: Record<string, string> = {
  none: 'Data única',
  weekly: 'Repete todas as semanas',
  yearly: 'Repete todos os anos',
};

function buildClosedDayConflictHtml(payload: ClosedDayConflictEmailPayload): string {
  const rowsHtml = payload.rows
    .map(
      (row) => `      <tr><td style="padding:8px 0;color:#A6A8AD;">${escapeHtml(row.date)}</td><td style="padding:8px 0;color:#F7F5F0;font-family:monospace;">${escapeHtml(row.reference)}</td><td style="padding:8px 0;color:#F7F5F0;">${escapeHtml(row.name)}</td><td style="padding:8px 0;color:#F7F5F0;">${escapeHtml(row.time)}</td><td style="padding:8px 0;color:#F7F5F0;">${escapeHtml(row.guests)}</td></tr>`,
    )
    .join('\n');

  return [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #7C2D12;background:#1C1917;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#FB923C;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita · Alerta de Conflito</p>`,
    `    <h1 style="font-size:24px;margin:0 0 12px;">⚠ Marcou um dia fechado com reservas ativas</h1>`,
    `    <p style="color:#A6A8AD;margin:0 0 20px;font-size:14px;line-height:1.6;">Marcou o período <strong style="color:#F7F5F0;">“${escapeHtml(payload.title)}”</strong> como fechado, mas existem <strong style="color:#FB923C;">${payload.total} reserva${payload.total === 1 ? '' : 's'}</strong> nesse período. Confirme no painel de administração se deseja contactar estas pessoas ou ajustar a data.</p>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:13px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Período</td><td style="padding:8px 0;">${escapeHtml(payload.startDate)}${payload.endDate ? ` → ${escapeHtml(payload.endDate)}` : ''}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Repetição</td><td style="padding:8px 0;">${escapeHtml(REPEAT_LABELS_EMAIL[payload.repeat] ?? payload.repeat)}</td></tr>`,
    `    </table>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:13px;margin-top:8px;border-top:1px solid #282A30;">`,
    `      <thead><tr><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Data</td><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Ref.</td><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Nome</td><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Hora</td><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Pessoas</td></tr></thead>`,
    `      <tbody>`,
    rowsHtml,
    `      </tbody>`,
    `    </table>`,
    `    <p style="color:#A6A8AD;font-size:13px;margin:24px 0 0;">As reservas online nesse(s) dia(s) ficaram bloqueadas a partir de agora. Este alerta não bloqueia reservas já registadas — resolva cada caso no separador Reservas.</p>`,
    `  </div>`,
    `</div>`,
  ].join('\n');
}

export async function sendClosedDayConflictEmail(payload: ClosedDayConflictEmailPayload): Promise<boolean> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn('[email] SMTP não configurado — alerta de conflito não enviado.');
    return false;
  }

  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? '').trim() || 'Boca Maldita <smpsandro1239@gmail.com>',
      to: getAdminInbox(),
      subject: `⚠ Alerta: ${payload.total} reserva${payload.total === 1 ? '' : 's'} num dia fechado (“${payload.title}”) — Boca Maldita`,
      html: buildClosedDayConflictHtml(payload),
    });
    console.log('[email] Alerta de conflito enviado', payload.total, 'reserva(s)', payload.title);
    return true;
  } catch (err) {
    console.error('[email] Erro ao enviar alerta de conflito:', err);
    return false;
  }
}