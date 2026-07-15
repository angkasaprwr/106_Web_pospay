#!/usr/bin/env node
/**
 * Hapus semua akun masuk BENDAHARA dari PostgreSQL (db_sikes).
 * Token reset/refresh terkait ikut dihapus. Akun SISWA tidak disentuh.
 *
 * Jalankan: cd server && node scripts/delete-bendahara-accounts.js
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.user.findMany({
    where: { role: 'BENDAHARA' },
    select: { id: true, username: true, email: true, fullName: true },
  });
  console.log('Akun BENDAHARA ditemukan:', before.length);
  before.forEach((u) => console.log(`  - ${u.username} <${u.email}> (${u.fullName})`));

  const ids = before.map((u) => u.id);
  if (!ids.length) {
    console.log('Tidak ada yang dihapus.');
    return;
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.deviceToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.chatSession.deleteMany({ where: { userId: { in: ids } } });
  const del = await prisma.user.deleteMany({ where: { role: 'BENDAHARA' } });
  await prisma.registrationVerification.deleteMany({});

  console.log(`Selesai: ${del.count} akun BENDAHARA dihapus dari db_sikes.`);
  console.log('Set SEED_DEFAULT_BENDAHARA=false di server/.env agar seed tidak membuat ulang.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
