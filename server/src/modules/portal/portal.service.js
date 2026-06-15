const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { toNumber } = require('../../utils/money');
const { outstanding } = require('../bills/bill.helper');

async function resolveStudent(user) {
  if (!user.studentId) throw ApiError.forbidden('Akun ini bukan akun siswa');
  const student = await prisma.student.findUnique({
    where: { id: user.studentId },
    include: { schoolClass: { include: { academicYear: true } } },
  });
  if (!student) throw ApiError.notFound('Data siswa tidak ditemukan');
  return student;
}

async function dashboard(user) {
  const student = await resolveStudent(user);
  const bills = await prisma.bill.findMany({
    where: { studentId: student.id },
    include: { feeType: true },
    orderBy: { dueDate: 'asc' },
  });

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueCount = 0;
  bills.forEach((b) => {
    const payable = Math.max(0, toNumber(b.amount) - toNumber(b.discount));
    totalBilled += payable;
    totalPaid += toNumber(b.paidAmount);
    totalOutstanding += outstanding(b);
    if (b.status === 'OVERDUE') overdueCount += 1;
  });

  const upcoming = bills
    .filter((b) => ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(b.status))
    .slice(0, 5);

  return {
    student: {
      id: student.id,
      nis: student.nis,
      fullName: student.fullName,
      className: student.schoolClass?.name || null,
      academicYear: student.schoolClass?.academicYear?.name || null,
    },
    summary: { totalBilled, totalPaid, totalOutstanding, overdueCount, billCount: bills.length },
    upcoming,
  };
}

async function listBills(user, query) {
  const student = await resolveStudent(user);
  const where = { studentId: student.id };
  if (query.status) where.status = query.status;
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, parseInt(query.limit || '20', 10));
  const [items, total] = await Promise.all([
    prisma.bill.findMany({
      where,
      include: { feeType: true, payments: { where: { status: { in: ['PENDING', 'VERIFIED'] } }, orderBy: { createdAt: 'desc' } } },
      orderBy: { dueDate: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bill.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function billDetail(user, id) {
  const student = await resolveStudent(user);
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: { feeType: true, payments: { orderBy: { createdAt: 'desc' }, include: { paymentMethod: true } }, dispensations: true },
  });
  if (!bill || bill.studentId !== student.id) throw ApiError.notFound('Tagihan tidak ditemukan');
  return bill;
}

async function listPayments(user, query) {
  const student = await resolveStudent(user);
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, parseInt(query.limit || '20', 10));
  const where = { bill: { studentId: student.id } };
  if (query.status) where.status = query.status;
  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { bill: { include: { feeType: true } }, paymentMethod: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function listDispensations(user, query) {
  const student = await resolveStudent(user);
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, parseInt(query.limit || '20', 10));
  const where = { studentId: student.id };
  if (query.status) where.status = query.status;
  const [items, total] = await Promise.all([
    prisma.dispensation.findMany({
      where,
      include: { bill: { include: { feeType: true } }, reviewedBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dispensation.count({ where }),
  ]);
  return { items, total, page, limit };
}

async function paymentMethods() {
  return prisma.paymentMethod.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
}

module.exports = {
  resolveStudent,
  dashboard,
  listBills,
  billDetail,
  listPayments,
  listDispensations,
  paymentMethods,
};
