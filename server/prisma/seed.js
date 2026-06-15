/* eslint-disable no-console */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---- School profile ----
  const existingProfile = await prisma.schoolProfile.findFirst();
  if (!existingProfile) {
    await prisma.schoolProfile.create({
      data: {
        name: 'SMP Pusponegoro Brebes',
        npsn: '20326000',
        address: 'Jl. Pendidikan No. 1, Brebes, Jawa Tengah',
        phone: '(0283) 123456',
        email: 'info@smppusponegoro.sch.id',
        headmaster: 'Drs. Pusponegoro, M.Pd.',
        treasurer: 'Siti Bendahara, S.E.',
      },
    });
  }

  // ---- Academic year & classes ----
  const year = await prisma.academicYear.upsert({
    where: { name: '2025/2026' },
    update: { isActive: true },
    create: { name: '2025/2026', isActive: true, startDate: new Date('2025-07-01'), endDate: new Date('2026-06-30') },
  });

  const classNames = ['7A', '7B', '8A', '8B', '9A'];
  for (const name of classNames) {
    const grade = parseInt(name[0], 10);
    // eslint-disable-next-line no-await-in-loop
    await prisma.schoolClass.upsert({
      where: { name_academicYearId: { name, academicYearId: year.id } },
      update: {},
      create: { name, grade, academicYearId: year.id },
    });
  }

  // ---- Fee types ----
  const feeTypeData = [
    { code: 'SPP', name: 'SPP Bulanan', defaultAmount: 150000, isRecurring: true },
    { code: 'GEDUNG', name: 'Uang Gedung', defaultAmount: 1500000, isRecurring: false },
    { code: 'SERAGAM', name: 'Seragam', defaultAmount: 500000, isRecurring: false },
    { code: 'KEGIATAN', name: 'Uang Kegiatan', defaultAmount: 300000, isRecurring: false },
  ];
  for (const ft of feeTypeData) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.feeType.upsert({ where: { code: ft.code }, update: {}, create: ft });
  }

  // ---- Payment methods ----
  const methods = [
    { name: 'Transfer Bank BRI', channel: 'TRANSFER', accountName: 'SMP Pusponegoro', accountNo: '0123-01-000000-50-1', instruction: 'Transfer ke rekening lalu unggah bukti.' },
    { name: 'QRIS Sekolah', channel: 'QRIS', accountName: 'SMP Pusponegoro', instruction: 'Scan QRIS pada aplikasi e-wallet/m-banking.' },
    { name: 'Tunai di Loket', channel: 'CASH', instruction: 'Bayar langsung ke loket bendahara.' },
  ];
  for (const m of methods) {
    // eslint-disable-next-line no-await-in-loop
    const found = await prisma.paymentMethod.findFirst({ where: { name: m.name } });
    if (!found) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.paymentMethod.create({ data: m });
    }
  }

  // ---- Working hours ----
  const workingHours = [
    { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '15:00' },
    { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '11:30' },
    { dayOfWeek: 6, isOpen: false, openTime: '08:00', closeTime: '12:00' },
    { dayOfWeek: 0, isOpen: false, openTime: '08:00', closeTime: '12:00' },
  ];
  for (const wh of workingHours) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.workingHour.upsert({ where: { dayOfWeek: wh.dayOfWeek }, update: wh, create: wh });
  }

  // ---- Chatbot Q&A ----
  const qas = [
    { question: 'Bagaimana cara membayar SPP?', answer: 'Anda dapat membayar SPP melalui transfer bank, QRIS, atau tunai di loket. Setelah transfer, unggah bukti pembayaran pada menu Tagihan > Konfirmasi Pembayaran.', keywords: 'spp bayar pembayaran cara transfer', category: 'pembayaran' },
    { question: 'Kapan jatuh tempo pembayaran SPP?', answer: 'SPP umumnya jatuh tempo setiap tanggal 10 setiap bulannya. Cek menu Tagihan untuk tanggal jatuh tempo yang pasti.', keywords: 'jatuh tempo spp tanggal', category: 'pembayaran' },
    { question: 'Bagaimana cara mengajukan dispensasi?', answer: 'Buka menu Tagihan, pilih tagihan terkait, lalu tekan tombol "Pengajuan Dispensasi". Isi alasan dan unggah dokumen pendukung bila ada.', keywords: 'dispensasi keringanan penundaan pengajuan', category: 'dispensasi' },
    { question: 'Apa yang terjadi jika pembayaran saya ditolak?', answer: 'Jika pembayaran ditolak, Anda akan menerima notifikasi beserta alasannya. Silakan perbaiki dan unggah ulang bukti pembayaran yang benar.', keywords: 'ditolak pembayaran verifikasi', category: 'pembayaran' },
  ];
  for (const qa of qas) {
    // eslint-disable-next-line no-await-in-loop
    const found = await prisma.chatbotQA.findFirst({ where: { question: qa.question } });
    if (!found) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.chatbotQA.create({ data: qa });
    }
  }

  const docs = [
    {
      title: 'Kebijakan Pembayaran Sekolah',
      content:
        'SMP Pusponegoro Brebes menetapkan SPP bulanan sebesar Rp150.000. Pembayaran dilakukan paling lambat tanggal 10 setiap bulan. Keterlambatan lebih dari 30 hari akan dicatat sebagai tunggakan. Siswa dengan kendala ekonomi dapat mengajukan dispensasi berupa penundaan, potongan, atau pembebasan biaya melalui aplikasi.',
      source: 'Tata Usaha',
    },
  ];
  for (const d of docs) {
    // eslint-disable-next-line no-await-in-loop
    const found = await prisma.chatbotDocument.findFirst({ where: { title: d.title } });
    if (!found) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.chatbotDocument.create({ data: d });
    }
  }

  console.log('Seed selesai.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
