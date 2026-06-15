/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================
//  Seed bersifat OPSIONAL & default KOSONG.
//  Secara default seed TIDAK membuat data apa pun, sehingga
//  seluruh halaman fitur & submenu kosong sampai developer
//  mengisinya sendiri melalui uji CRUD (mulai dari Register
//  bendahara, lalu input data master & siswa via aplikasi).
//
//  Aktifkan data contoh dengan environment variable:
//    SEED_MASTER_DATA=true      -> profil sekolah, tahun ajaran,
//                                  kelas, jenis tagihan, metode
//                                  pembayaran, jam kerja, Q&A bot
//    SEED_DEFAULT_BENDAHARA=true -> akun bendahara (bendahara/bendahara123)
//    SEED_SAMPLE_STUDENTS=true   -> contoh siswa + tagihan (butuh master data)
// ============================================================

const bool = (v) => String(v || '').toLowerCase() === 'true';
const SEED_MASTER = bool(process.env.SEED_MASTER_DATA);
const SEED_BENDAHARA = bool(process.env.SEED_DEFAULT_BENDAHARA);
const SEED_SAMPLE_STUDENTS = bool(process.env.SEED_SAMPLE_STUDENTS);
const STUDENT_PASSWORD = process.env.STUDENT_DEFAULT_PASSWORD || 'siswa123';

async function seedBendahara() {
  const exists = await prisma.user.findFirst({ where: { role: 'BENDAHARA' } });
  if (exists) return;
  const password = await bcrypt.hash('bendahara123', 10);
  await prisma.user.create({
    data: { username: 'bendahara', password, fullName: 'Bendahara Sekolah', role: 'BENDAHARA', email: 'bendahara@smppusponegoro.sch.id' },
  });
  console.log('  -> Akun bendahara: username "bendahara", password "bendahara123"');
}

async function seedMasterData() {
  if (!(await prisma.schoolProfile.findFirst())) {
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

  const year = await prisma.academicYear.upsert({
    where: { name: '2025/2026' },
    update: { isActive: true },
    create: { name: '2025/2026', isActive: true, startDate: new Date('2025-07-01'), endDate: new Date('2026-06-30') },
  });

  const classes = {};
  for (const name of ['7A', '7B', '8A', '8B', '9A']) {
    const grade = parseInt(name[0], 10);
    // eslint-disable-next-line no-await-in-loop
    classes[name] = await prisma.schoolClass.upsert({
      where: { name_academicYearId: { name, academicYearId: year.id } },
      update: {},
      create: { name, grade, academicYearId: year.id },
    });
  }

  const feeTypeData = [
    { code: 'SPP', name: 'SPP Bulanan', defaultAmount: 150000, isRecurring: true },
    { code: 'GEDUNG', name: 'Uang Gedung', defaultAmount: 1500000, isRecurring: false },
    { code: 'SERAGAM', name: 'Seragam', defaultAmount: 500000, isRecurring: false },
    { code: 'KEGIATAN', name: 'Uang Kegiatan', defaultAmount: 300000, isRecurring: false },
  ];
  const feeTypes = {};
  for (const ft of feeTypeData) {
    // eslint-disable-next-line no-await-in-loop
    feeTypes[ft.code] = await prisma.feeType.upsert({ where: { code: ft.code }, update: {}, create: ft });
  }

  const methods = [
    { name: 'Transfer Bank BRI', channel: 'TRANSFER', accountName: 'SMP Pusponegoro', accountNo: '0123-01-000000-50-1', instruction: 'Transfer ke rekening lalu unggah bukti.' },
    { name: 'QRIS Sekolah', channel: 'QRIS', accountName: 'SMP Pusponegoro', instruction: 'Scan QRIS pada aplikasi e-wallet/m-banking.' },
    { name: 'Tunai di Loket', channel: 'CASH', instruction: 'Bayar langsung ke loket bendahara.' },
  ];
  for (const m of methods) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await prisma.paymentMethod.findFirst({ where: { name: m.name } }))) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.paymentMethod.create({ data: m });
    }
  }

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

  const qas = [
    { question: 'Bagaimana cara membayar SPP?', answer: 'Anda dapat membayar SPP melalui transfer bank, QRIS, atau tunai di loket. Setelah transfer, unggah bukti pembayaran pada menu Tagihan > Konfirmasi Pembayaran.', keywords: 'spp bayar pembayaran cara transfer', category: 'pembayaran' },
    { question: 'Kapan jatuh tempo pembayaran SPP?', answer: 'SPP umumnya jatuh tempo setiap tanggal 10 setiap bulannya. Cek menu Tagihan untuk tanggal jatuh tempo yang pasti.', keywords: 'jatuh tempo spp tanggal', category: 'pembayaran' },
    { question: 'Bagaimana cara mengajukan dispensasi?', answer: 'Buka menu Tagihan, pilih tagihan terkait, lalu tekan tombol "Pengajuan Dispensasi". Isi alasan dan unggah dokumen pendukung bila ada.', keywords: 'dispensasi keringanan penundaan pengajuan', category: 'dispensasi' },
    { question: 'Apa yang terjadi jika pembayaran saya ditolak?', answer: 'Jika pembayaran ditolak, Anda akan menerima notifikasi beserta alasannya. Silakan perbaiki dan unggah ulang bukti pembayaran yang benar.', keywords: 'ditolak pembayaran verifikasi', category: 'pembayaran' },
  ];
  for (const qa of qas) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await prisma.chatbotQA.findFirst({ where: { question: qa.question } }))) {
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
    if (!(await prisma.chatbotDocument.findFirst({ where: { title: d.title } }))) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.chatbotDocument.create({ data: d });
    }
  }

  return { year, classes, feeTypes };
}

async function seedSampleStudents(master) {
  const { year, classes, feeTypes } = master;
  const sampleStudents = [
    { nis: '2025001', fullName: 'Ahmad Fauzi', gender: 'L', className: '7A', parentName: 'Bpk. Sukirman', parentPhone: '081200000001' },
    { nis: '2025002', fullName: 'Siti Nurhaliza', gender: 'P', className: '7A', parentName: 'Ibu Aminah', parentPhone: '081200000002' },
    { nis: '2025003', fullName: 'Budi Santoso', gender: 'L', className: '8A', parentName: 'Bpk. Joko', parentPhone: '081200000003' },
    { nis: '2025004', fullName: 'Dewi Lestari', gender: 'P', className: '9A', parentName: 'Ibu Sri', parentPhone: '081200000004' },
  ];

  const studentPwd = await bcrypt.hash(STUDENT_PASSWORD, 10);
  for (const s of sampleStudents) {
    // eslint-disable-next-line no-await-in-loop
    if (await prisma.student.findUnique({ where: { nis: s.nis } })) continue;
    // eslint-disable-next-line no-await-in-loop
    const user = await prisma.user.create({ data: { username: s.nis, password: studentPwd, fullName: s.fullName, role: 'SISWA' } });
    // eslint-disable-next-line no-await-in-loop
    const student = await prisma.student.create({
      data: { nis: s.nis, fullName: s.fullName, gender: s.gender, parentName: s.parentName, parentPhone: s.parentPhone, classId: classes[s.className].id, userId: user.id, status: 'ACTIVE', enrolledAt: new Date() },
    });

    const spp = feeTypes.SPP;
    const months = [
      { period: '2025-07', dueDate: new Date('2025-07-10'), paid: true },
      { period: '2025-08', dueDate: new Date('2025-08-10'), paid: false, overdue: true },
      { period: '2025-09', dueDate: new Date(Date.now() + 5 * 86400000), paid: false },
    ];
    for (const m of months) {
      const amount = Number(spp.defaultAmount);
      const paidAmount = m.paid ? amount : 0;
      let status = 'UNPAID';
      if (m.paid) status = 'PAID';
      else if (m.overdue) status = 'OVERDUE';
      // eslint-disable-next-line no-await-in-loop
      const bill = await prisma.bill.create({
        data: { invoiceNo: `INV-${s.nis}-${m.period}`, studentId: student.id, feeTypeId: spp.id, academicYearId: year.id, period: m.period, description: `SPP ${m.period}`, amount, paidAmount, dueDate: m.dueDate, status },
      });
      if (m.paid) {
        // eslint-disable-next-line no-await-in-loop
        await prisma.payment.create({
          data: { reference: `PAY-${s.nis}-${m.period}`, billId: bill.id, amount, channel: 'TRANSFER', status: 'VERIFIED', verifiedAt: new Date(), paidAt: m.dueDate },
        });
      }
    }
  }
}

async function main() {
  if (!SEED_MASTER && !SEED_BENDAHARA && !SEED_SAMPLE_STUDENTS) {
    console.log('Seed dilewati: database dibiarkan KOSONG sesuai konfigurasi default.');
    console.log('Mulai dari halaman Register aplikasi bendahara untuk membuat akun pertama,');
    console.log('lalu isi data master & siswa melalui aplikasi (uji CRUD).');
    console.log('Aktifkan contoh data dengan SEED_MASTER_DATA / SEED_DEFAULT_BENDAHARA / SEED_SAMPLE_STUDENTS.');
    return;
  }

  console.log('Seeding database...');
  let master = null;
  // Sample students butuh data master.
  if (SEED_MASTER || SEED_SAMPLE_STUDENTS) master = await seedMasterData();
  if (SEED_BENDAHARA) await seedBendahara();
  if (SEED_SAMPLE_STUDENTS) await seedSampleStudents(master);
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
