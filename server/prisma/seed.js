/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SEED_BENDAHARA = (process.env.SEED_DEFAULT_BENDAHARA || 'false').toLowerCase() === 'true';
const SEED_SAMPLE_STUDENTS = (process.env.SEED_SAMPLE_STUDENTS || 'false').toLowerCase() === 'true';
const STUDENT_PASSWORD = process.env.STUDENT_DEFAULT_PASSWORD || 'siswa123';

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
        email: 'smppusponegorobrebess@gmail.com',
        headmaster: 'Drs. Pusponegoro, M.Pd.',
        treasurer: 'Siti Bendahara, S.E.',
      },
    });
  }

  // ---- Default treasurer (bendahara) — hanya jika SEED_DEFAULT_BENDAHARA=true ----
  // Default: false agar akun masuk bendahara harus dibuat lewat /register (bukan seed otomatis).

  // ---- Default treasurer (bendahara) + sinkron Gmail sekolah untuk reset password ----
  const schoolGmail = (process.env.SCHOOL_GMAIL_ADDRESS || 'smppusponegorobrebess@gmail.com').toLowerCase();

  if (SEED_BENDAHARA) {
    const exists = await prisma.user.findFirst({ where: { role: 'BENDAHARA' } });
    if (!exists) {
      const password = await bcrypt.hash('bendahara123', 10);
      await prisma.user.create({
        data: {
          username: 'bendahara',
          password,
          fullName: 'Bendahara Sekolah',
          role: 'BENDAHARA',
          email: schoolGmail,
          emailVerified: true,
        },
      });
      console.log(`  -> Akun bendahara: username "bendahara", email ${schoolGmail}, password "bendahara123"`);
    }

    // Sinkron Gmail sekolah hanya saat seed bendahara diizinkan.
    const gmailOwner = await prisma.user.findFirst({
      where: { role: 'BENDAHARA', email: { equals: schoolGmail, mode: 'insensitive' } },
    });
    if (!gmailOwner) {
      const conflict = await prisma.user.findFirst({
        where: { email: { equals: schoolGmail, mode: 'insensitive' } },
      });
      if (!conflict) {
        const primary = await prisma.user.findFirst({
          where: { role: 'BENDAHARA', isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        if (primary) {
          await prisma.user.update({
            where: { id: primary.id },
            data: { email: schoolGmail, emailVerified: true },
          });
          console.log(`  -> Email bendahara "${primary.username}" diset ke ${schoolGmail} (notifikasi Gmail)`);
        }
      }
    }

  }

  // Pastikan minimal satu bendahara memakai Gmail resmi sekolah (inbox notifikasi reset).
  const gmailOwner = await prisma.user.findFirst({
    where: { role: 'BENDAHARA', email: { equals: schoolGmail, mode: 'insensitive' } },
  });
  if (!gmailOwner) {
    const conflict = await prisma.user.findFirst({
      where: { email: { equals: schoolGmail, mode: 'insensitive' } },
    });
    if (!conflict) {
      const primary = await prisma.user.findFirst({
        where: { role: 'BENDAHARA', isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (primary) {
        await prisma.user.update({
          where: { id: primary.id },
          data: { email: schoolGmail, emailVerified: true },
        });
        console.log(`  -> Email bendahara "${primary.username}" diset ke ${schoolGmail} (notifikasi Gmail)`);
      }
    }
  } else {
    console.log('  -> SEED_DEFAULT_BENDAHARA=false — tidak membuat/mengubah akun bendahara');
  }

  // ---- Academic year & classes ----
  const year = await prisma.academicYear.upsert({
    where: { name: '2025/2026' },
    update: { isActive: true },
    create: { name: '2025/2026', isActive: true, startDate: new Date('2025-07-01'), endDate: new Date('2026-06-30') },
  });

  const classNames = ['7A', '7B', '8A', '8B', '9A'];
  const classes = {};
  for (const name of classNames) {
    const grade = parseInt(name[0], 10);
    // eslint-disable-next-line no-await-in-loop
    const cls = await prisma.schoolClass.upsert({
      where: { name_academicYearId: { name, academicYearId: year.id } },
      update: {},
      create: { name, grade, academicYearId: year.id },
    });
    classes[name] = cls;
  }

  // ---- Fee types ----
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

  // ---- Payment methods ----
  const methods = [
    { name: 'Transfer Bank BRI', channel: 'TRANSFER', accountName: 'SMP Pusponegoro', accountNo: '0123-01-000000-50-1', instruction: 'Transfer ke rekening lalu unggah bukti.' },
    { name: 'QRIS Sekolah', channel: 'QRIS', accountName: 'PAPK SMP PUSPONEGORO', accountNo: '6513009817', paymentType: 'QRIS_MIDTRANS', gateway: 'midtrans', merchantName: 'SMP Pusponegoro Brebes', instruction: 'Scan QRIS via GoPay/Dana/ShopeePay/Livin/BRImo. Dana masuk rekening BNI 6513009817 a.n. PAPK SMP PUSPONEGORO (Midtrans Sandbox).' },
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

  // ---- Sample students with accounts (hanya jika SEED_SAMPLE_STUDENTS=true) ----
  // Default false agar database kosong siap uji CRUD Tambah Siswa dari bendahara.
  if (!SEED_SAMPLE_STUDENTS) {
    console.log('  -> SEED_SAMPLE_STUDENTS=false — tidak menanam data siswa contoh');
  } else {
  const sampleStudents = [
    { nis: '2025001', fullName: 'Ahmad Fauzi', gender: 'L', className: '7A', parentName: 'Bpk. Sukirman', parentPhone: '081200000001' },
    { nis: '2025002', fullName: 'Siti Nurhaliza', gender: 'P', className: '7A', parentName: 'Ibu Aminah', parentPhone: '081200000002' },
    { nis: '2025003', fullName: 'Budi Santoso', gender: 'L', className: '8A', parentName: 'Bpk. Joko', parentPhone: '081200000003' },
    { nis: '2025004', fullName: 'Dewi Lestari', gender: 'P', className: '9A', parentName: 'Ibu Sri', parentPhone: '081200000004' },
  ];

  const studentPwd = await bcrypt.hash(STUDENT_PASSWORD, 10);
  for (const s of sampleStudents) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await prisma.student.findUnique({ where: { nis: s.nis } });
    if (exists) continue;
    // eslint-disable-next-line no-await-in-loop
    const user = await prisma.user.create({
      data: { username: s.nis, password: studentPwd, fullName: s.fullName, role: 'SISWA' },
    });
    // eslint-disable-next-line no-await-in-loop
    const student = await prisma.student.create({
      data: {
        nis: s.nis,
        fullName: s.fullName,
        gender: s.gender,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        classId: classes[s.className].id,
        userId: user.id,
        status: 'ACTIVE',
        enrolledAt: new Date(),
      },
    });

    // Create a couple of SPP bills (one paid, one due soon, one overdue)
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
        data: {
          invoiceNo: `INV-${s.nis}-${m.period}`,
          studentId: student.id,
          feeTypeId: spp.id,
          academicYearId: year.id,
          period: m.period,
          description: `SPP ${m.period}`,
          amount,
          paidAmount,
          dueDate: m.dueDate,
          status,
        },
      });
      if (m.paid) {
        // eslint-disable-next-line no-await-in-loop
        await prisma.payment.create({
          data: {
            reference: `PAY-${s.nis}-${m.period}`,
            billId: bill.id,
            amount,
            channel: 'TRANSFER',
            status: 'VERIFIED',
            verifiedAt: new Date(),
            paidAt: m.dueDate,
          },
        });
      }
    }
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
