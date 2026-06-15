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
    description: 'Mengambil daftar metode/rekening pembayaran resmi sekolah yang aktif.',
    parameters: { type: 'object', properties: {} },
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
      atasNama: m.accountName || '-',
      nomor: m.accountNo || '-',
      instruksi: m.instruction || '-',
    })),
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

const handlers = { getMyBills, getMyOutstandingTotal, getPaymentMethods, getSchoolInfo };

async function executeTool(name, args, context) {
  const handler = handlers[name];
  if (!handler) return { error: `Fungsi ${name} tidak dikenal` };
  return handler(args, context);
}

module.exports = { toolDeclarations, executeTool };
