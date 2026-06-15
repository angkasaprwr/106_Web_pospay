const { Router } = require('express');
const { asyncHandler } = require('../../core/asyncHandler');
const { ok } = require('../../core/ApiResponse');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { prisma } = require('../../config/prisma');
const { toNumber } = require('../../utils/money');

const router = Router();
router.use(authenticate, authorize('BENDAHARA'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [studentCount, activeStudents, billAgg, paidAgg, pendingPayments, pendingDispensations, statusGroups] =
      await Promise.all([
        prisma.student.count(),
        prisma.student.count({ where: { status: 'ACTIVE' } }),
        prisma.bill.aggregate({ _sum: { amount: true, discount: true } }),
        prisma.bill.aggregate({ _sum: { paidAmount: true } }),
        prisma.payment.count({ where: { status: 'PENDING' } }),
        prisma.dispensation.count({ where: { status: 'PENDING' } }),
        prisma.bill.groupBy({ by: ['status'], _count: { _all: true }, _sum: { amount: true, discount: true, paidAmount: true } }),
      ]);

    const totalBilled = toNumber(billAgg._sum.amount) - toNumber(billAgg._sum.discount);
    const totalPaid = toNumber(paidAgg._sum.paidAmount);
    const totalOutstanding = Math.max(0, totalBilled - totalPaid);

    // Monthly verified payment totals for the last 6 months.
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);
    const verifiedPayments = await prisma.payment.findMany({
      where: { status: 'VERIFIED', verifiedAt: { gte: since } },
      select: { amount: true, verifiedAt: true },
    });
    const monthly = {};
    for (let i = 0; i < 6; i += 1) {
      const d = new Date(since);
      d.setMonth(since.getMonth() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = 0;
    }
    verifiedPayments.forEach((p) => {
      const d = new Date(p.verifiedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthly[key] !== undefined) monthly[key] += toNumber(p.amount);
    });

    return ok(res, {
      students: { total: studentCount, active: activeStudents },
      finance: { totalBilled, totalPaid, totalOutstanding },
      pending: { payments: pendingPayments, dispensations: pendingDispensations },
      billStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count._all,
        amount: toNumber(g._sum.amount) - toNumber(g._sum.discount),
        paid: toNumber(g._sum.paidAmount),
      })),
      monthlyPayments: Object.entries(monthly).map(([month, total]) => ({ month, total })),
    });
  }),
);

module.exports = router;
