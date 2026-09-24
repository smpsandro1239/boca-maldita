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
    return true;
  } catch (err) {
    console.error('[email] Erro ao enviar boas-vindas do boletim:', err);
    return false;
  }
}