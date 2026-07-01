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
    pass: normalizeSmtpPass(process.env.SMTP_PASS),
  };
}

function hasSmtpCredentials() {
  const { user, pass } = getLiveSmtpCredentials();
  return Boolean(user && pass.length === 16);
}

function hasOAuthCredentials() {
  return env.smtp.authType === 'oauth2' && gmailApi.isConfigured();
}

function smtpHelpMessage() {
  return [
    'Periksa SMTP_PASS (App Password Gmail 16 karakter).',
    'Buat App Password baru (nama: web pospay): https://myaccount.google.com/apppasswords',
    'Pastikan 2FA aktif dan IMAP diaktifkan di pengaturan Gmail.',
    'Di server/.env: SMTP_PASS="uzak lscf nowu szkt" (spasi otomatis dihapus).',
    'Restart backend setelah mengubah .env.',
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

async function dispatchMail(mailOptions) {
  if (hasOAuthCredentials()) {
    const apiResult = await gmailApi.sendMail({
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text,
      html: mailOptions.html,
    });
    if (apiResult.sent) return apiResult;
  }

  if (!hasSmtpCredentials()) {
    return { transport: null };
  }

  if (!transporterVerified) {
    const check = await verifySmtpConnection();
    if (!check.ok) {
      return { error: new Error(check.reason || 'SMTP tidak tersedia') };
    }
  }

  return sendViaSmtp(mailOptions);
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

  if (!hasOAuthCredentials() && !hasSmtpCredentials()) {
    logger.warn(`[DEV] Kode verifikasi untuk ${email}: ${code}`);
    return { sent: false, devCode: code };
  }

  const result = await dispatchMail(mailOptions);
  if (result.sent) {
    logger.info(`Email verifikasi terkirim ke ${email} (${result.via || 'smtp'})`);
    return { sent: true };
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

  if (!hasOAuthCredentials() && !hasSmtpCredentials()) {
    logger.warn(`[DEV] Tautan reset kata sandi untuk ${email}: ${resetUrl}`);
    return { sent: false, devResetUrl: resetUrl };
  }

  const result = await dispatchMail(mailOptions);
  if (result.sent) {
    logger.info(`Email reset kata sandi terkirim ke ${email}`);
    return { sent: true };
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
