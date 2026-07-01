const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.user || !env.smtp.pass) return null;

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
  return transporter;
}

function isSchoolEmail(email) {
  const domain = env.school.emailDomain.toLowerCase();
  return email.toLowerCase().endsWith(`@${domain}`);
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

  const transport = getTransporter();
  if (!transport) {
    logger.warn(`[DEV] Kode verifikasi untuk ${email}: ${code}`);
    return { sent: false, devCode: code };
  }

  await transport.sendMail({
    from: `"POSPAY ${env.school.name}" <${env.smtp.user}>`,
    to: email,
    subject,
    text,
    html,
  });

  return { sent: true };
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

  const transport = getTransporter();
  if (!transport) {
    logger.warn(`[DEV] Tautan reset kata sandi untuk ${email}: ${resetUrl}`);
    return { sent: false, devResetUrl: resetUrl };
  }

  await transport.sendMail({
    from: `"POSPAY ${env.school.name}" <${env.smtp.user}>`,
    to: email,
    subject,
    text,
    html,
  });

  return { sent: true };
}

module.exports = { sendVerificationCode, sendPasswordResetLink, isSchoolEmail };
