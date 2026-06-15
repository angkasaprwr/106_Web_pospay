const { BaseRepository } = require('../../core/BaseRepository');
const { prisma } = require('../../config/prisma');

class PaymentRepository extends BaseRepository {
  constructor() {
    super(prisma, 'payment');
  }

  buildWhere({ status, studentId, billId, search, from, to }) {
    const where = {};
    if (status) where.status = status;
    if (billId) where.billId = billId;
    if (studentId) where.bill = { studentId };
    if (from || to) {
      where.paidAt = {};
      if (from) where.paidAt.gte = new Date(from);
      if (to) where.paidAt.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { bill: { invoiceNo: { contains: search, mode: 'insensitive' } } },
        { bill: { student: { fullName: { contains: search, mode: 'insensitive' } } } },
      ];
    }
    return where;
  }

  list(query) {
    return this.paginate({
      where: this.buildWhere(query),
      page: query.page,
      limit: query.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        paymentMethod: true,
        verifiedBy: { select: { fullName: true } },
        bill: {
          select: {
            id: true,
            invoiceNo: true,
            amount: true,
            feeType: { select: { name: true } },
            student: { select: { id: true, nis: true, fullName: true } },
          },
        },
      },
    });
  }

  detail(id) {
    return this.delegate.findUnique({
      where: { id },
      include: {
        paymentMethod: true,
        verifiedBy: { select: { fullName: true } },
        bill: { include: { student: true, feeType: true } },
      },
    });
  }
}

module.exports = { PaymentRepository, paymentRepository: new PaymentRepository() };
