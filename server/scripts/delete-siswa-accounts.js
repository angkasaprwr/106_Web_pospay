#!/usr/bin/env node
/**
 * Hapus SEMUA data siswa dari PostgreSQL (db_sikes):
 * Student, User role SISWA, Bill/Payment terkait, dispensasi, notifikasi, token.
 * Master data (kelas, jenis biaya, metode bayar, bendahara) tidak dihapus —
 * siap uji CRUD Tambah Siswa dari aplikasi bendahara.
 *
 * Jalankan: cd server && npm run db:delete-siswa
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({
    select: { id: true, nis: true, fullName: true },
  });
  const siswaUsers = await prisma.user.findMany({
    where: { role: 'SISWA' },
    select: { id: true, username: true },
  });

  console.log(`Student: ${students.length}, User SISWA: ${siswaUsers.length}`);

  const bills = await prisma.bill.findMany({ select: { id: true } });
  const billIds = bills.map((b) => b.id);
  const payments = billIds.length
    ? await prisma.payment.findMany({ where: { billId: { in: billIds } }, select: { id: true } })
    : [];
  const paymentIds = payments.map((p) => p.id);

  if (paymentIds.length) {
    await prisma.paymentHistory.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.paymentNotification.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.paymentTransaction.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.midtransLog.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.paymentWebhook.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await prisma.invoice.updateMany({ where: { paymentId: { in: paymentIds } }, data: { paymentId: null } });
  }

  if (billIds.length) {
    await prisma.invoice.deleteMany({ where: { billId: { in: billIds } } });
    await prisma.dispensation.deleteMany({ where: { OR: [{ billId: { in: billIds } }] } });
    await prisma.payment.deleteMany({ where: { billId: { in: billIds } } });
    await prisma.bill.deleteMany({ where: { id: { in: billIds } } });
  }

  await prisma.dispensation.deleteMany({});
  await prisma.student.deleteMany({});

  const siswaIds = siswaUsers.map((u) => u.id);
  if (siswaIds.length) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: { in: siswaIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: siswaIds } } });
    await prisma.deviceToken.deleteMany({ where: { userId: { in: siswaIds } } });
    await prisma.chatSession.deleteMany({ where: { userId: { in: siswaIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: siswaIds } } });
    await prisma.user.deleteMany({ where: { id: { in: siswaIds } } });
  }

  console.log('Selesai. Semua data siswa dihapus dari db_sikes.');
  console.log('  Student:', await prisma.student.count());
  console.log('  User SISWA:', await prisma.user.count({ where: { role: 'SISWA' } }));
  console.log('  Bill:', await prisma.bill.count());
  console.log('Set SEED_SAMPLE_STUDENTS=false agar seed tidak menanam siswa contoh.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
