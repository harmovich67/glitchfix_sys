import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { settingsService } from '../settings/settings.service';

function getTransport() {
  if (env.SMTP_USER && env.SMTP_PASS) {
    const cleanUser = env.SMTP_USER.trim();
    const cleanPass = env.SMTP_PASS.replace(/\s+/g, '').trim();
    if (cleanUser.endsWith('@gmail.com') || env.SMTP_HOST === 'smtp.gmail.com') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: cleanUser, pass: cleanPass },
      });
    }
    return nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.gmail.com',
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: cleanUser, pass: cleanPass },
    });
  }
  return nodemailer.createTransport({ jsonTransport: true });
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(brand: string, title: string, body: string, link?: string, fields?: Record<string, string | number | boolean | undefined>) {
  const url = link ? `${env.WEB_ORIGIN}${link}` : env.WEB_ORIGIN;
  const fieldsTable = fields && Object.keys(fields).length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;border:1px solid #e7e7ee;border-radius:12px;overflow:hidden;background:#fafafc">
        ${Object.entries(fields)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `
            <tr style="border-bottom:1px solid #e7e7ee">
              <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#6b7280;width:38%;background:#f4f4f7">${escape(k)}</td>
              <td style="padding:10px 14px;font-size:14px;font-weight:600;color:#111827;font-family:Inter,monospace">${escape(String(v))}</td>
            </tr>
          `).join('')}
      </table>`
    : '';

  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0b0b12">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e7e7ee;box-shadow:0 4px 12px rgba(0,0,0,0.03)">
    <tr><td style="font-weight:700;font-size:18px;color:#5b5bf6">◆ ${escape(brand)}</td></tr>
    <tr><td style="padding-top:20px;font-size:20px;font-weight:600;color:#111827">${escape(title)}</td></tr>
    <tr><td style="padding-top:8px;font-size:15px;line-height:1.6;color:#4a4a57">${escape(body)}</td></tr>
    ${fieldsTable ? `<tr><td>${fieldsTable}</td></tr>` : ''}
    <tr><td style="padding-top:24px"><a href="${url}" style="display:inline-block;background:#5b5bf6;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;box-shadow:0 2px 4px rgba(91,91,246,0.2)">Open in ${escape(brand)}</a></td></tr>
  </table></td></tr></table></body></html>`;
}

async function sendViaFormSubmit(
  recipient: string,
  brand: string,
  subject: string,
  body: string,
  link?: string,
  fields?: Record<string, string | number | boolean | undefined>,
) {
  const targetUrl = env.FORMSUBMIT_ENDPOINT.trim() || `https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`;
  const actionUrl = link ? `${env.WEB_ORIGIN}${link}` : env.WEB_ORIGIN;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const payload: Record<string, unknown> = {
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      _replyto: env.MAIL_FROM,
      Platform: brand,
      Recipient: recipient,
      Message: body,
      ...(fields ?? {}),
      'Action Link': actionUrl,
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json().catch(() => ({}));
    console.log(`✉️  [formsubmit:sent] to=${recipient} · ${subject}`, data);
    return true;
  } catch (err: any) {
    clearTimeout(timer);
    console.warn(`⚠️  [formsubmit:error] Failed to send to ${recipient} (${err?.message || err}). Falling back to local log.`);
    return false;
  }
}

export async function sendEmail(
  to: string[],
  subject: string,
  body: string,
  link?: string,
  fields?: Record<string, string | number | boolean | undefined>,
) {
  if (!to.length) return;
  try {
    const brand = (await settingsService.get()).brand.nameEn;
    const url = link ? `${env.WEB_ORIGIN}${link}` : env.WEB_ORIGIN;

    const hasSmtp = Boolean(env.SMTP_USER && env.SMTP_PASS);

    if (env.EMAIL_PROVIDER === 'formsubmit') {
      for (const recipient of to) {
        const ok = await sendViaFormSubmit(recipient, brand, subject, body, link, fields);
        if (!ok) {
          if (hasSmtp) {
            console.log(`✉️  [email:smtp-fallback] Sending to ${recipient} via SMTP...`);
            const transport = getTransport();
            const fieldText = fields
              ? '\n\n' + Object.entries(fields).filter(([_, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`).join('\n')
              : '';
            await transport.sendMail({
              from: env.MAIL_FROM,
              to: [recipient],
              subject,
              text: `${body}${fieldText}\n\n${url}`,
              html: layout(brand, subject, body, link, fields),
            });
            console.log(`✉️  [email:smtp-fallback] Delivered to ${recipient} via SMTP.`);
          } else {
            console.log(`✉️  [email:fallback] to=${recipient} · ${subject}\nBody: ${body}\nFields:`, fields ?? {}, `\nURL: ${url}`);
          }
        }
      }
      return;
    }

    if (env.EMAIL_PROVIDER === 'smtp' || hasSmtp) {
      const transport = getTransport();
      const fieldText = fields
        ? '\n\n' + Object.entries(fields).filter(([_, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`).join('\n')
        : '';
      await transport.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        text: `${body}${fieldText}\n\n${url}`,
        html: layout(brand, subject, body, link, fields),
      });
      console.log(`✉️  [email:smtp] Sent to ${to.join(',')} · ${subject}`);
      return;
    }

    // console only
    console.log(`✉️  [email:console] to=${to.join(',')} · ${subject}\nBody: ${body}\nFields:`, fields ?? {}, `\nURL: ${url}`);
  } catch (err) {
    console.error('[email] send failed', err);
  }
}
