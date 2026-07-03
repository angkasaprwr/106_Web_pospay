const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { billRepository } = require('./bill.repository');
const { computeStatus, outstanding } = require('./bill.helper');
const { generateInvoiceNo } = require('../../utils/identifiers');
const { recordAudit } = require('../audit/audit.service');
const { notifyUser } = require('../notifications/notification.service');
const { formatIDR } = require('../../utils/money');

async function list(query) {
  return billRepository.list(query);
}

async function getById(id) {
  const bill = await billRepository.detail(id);
  if (!bill) throw ApiError.notFound('Tagihan tidak ditemukan');
  return bill;
}

async function create(input, actorId, req) {
  const data = {
    invoiceNo: generateInvoiceNo(),
    studentId: input.studentId,
    feeTypeId: input.feeTypeId,
    academicYearId: input.academicYearId || null,
    period: input.period || null,
    description: input.description || null,
    amount: input.amount,
    discount: input.discount || 0,
    dueDate: input.dueDate || null,
  };
  data.status = computeStatus({ ...data, paidAmount: 0 });
  const bill = await prisma.bill.create({ data, include: { feeType: true, student: true } });
  await recordAudit({ userId: actorId, action: 'CREATE', entity: 'Bill', entityId: bill.id, req });
  return bill;
}

async function bulkCreate(input, actorId, req) {
  const studentWhere = { status: 'ACTIVE' };
  if (input.target === 'CLASS') {
    if (!input.classId) throw ApiError.badRequest('Kelas wajib dipilih');
    studentWhere.classId = input.classId;
  }
  const students = await prisma.student.findMany({ where: studentWhere, select: { id: true } });
  if (students.length === 0) throw ApiError.badRequest('Tidak ada siswa yang cocok');

  const rows = students.map((s) => {
    const base = {
      invoiceNo: generateInvoiceNo(),
      studentId: s.id,
      feeTypeId: input.feeTypeId,
      academicYearId: input.academicYearId || null,
      period: input.period || null,
      description: input.description || null,
      amount: input.amount,
      discount: 0,
      dueDate: input.dueDate || null,
    };
    return { ...base, status: computeStatus({ ...base, paidAmount: 0 }) };
  });

  const result = await prisma.bill.createMany({ data: rows });
  await recordAudit({ userId: actorId, action: 'CREATE', entity: 'Bill', metadata: { bulk: true, count: result.count }, req });
  return { created: result.count };
}

async function update(id, input, actorId, req) {
  const bill = await getById(id);
  const merged = {
    amount: input.amount ?? bill.amount,
    discount: input.discount ?? bill.discount,
    paidAmount: bill.paidAmount,
    dueDate: input.dueDate ?? bill.dueDate,
  };
  const updated = await prisma.bill.update({
    where: { id },
    data: {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.discount !== undefined ? { discount: input.discount } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      ...(input.period !== undefined ? { period: input.period } : {}),
      status: computeStatus(merged),
    },
    include: { feeType: true, student: true },
  });
  await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'Bill', entityId: id, req });
  return updated;
}

async function remove(id, actorId, req) {
  await getById(id);
  await prisma.bill.delete({ where: { id } });
  await recordAudit({ userId: actorId, action: 'DELETE', entity: 'Bill', entityId: id, req });
}

/**
 * Kirim notifikasi pengingat tagihan belum bayar ke siswa (in-app + FCM jika dikonfigurasi).
 */
async function sendPaymentReminder(id, actorId, req) {
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      feeType: true,
      student: { select: { id: true, nis: true, fullName: true, userId: true } },
      payments: { where: { status: 'PENDING' }, select: { id: true } },
    },
  });
  if (!bill) throw ApiError.notFound('Tagihan tidak ditemukan');
  if (bill.status === 'PAID' || bill.status === 'WAIVED') {
    throw ApiError.badRequest('Notifikasi hanya untuk tagihan belum bayar');
  }
  if (bill.payments.length > 0) {
    throw ApiError.badRequest('Tagihan sedang menunggu verifikasi pembayaran');
  }
  if (!['UNPAID', 'PARTIAL', 'OVERDUE'].includes(bill.status)) {
    throw ApiError.badRequest('Status tagihan tidak memenuhi syarat pengingat');
  }

  let userId = bill.student?.userId;
  if (!userId && bill.student?.nis) {
    const linked = await prisma.user.findFirst({
      where: { username: bill.student.nis, role: 'SISWA', isActive: true },
      select: { id: true },
    });
    userId = linked?.id || null;
    if (userId && !bill.student.userId) {
      await prisma.student.update({ where: { id: bill.student.id }, data: { userId } });
    }
  }
  if (!userId) throw ApiError.badRequest('Siswa belum memiliki akun login untuk menerima notifikasi');

  const remaining = outstanding(bill);
  if (remaining <= 0) throw ApiError.badRequest('Tagihan tidak memiliki sisa pembayaran');

  const billName = bill.description
    || `${bill.feeType?.name || 'Tagihan'}${bill.period ? ` ${bill.period}` : ''}`;
  const due = bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('id-ID') : '-';
  const title = 'Pengingat Tagihan Belum Dibayar';
  const body = `Tagihan ${billName} sebesar ${formatIDR(remaining)} belum dibayar. Jatuh tempo: ${due}. Segera bayar melalui menu Tagihan.`;

  const notification = await notifyUser(userId, {
    title,
    body,
    type: 'BILL_UNPAID_REMINDER',
    data: { billId: bill.id, studentId: bill.studentId, feeType: bill.feeType?.name },
  });

  await recordAudit({
    userId: actorId,
    action: 'CREATE',
    entity: 'Notification',
    entityId: notification?.id,
    metadata: { billId: bill.id, targetUserId: userId, type: 'BILL_UNPAID_REMINDER' },
    req,
  });

  return notification;
}

/** Refresh status for overdue detection across all open bills. Returns count updated. */
async function refreshOverdue() {
  const now = new Date();
  const candidates = await prisma.bill.findMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, dueDate: { lt: now } },
    select: { id: true, amount: true, discount: true, paidAmount: true, dueDate: true },
  });
  let updated = 0;
  for (const bill of candidates) {
    const status = computeStatus(bill);
    if (status === 'OVERDUE') {
      await prisma.bill.update({ where: { id: bill.id }, data: { status } });
      updated += 1;
    }
  }
  return updated;
}

module.exports = { list, getById, create, bulkCreate, update, remove, refreshOverdue, sendPaymentReminder };
