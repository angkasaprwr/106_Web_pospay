const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

let transporter;
let transporterVerified = false;

function isGmailHost() {
  return env.smtp.host.includes('gmail.com');
}

function buildAuthConfig() {
  const user = env.smtp.user;

  if (env.smtp.authType === 'oauth2' && env.smtp.oauth.clientId && env.smtp.oauth.refreshToken) {
    return {
      type: 'OAuth2',
      user,
      clientId: env.smtp.oauth.clientId,
      clientSecret: env.smtp.oauth.clientSecret,
      refreshToken: env.smtp.oauth.refreshToken,
    };
  }

  return { user, pass: env.smtp.pass };
}

function buildTransportOptions() {
  const auth = buildAuthConfig();

  if (isGmailHost()) {
    return {
      service: 'gmail',
      auth,
      pool: false,
      tls: { minVersion: 'TLSv1.2' },
    };
  }

  return {
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    requireTLS: !env.smtp.secure,
    auth,
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
}

function getTransporter() {
  const hasOAuth = env.smtp.authType === 'oauth2' && env.smtp.oauth.refreshToken;
  const hasAppPassword = Boolean(env.smtp.user && env.smtp.pass);

  if (!hasOAuth && !hasAppPassword) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport(buildTransportOptions());
  }
  return transporter;
}

function smtpHelpMessage() {
  return [
    'Periksa SMTP_PASS (App Password Gmail 16 karakter, tanpa spasi).',
    'Buat ulang di: https://myaccount.google.com/apppasswords',
    'Pastikan 2FA aktif dan IMAP diaktifkan di pengaturan Gmail.',
    'Di server/.env gunakan: SMTP_PASS="fls l wuff twdt z uey" (spasi otomatis dihapus).',
  ].join(' ');
}

async function verifySmtpConnection() {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('SMTP tidak dikonfigurasi — email verifikasi memakai mode developer (devCode).');
    return { ok: false, reason: 'missing_credentials' };
  }

  try {
    await transport.verify();
    transporterVerified = true;
    logger.info(`SMTP Gmail terhubung (${env.smtp.user})`);
    return { ok: true };
  } catch (err) {
    transporterVerified = false;
    resetTransporter();
    logger.error(`SMTP Gmail gagal: ${err.message}`);
    if (String(err.message).includes('535') || err.code === 'EAUTH') {
      logger.error(smtpHelpMessage());
    }
    return { ok: false, reason: err.message, code: err.code };
  }
}

function isSchoolEmail(email) {
  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized) return false;

  const schoolGmail = env.school.gmailAddress;
  if (schoolGmail && normalized === schoolGmail) return true;

  const domain = env.school.emailDomain.toLowerCase();
  return normalized.endsWith(`@${domain}`);
}

async function sendMailWithRetry(mailOptions) {
  const transport = getTransporter();
  if (!transport) {
    return { transport: null };
  }

  if (!transporterVerified) {
    const check = await verifySmtpConnection();
    if (!check.ok) {
      return { error: new Error(check.reason || 'SMTP tidak tersedia') };
    }
  }

  try {
    await transport.sendMail(mailOptions);
    return { sent: true };
  } catch (err) {
    if (err.code === 'EAUTH' || String(err.message).includes('535')) {
      resetTransporter();
      const retryTransport = getTransporter();
      if (retryTransport) {
        try {
          await retryTransport.verify();
          transporterVerified = true;
          await retryTransport.sendMail(mailOptions);
          return { sent: true };
        } catch (retryErr) {
          return { error: retryErr };
        }
      }
    }
    return { error: err };
  }
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

  if (!getTransporter()) {
    logger.warn(`[DEV] Kode verifikasi untuk ${email}: ${code}`);
    return { sent: false, devCode: code };
  }

  const result = await sendMailWithRetry(mailOptions);
  if (result.sent) {
    logger.info(`Email verifikasi terkirim ke ${email}`);
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

  if (!getTransporter()) {
    logger.warn(`[DEV] Tautan reset kata sandi untuk ${email}: ${resetUrl}`);
    return { sent: false, devResetUrl: resetUrl };
  }

  const result = await sendMailWithRetry(mailOptions);
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
