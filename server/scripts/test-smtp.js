#!/usr/bin/env node
/**
 * Uji koneksi Gmail SMTP. Jalankan: npm run test:smtp (dari folder server)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { verifySmtpConnection } = require('../src/services/email.service');
const { env } = require('../src/config/env');

async function main() {
  console.log('--- Uji SMTP Gmail POSPAY ---');
  console.log('User:', env.smtp.user);
  console.log('Pass length:', env.smtp.pass.length, '(harus 16 untuk App Password)');
  console.log('Host:', env.smtp.host, 'Auth:', env.smtp.authType);

  const result = await verifySmtpConnection();
  if (result.ok) {
    console.log('OK: SMTP Gmail terhubung.');
    process.exit(0);
  }

  console.error('GAGAL:', result.reason);
  console.error('\nLangkah perbaikan:');
  console.error('1. Aktifkan 2FA di akun Gmail sekolah');
  console.error('2. Buat App Password baru: https://myaccount.google.com/apppasswords');
  console.error('3. Di server/.env: SMTP_PASS="fls l wuff twdt z uey" (spasi dihapus otomatis)');
  console.error('4. Restart backend setelah mengubah .env');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
