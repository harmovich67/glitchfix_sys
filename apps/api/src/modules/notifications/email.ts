import nodemailer from 'nodemailer';
import { env } from '../../config/env';

const transport = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, body: string, link?: string) {
  const url = link ? `${env.WEB_ORIGIN}${link}` : env.WEB_ORIGIN;
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0b0b12">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e7e7ee">
    <tr><td style="font-weight:700;font-size:18px;color:#5b5bf6">◆ Welco</td></tr>
    <tr><td style="padding-top:20px;font-size:20px;font-weight:600">${escape(title)}</td></tr>
    <tr><td style="padding-top:8px;font-size:15px;line-height:1.6;color:#4a4a57">${escape(body)}</td></tr>
    <tr><td style="padding-top:24px"><a href="${url}" style="display:inline-block;background:#5b5bf6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">Open in Welco</a></td></tr>
  </table></td></tr></table></body></html>`;
}

export async function sendEmail(to: string[], subject: string, body: string, link?: string) {
  if (!to.length) return;
  try {
    await transport.sendMail({ from: env.MAIL_FROM, to, subject, text: `${body}\n\n${env.WEB_ORIGIN}${link ?? ''}`, html: layout(subject, body, link) });
    if (!env.SMTP_HOST) console.log(`✉️  [email:dev] to=${to.join(',')} · ${subject}`);
  } catch (err) {
    console.error('[email] send failed', err);
  }
}
