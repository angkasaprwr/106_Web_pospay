const { prisma } = require('../../config/prisma');
const { toNumber, formatIDR } = require('../../utils/money');
const { outstanding } = require('../bills/bill.helper');

/** Function declarations exposed to Gemini for grounded answers. */
const toolDeclarations = [
  {
    name: 'getMyBills',
    description:
      'Mengambil daftar tagihan milik siswa yang sedang login beserta status dan sisa tagihannya. Gunakan saat siswa bertanya tentang tagihan, SPP, atau pembayaran yang harus dibayar.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter status tagihan',
          enum: ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'],
        },
      },
    },
  },
  {
    name: 'getMyOutstandingTotal',
    description: 'Menghitung total seluruh tunggakan (sisa tagihan yang belum dibayar) milik siswa yang sedang login.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getPaymentMethods',
    description: 'Mengambil daftar metode/rekening pembayaran resmi sekolah yang aktif (Cash, QRIS Midtrans, Transfer Bank).',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getMyPaymentHistory',
    description: 'Mengambil riwayat pembayaran siswa yang sedang login beserta status (Lunas, Menunggu Verifikasi, Ditolak).',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['PENDING', 'VERIFIED', 'REJECTED'], description: 'Filter status pembayaran' },
        limit: { type: 'number', description: 'Jumlah maksimal data (default 10)' },
      },
    },
  },
  {
    name: 'getPaymentStatus',
    description: 'Mengecek status pembayaran terbaru untuk tagihan siswa berdasarkan ID tagihan atau referensi pembayaran.',
    parameters: {
      type: 'object',
      properties: {
        billId: { type: 'string', description: 'ID tagihan' },
        paymentId: { type: 'string', description: 'ID pembayaran' },
      },
    },
  },
  {
    name: 'getSchoolInfo',
    description: 'Mengambil informasi profil sekolah seperti nama, alamat, telepon, dan email.',
    parameters: { type: 'object', properties: {} },
  },
];

async function getMyBills(args, context) {
  if (!context.studentId) return { error: 'Informasi tagihan hanya tersedia untuk akun siswa.' };
  const where = { studentId: context.studentId };
  if (args.status) where.status = args.status;
  const bills = await prisma.bill.findMany({ where, include: { feeType: true }, orderBy: { dueDate: 'asc' } });
  return {
    count: bills.length,
    bills: bills.map((b) => ({
      jenis: b.feeType.name,
      periode: b.period || '-',
      nominal: formatIDR(b.amount),
      sisa: formatIDR(outstanding(b)),
      jatuhTempo: b.dueDate ? new Date(b.dueDate).toLocaleDateString('id-ID') : '-',
      status: b.status,
    })),
  };
}

async function getMyOutstandingTotal(args, context) {
  if (!context.studentId) return { error: 'Informasi tagihan hanya tersedia untuk akun siswa.' };
  const bills = await prisma.bill.findMany({
    where: { studentId: context.studentId, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
  });
  const total = bills.reduce((s, b) => s + outstanding(b), 0);
  return { totalTunggakan: formatIDR(total), jumlahTagihan: bills.length, nominal: total };
}

async function getPaymentMethods() {
  const methods = await prisma.paymentMethod.findMany({ where: { isActive: true } });
  return {
    methods: methods.map((m) => ({
      nama: m.name,
      jenis: m.channel,
      gateway: m.gateway || 'manual',
      tipe: m.paymentType || m.channel,
      atasNama: m.merchantName || m.accountName || '-',
      nomor: m.accountNo || '-',
      instruksi: m.instruction || '-',
    })),
  };
}

async function getMyPaymentHistory(args, context) {
  if (!context.studentId) return { error: 'Riwayat pembayaran hanya tersedia untuk akun siswa.' };
  const limit = Math.min(20, parseInt(args.limit || '10', 10));
  const where = { bill: { studentId: context.studentId } };
  if (args.status) where.status = args.status;
  const payments = await prisma.payment.findMany({
    where,
    include: { bill: { include: { feeType: true } }, paymentMethod: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return {
    count: payments.length,
    payments: payments.map((p) => ({
      tagihan: p.bill?.feeType?.name || '-',
      nominal: formatIDR(p.amount),
      metode: p.paymentMethod?.name || p.channel,
      status: p.status === 'VERIFIED' ? 'Lunas' : p.status === 'PENDING' ? 'Menunggu Verifikasi' : 'Ditolak',
      tanggal: new Date(p.verifiedAt || p.createdAt).toLocaleDateString('id-ID'),
      referensi: p.reference,
    })),
  };
}

async function getPaymentStatus(args, context) {
  if (!context.studentId) return { error: 'Status pembayaran hanya tersedia untuk akun siswa.' };
  if (!args.billId && !args.paymentId) return { error: 'Berikan billId atau paymentId.' };

  const where = args.paymentId
    ? { id: args.paymentId, bill: { studentId: context.studentId } }
    : { billId: args.billId, bill: { studentId: context.studentId } };

  const payment = await prisma.payment.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
    include: { bill: { include: { feeType: true } }, paymentMethod: true },
  });
  if (!payment) return { error: 'Pembayaran tidak ditemukan.' };

  return {
    tagihan: payment.bill?.feeType?.name || '-',
    nominal: formatIDR(payment.amount),
    metode: payment.paymentMethod?.name || payment.channel,
    status: payment.status === 'VERIFIED' ? 'Lunas' : payment.status === 'PENDING' ? 'Menunggu Verifikasi' : 'Ditolak',
    referensi: payment.reference,
    tanggalBayar: payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString('id-ID') : '-',
  };
}

async function getSchoolInfo() {
  const profile = await prisma.schoolProfile.findFirst();
  if (!profile) return { error: 'Profil sekolah belum diatur.' };
  return {
    nama: profile.name,
    alamat: profile.address || '-',
    telepon: profile.phone || '-',
    email: profile.email || '-',
    kepalaSekolah: profile.headmaster || '-',
  };
}

const handlers = { getMyBills, getMyOutstandingTotal, getPaymentMethods, getMyPaymentHistory, getPaymentStatus, getSchoolInfo };

async function executeTool(name, args, context) {
  const handler = handlers[name];
  if (!handler) return { error: `Fungsi ${name} tidak dikenal` };
  return handler(args, context);
}

module.exports = { toolDeclarations, executeTool };
