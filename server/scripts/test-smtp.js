#!/usr/bin/env node
/**
 * Uji koneksi Gmail SMTP. Jalankan: npm run test:smtp (dari folder server)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { verifySmtpConnection } = require('../src/services/email.service');
const { env, normalizeSmtpPass } = require('../src/config/env');

async function main() {
  const pass = normalizeSmtpPass(process.env.SMTP_PASS);
  console.log('--- Uji SMTP Gmail POSPAY ---');
  console.log('User:', env.smtp.user);
  console.log('Pass length:', pass.length, pass.length === 16 ? '(OK)' : '(HARUS 16 karakter!)');
  console.log('Auth:', env.smtp.authType);

  const result = await verifySmtpConnection();
  if (result.ok) {
    console.log(`OK: Gmail terhubung via ${result.via}${result.variant ? ` (${result.variant})` : ''}.`);
    process.exit(0);
  }

  console.error('GAGAL:', result.reason);
  console.error('\nLangkah perbaikan:');
  console.error('1. Aktifkan 2FA di akun smppusponegorobrebess@gmail.com');
  console.error('2. Buat App Password BARU (nama: web pospay): https://myaccount.google.com/apppasswords');
  console.error('3. Di server/.env: SMTP_PASS="xxxx xxxx xxxx xxxx" (App Password aktif, bukan yang sudah dicabut)');
  console.error('4. Aktifkan IMAP di Gmail → Settings → Forwarding and POP/IMAP');
  console.error('5. Restart backend: npm run dev:server');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
