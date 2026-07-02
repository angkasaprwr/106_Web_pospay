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

function yearRange(year) {
  const y = parseInt(year, 10) || new Date().getFullYear();
  return { gte: new Date(`${y}-01-01T00:00:00`), lte: new Date(`${y}-12-31T23:59:59`) };
}

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

async function paymentReportDashboard(query) {
  const year = parseInt(query.year, 10) || new Date().getFullYear();
  const feeTypeId = query.feeTypeId || null;
  const range = yearRange(year);
  const prevRange = yearRange(year - 1);

  const billWhere = { createdAt: range };
  if (feeTypeId) billWhere.feeTypeId = feeTypeId;

  const paymentWhere = {
    OR: [
      { verifiedAt: range },
      { createdAt: range },
    ],
  };
  if (feeTypeId) paymentWhere.bill = { feeTypeId };

  const [bills, payments, prevVerified] = await Promise.all([
    prisma.bill.findMany({ where: billWhere, include: { feeType: true } }),
    prisma.payment.findMany({ where: paymentWhere, include: { bill: { include: { feeType: true } } } }),
    prisma.payment.findMany({
      where: { status: 'VERIFIED', verifiedAt: prevRange, ...(feeTypeId ? { bill: { feeTypeId } } : {}) },
    }),
  ]);

  const verified = payments.filter((p) => p.status === 'VERIFIED');
  const pending = payments.filter((p) => p.status === 'PENDING');
  const rejected = payments.filter((p) => p.status === 'REJECTED');
  const totalIncome = verified.reduce((s, p) => s + toNumber(p.amount), 0);
  const prevIncome = prevVerified.reduce((s, p) => s + toNumber(p.amount), 0);
  const growthPct = prevIncome > 0 ? Number((((totalIncome - prevIncome) / prevIncome) * 100).toFixed(1)) : 0;

  const paidStudentIds = new Set(bills.filter((b) => b.status === 'PAID').map((b) => b.studentId));

  const rows = [];
  const chart = [];

  for (let m = 0; m < 12; m += 1) {
    const monthStart = new Date(year, m, 1);
    const monthEnd = new Date(year, m + 1, 0, 23, 59, 59);

    const monthBills = bills.filter((b) => {
      const d = new Date(b.createdAt);
      return d >= monthStart && d <= monthEnd;
    });
    const monthPayments = payments.filter((p) => {
      const d = new Date(p.verifiedAt || p.createdAt);
      return d >= monthStart && d <= monthEnd;
    });
    if (monthBills.length === 0 && monthPayments.length === 0) continue;

    const monthVerified = monthPayments.filter((p) => p.status === 'VERIFIED');
    const monthPending = monthPayments.filter((p) => p.status === 'PENDING');
    const monthRejected = monthPayments.filter((p) => p.status === 'REJECTED');
    const income = monthVerified.reduce((s, p) => s + toNumber(p.amount), 0);
    const tagihanLabel = feeTypeId
      ? monthBills[0]?.feeType?.name || monthVerified[0]?.bill?.feeType?.name || 'Tagihan'
      : monthBills[0]?.feeType?.name || 'SPP';

    rows.push({
      period: `${MONTHS_ID[m]} ${year}`,
      tagihan: tagihanLabel,
      totalTagihan: monthBills.length,
      totalDibayar: monthVerified.length,
      pending: monthPending.length,
      rejected: monthRejected.length,
      totalIncome: income,
      totalIncomeFormatted: formatIDR(income),
    });

    chart.push({
      month: MONTHS_ID[m].slice(0, 3),
      label: MONTHS_ID[m],
      value: income,
      valueJt: `${(income / 1_000_000).toFixed(2).replace('.', ',')} jt`,
    });
  }

  const feeTypeGroups = {};
  bills.forEach((b) => {
    const key = b.feeTypeId;
    if (!feeTypeGroups[key]) feeTypeGroups[key] = { name: b.feeType.name, bills: [], feeTypeId: key };
    feeTypeGroups[key].bills.push(b);
  });

  Object.values(feeTypeGroups).forEach((fg) => {
    if (fg.name === 'SPP' || fg.name.includes('SPP')) return;
    const related = payments.filter((p) => p.bill?.feeTypeId === fg.feeTypeId);
    const relVerified = related.filter((p) => p.status === 'VERIFIED');
    const relPending = related.filter((p) => p.status === 'PENDING');
    const relRejected = related.filter((p) => p.status === 'REJECTED');
    const income = relVerified.reduce((s, p) => s + toNumber(p.amount), 0);
    if (fg.bills.length === 0 && related.length === 0) return;
    rows.push({
      period: fg.bills[0]?.period || fg.name,
      tagihan: fg.name,
      totalTagihan: fg.bills.length,
      totalDibayar: relVerified.length,
      pending: relPending.length,
      rejected: relRejected.length,
      totalIncome: income,
      totalIncomeFormatted: formatIDR(income),
    });
  });

  const totalRow = {
    period: 'TOTAL',
    tagihan: '-',
    totalTagihan: bills.length,
    totalDibayar: verified.length,
    pending: pending.length,
    rejected: rejected.length,
    totalIncome,
    totalIncomeFormatted: formatIDR(totalIncome),
  };

  return {
    stats: {
      totalIncome,
      totalIncomeFormatted: formatIDR(totalIncome),
      totalTransactions: payments.length,
      studentsPaid: paidStudentIds.size,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      year,
      growthPct,
    },
    rows,
    totalRow,
    chart,
  };
}

async function paymentReport(query) {
  const where = { status: 'VERIFIED' };
  if (query.year) {
    where.verifiedAt = yearRange(query.year);
  } else {
    const range = dateRange(query);
    if (range) where.verifiedAt = range;
  }
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
  paymentReportDashboard,
  arrearsReport,
  dispensationReport,
  paymentRows,
  arrearsRows,
  dispensationRows,
};
