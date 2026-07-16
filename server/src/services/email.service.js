const nodemailer = require('nodemailer');
const { env, normalizeSmtpPass } = require('../config/env');
const { logger } = require('../utils/logger');
const gmailApi = require('./gmail-api.service');

let transporter;
let transporterVerified = false;
let cachedPassKey = '';

function getLiveSmtpCredentials() {
  return {
    user: (process.env.SMTP_USER || process.env.SCHOOL_GMAIL_ADDRESS || env.smtp.user)
      .toLowerCase()
      .trim(),
    // GMAIL_APP_PASSWORD adalah alias resmi; SMTP_PASS tetap didukung
    pass: normalizeSmtpPass(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || env.smtp.pass),
  };
}

function hasSmtpCredentials() {
  const { user, pass } = getLiveSmtpCredentials();
  return Boolean(user && pass.length === 16);
}

function hasAnyMailChannel() {
  return Boolean(
    hasOAuthCredentials()
    || hasOAuthNodemailerCredentials()
    || hasSmtpCredentials()
    || (process.env.GMAIL_WEBHOOK_URL || '').trim()
    || (process.env.RESEND_API_KEY || '').trim(),
  );
}

function hasOAuthCredentials() {
  return env.smtp.authType === 'oauth2' && gmailApi.isConfigured();
}

function hasOAuthNodemailerCredentials() {
  const { clientId, clientSecret, refreshToken } = env.smtp.oauth;
  return Boolean(env.smtp.user && clientId && clientSecret && refreshToken);
}

function getOAuth2Transporter() {
  if (!hasOAuthNodemailerCredentials()) return null;
  const { clientId, clientSecret, refreshToken } = env.smtp.oauth;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: env.smtp.user,
      clientId,
      clientSecret,
      refreshToken,
    },
  });
}

function smtpHelpMessage() {
  return [
    'SMTP_PASS / GMAIL_APP_PASSWORD ditolak Google (535 BadCredentials).',
    'Buat App Password BARU (nama: web pospay): https://myaccount.google.com/apppasswords',
    'Pastikan 2FA aktif dan IMAP aktif di Gmail.',
    'Simpan 16 karakter ke server/.env sebagai SMTP_PASS="xxxx xxxx xxxx xxxx" (spasi dihapus otomatis).',
    'Jangan memakai App Password lama yang sudah dicabut. Restart backend setelah mengubah .env.',
  ].join(' ');
}

function buildSmtpTransportOptions(creds, variant) {
  if (variant === 'ssl') {
    return {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: creds,
      pool: false,
      tls: { minVersion: 'TLSv1.2' },
    };
  }

  return {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: creds,
    pool: false,
    tls: { minVersion: 'TLSv1.2' },
  };
}

function resetTransporter() {
  if (transporter && typeof transporter.close === 'function') {
    transporter.close();
  }
  transporter = null;
  transporterVerified = false;
  cachedPassKey = '';
}

function getTransporter(variant = 'starttls') {
  const creds = getLiveSmtpCredentials();
  const passKey = `${creds.user}:${creds.pass}:${variant}`;

  if (!creds.user || creds.pass.length !== 16) return null;

  if (passKey !== cachedPassKey) {
    resetTransporter();
    cachedPassKey = passKey;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport(buildSmtpTransportOptions(creds, variant));
  }
  return transporter;
}

async function verifySmtpConnection() {
  if (hasOAuthCredentials()) {
    return gmailApi.verifyConnection();
  }

  if (!hasSmtpCredentials()) {
    logger.warn('SMTP tidak dikonfigurasi — email verifikasi memakai mode developer (devCode).');
    return { ok: false, reason: 'missing_credentials' };
  }

  const creds = getLiveSmtpCredentials();
  const variants = ['starttls', 'ssl'];
  let lastError;

  for (const variant of variants) {
    resetTransporter();
    const transport = getTransporter(variant);
    try {
      await transport.verify();
      transporterVerified = true;
      logger.info(`SMTP Gmail terhubung (${creds.user}, port ${variant === 'ssl' ? 465 : 587})`);
      return { ok: true, via: 'smtp', variant };
    } catch (err) {
      lastError = err;
      logger.warn(`SMTP ${variant} gagal: ${err.message.split('\n')[0]}`);
    }
  }

  transporterVerified = false;
  resetTransporter();
  logger.error(`SMTP Gmail gagal: ${lastError?.message}`);
  if (String(lastError?.message).includes('535') || lastError?.code === 'EAUTH') {
    logger.error(smtpHelpMessage());
  }
  return { ok: false, reason: lastError?.message, code: lastError?.code };
}

function isSchoolEmail(email) {
  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized) return false;

  const schoolGmail = env.school.gmailAddress;
  if (schoolGmail && normalized === schoolGmail) return true;

  const domain = env.school.emailDomain.toLowerCase();
  return normalized.endsWith(`@${domain}`);
}

async function sendViaOAuth2(mailOptions) {
  const transport = getOAuth2Transporter();
  if (!transport) return { error: new Error('OAuth2 tidak dikonfigurasi') };

  try {
    await transport.sendMail(mailOptions);
    return { sent: true, via: 'oauth2' };
  } catch (err) {
    logger.warn(`Kirim OAuth2 gagal: ${err.message.split('\n')[0]}`);
    return { error: err };
  }
}

async function sendViaSmtp(mailOptions) {
  const variants = ['starttls', 'ssl'];
  let lastError;

  for (const variant of variants) {
    resetTransporter();
    const transport = getTransporter(variant);
    if (!transport) continue;

    try {
      await transport.sendMail(mailOptions);
      transporterVerified = true;
      return { sent: true, via: 'smtp', variant };
    } catch (err) {
      lastError = err;
      logger.warn(`Kirim SMTP (${variant}) gagal: ${err.message.split('\n')[0]}`);
    }
  }

  return { error: lastError || new Error('SMTP tidak tersedia') };
}

async function sendViaResend(mailOptions) {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) return { error: new Error('RESEND_API_KEY tidak dikonfigurasi') };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || `POSPAY <onboarding@resend.dev>`,
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = body?.message || body?.error || `Resend HTTP ${res.status}`;
      logger.warn(`Kirim Resend gagal: ${msg}`);
      return { error: new Error(msg) };
    }
    logger.info(`Resend: email terkirim ke ${mailOptions.to}`);
    return { sent: true, via: 'resend', id: body.id };
  } catch (err) {
    logger.warn(`Kirim Resend gagal: ${err.message}`);
    return { error: err };
  }
}

async function sendViaGmailWebhook(mailOptions) {
  const url = (process.env.GMAIL_WEBHOOK_URL || '').trim();
  if (!url) return { error: new Error('GMAIL_WEBHOOK_URL tidak dikonfigurasi') };

  const token = (process.env.GMAIL_WEBHOOK_TOKEN || '').trim();
  try {
    const res = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
        fromName: `POSPAY ${env.school.name}`,
      }),
    });
    const text = await res.text();
    let body = {};
    try { body = JSON.parse(text); } catch { /* Apps Script kadang plain text */ }
    if (!res.ok || body.ok === false || body.sent === false) {
      const msg = body.error || body.message || text.slice(0, 180) || `Webhook HTTP ${res.status}`;
      logger.warn(`Kirim Gmail webhook gagal: ${msg}`);
      return { error: new Error(msg) };
    }
    logger.info(`Gmail webhook: email terkirim ke ${mailOptions.to}`);
    return { sent: true, via: 'gmail_webhook' };
  } catch (err) {
    logger.warn(`Kirim Gmail webhook gagal: ${err.message}`);
    return { error: err };
  }
}

async function dispatchMail(mailOptions) {
  const errors = [];

  if (hasOAuthCredentials()) {
    const apiResult = await gmailApi.sendMail({
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
    });
    if (apiResult.sent) return apiResult;
    if (apiResult.error) errors.push(apiResult.error.message || 'gmail_api');
  }

  if (hasOAuthNodemailerCredentials()) {
    const oauthResult = await sendViaOAuth2(mailOptions);
    if (oauthResult.sent) return oauthResult;
    if (oauthResult.error) errors.push(oauthResult.error.message || 'oauth2');
  }

  if (hasSmtpCredentials()) {
    if (!transporterVerified) {
      const check = await verifySmtpConnection();
      if (!check.ok) {
        errors.push(check.reason || 'SMTP verify gagal');
      }
    }
    if (transporterVerified || hasSmtpCredentials()) {
      const smtpResult = await sendViaSmtp(mailOptions);
      if (smtpResult.sent) return smtpResult;
      if (smtpResult.error) errors.push(smtpResult.error.message || 'smtp');
    }
  }

  // Fallback: Google Apps Script (login sebagai smppusponegorobrebess@gmail.com)
  if (process.env.GMAIL_WEBHOOK_URL) {
    const wh = await sendViaGmailWebhook(mailOptions);
    if (wh.sent) return wh;
    if (wh.error) errors.push(wh.error.message || 'webhook');
  }

  // Fallback: Resend API (opsional)
  if (process.env.RESEND_API_KEY) {
    const rs = await sendViaResend(mailOptions);
    if (rs.sent) return rs;
    if (rs.error) errors.push(rs.error.message || 'resend');
  }

  const reason = errors.filter(Boolean)[0] || 'Tidak ada saluran email yang tersedia (SMTP/OAuth/Webhook/Resend)';
  return { error: new Error(reason) };
}

async function sendVerificationCode(email, code, fullName) {
  const subject = 'Kode Verifikasi Pendaftaran Bendahara POSPAY';
  const text = [
    `Yth. ${fullName},`,
    '',
    'Berikut kode verifikasi pendaftaran akun bendahara POSPAY:',
    '',
    `    ${code}`,
    '',
    'Kode berlaku selama 15 menit. Jangan bagikan kode ini kepada siapapun.',
    '',
    `Email ini dikirim dari akun Gmail resmi ${env.school.name}.`,
    '',
    '— POSPAY SMP Pusponegoro Brebes',
  ].join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#1d4ed8;margin:0 0 12px">Verifikasi Pendaftaran Bendahara</h2>
      <p>Yth. <strong>${fullName}</strong>,</p>
      <p>Gunakan kode berikut untuk menyelesaikan pendaftaran akun bendahara POSPAY:</p>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
        <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#1d4ed8">${code}</span>
      </div>
      <p style="color:#64748b;font-size:14px">Kode berlaku 15 menit. Notifikasi ini hanya dikirim ke email Gmail sekolah.</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">POSPAY · ${env.school.name}</p>
    </div>
  `;

  const mailOptions = {
    from: `"POSPAY ${env.school.name}" <${env.smtp.user}>`,
    to: email,
    subject,
    text,
    html,
  };

  if (!hasAnyMailChannel()) {
    logger.warn(`[DEV] Kode verifikasi untuk ${email}: ${code}`);
    return { sent: false, devCode: code };
  }

  const result = await dispatchMail(mailOptions);
  if (result.sent) {
    logger.info(`Email verifikasi terkirim ke ${email} (${result.via || 'smtp'})`);
    return { sent: true, via: result.via || 'smtp' };
  }

  const errMsg = result.error?.message || 'Gagal mengirim email';
  logger.error(`Gagal kirim email verifikasi ke ${email}: ${errMsg}`);
  return { sent: false, devCode: code, smtpError: errMsg };
}

async function sendPasswordResetLink(email, fullName, resetUrl) {
  const subject = 'Tautan Reset Kata Sandi POSPAY';
  const text = [
    `Yth. ${fullName},`,
    '',
    'Anda menerima permintaan reset kata sandi akun bendahara POSPAY.',
    '',
    'Klik tautan berikut untuk mengatur kata sandi baru:',
    resetUrl,
    '',
    'Tautan berlaku 30 menit. Jika Anda tidak meminta reset, abaikan email ini.',
    '',
    `— POSPAY ${env.school.name}`,
  ].join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#0047AB;margin:0 0 12px">Reset Kata Sandi</h2>
      <p>Yth. <strong>${fullName}</strong>,</p>
      <p>Klik tombol di bawah untuk mengatur kata sandi baru akun bendahara POSPAY:</p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetUrl}" style="display:inline-block;background:#0047AB;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600">Tautan Reset</a>
      </div>
      <p style="color:#64748b;font-size:14px">Tautan berlaku 30 menit. Notifikasi ini dikirim ke Gmail sekolah Anda.</p>
      <p style="color:#94a3b8;font-size:12px;word-break:break-all">${resetUrl}</p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">POSPAY · ${env.school.name}</p>
    </div>
  `;

  const mailOptions = {
    from: `"POSPAY ${env.school.name}" <${env.smtp.user}>`,
    to: email,
    subject,
    text,
    html,
  };

  if (!hasAnyMailChannel()) {
    logger.warn(`[DEV] Tautan reset kata sandi untuk ${email}: ${resetUrl}`);
    return { sent: false, devResetUrl: resetUrl };
  }

  const result = await dispatchMail(mailOptions);
  if (result.sent) {
    logger.info(`Email reset kata sandi terkirim ke ${email} (${result.via || 'smtp'})`);
    return { sent: true, via: result.via || 'smtp' };
  }

  const errMsg = result.error?.message || 'Gagal mengirim email';
  logger.error(`Gagal kirim email reset ke ${email}: ${errMsg}`);
  return { sent: false, devResetUrl: resetUrl, smtpError: errMsg };
}

module.exports = {
  sendVerificationCode,
  sendPasswordResetLink,
  isSchoolEmail,
  verifySmtpConnection,
  resetTransporter,
};
