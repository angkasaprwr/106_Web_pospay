const { prisma } = require('../../config/prisma');
const { toNumber, formatIDR } = require('../../utils/money');
const { outstanding } = require('../bills/bill.helper');

function dateRange(query) {
  const where = {};
  if (query.from || query.to) {
    where.gte = query.from ? new Date(query.from) : undefined;
    where.lte = query.to ? new Date(`${query.to}T23:59:59`) : undefined;
  }
  return Object.keys(where).length ? where : undefined;
}

async function paymentReport(query) {
  const where = { status: 'VERIFIED' };
  const range = dateRange(query);
  if (range) where.verifiedAt = range;
  if (query.feeTypeId) where.bill = { feeTypeId: query.feeTypeId };
  if (query.classId) where.bill = { ...(where.bill || {}), student: { classId: query.classId } };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { verifiedAt: 'desc' },
    include: {
      paymentMethod: true,
      bill: { include: { feeType: true, student: { include: { schoolClass: true } } } },
    },
  });

  const total = payments.reduce((s, p) => s + toNumber(p.amount), 0);
  return { payments, total };
}

async function arrearsReport(query) {
  const where = { status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } };
  if (query.classId) where.student = { classId: query.classId };
  if (query.feeTypeId) where.feeTypeId = query.feeTypeId;

  const bills = await prisma.bill.findMany({
    where,
    orderBy: { dueDate: 'asc' },
    include: { feeType: true, student: { include: { schoolClass: true } } },
  });

  const rows = bills.map((b) => ({ ...b, outstanding: outstanding(b) }));
  const total = rows.reduce((s, b) => s + b.outstanding, 0);
  return { bills: rows, total };
}

async function dispensationReport(query) {
  const where = {};
  if (query.status) where.status = query.status;
  if (query.type) where.type = query.type;
  const range = dateRange(query);
  if (range) where.createdAt = range;

  const items = await prisma.dispensation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { student: { include: { schoolClass: true } }, bill: { include: { feeType: true } }, reviewedBy: { select: { fullName: true } } },
  });
  const total = items.reduce((s, d) => s + toNumber(d.amount), 0);
  return { items, total };
}

// ---- Mappers to flat rows for export ----
function paymentRows(payments) {
  return payments.map((p) => ({
    reference: p.reference,
    date: p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString('id-ID') : '-',
    nis: p.bill.student.nis,
    student: p.bill.student.fullName,
    className: p.bill.student.schoolClass?.name || '-',
    feeType: p.bill.feeType.name,
    method: p.paymentMethod?.name || p.channel,
    amount: toNumber(p.amount),
    amountFormatted: formatIDR(p.amount),
  }));
}

function arrearsRows(bills) {
  return bills.map((b) => ({
    invoiceNo: b.invoiceNo,
    nis: b.student.nis,
    student: b.student.fullName,
    className: b.student.schoolClass?.name || '-',
    feeType: b.feeType.name,
    dueDate: b.dueDate ? new Date(b.dueDate).toLocaleDateString('id-ID') : '-',
    status: b.status,
    outstanding: b.outstanding,
    outstandingFormatted: formatIDR(b.outstanding),
  }));
}

function dispensationRows(items) {
  return items.map((d) => ({
    date: new Date(d.createdAt).toLocaleDateString('id-ID'),
    nis: d.student.nis,
    student: d.student.fullName,
    className: d.student.schoolClass?.name || '-',
    type: d.type,
    reason: d.reason,
    amount: toNumber(d.amount),
    amountFormatted: formatIDR(d.amount),
    status: d.status,
    reviewer: d.reviewedBy?.fullName || '-',
  }));
}

module.exports = {
  paymentReport,
  arrearsReport,
  dispensationReport,
  paymentRows,
  arrearsRows,
  dispensationRows,
};
