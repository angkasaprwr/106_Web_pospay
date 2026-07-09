const { prisma } = require('../../config/prisma');

class PaymentFlowRepository {
  findPaymentById(id, include = {}) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        paymentMethod: true,
        bill: { include: { student: { include: { schoolClass: true } }, feeType: true } },
        histories: { orderBy: { createdAt: 'desc' }, take: 20 },
        ...include,
      },
    });
  }

  findPaymentByOrderId(orderId) {
    return prisma.payment.findUnique({
      where: { orderId },
      include: {
        paymentMethod: true,
        bill: { include: { student: true, feeType: true } },
      },
    });
  }

  async findPaymentByInvoiceRef(ref) {
    const include = {
      paymentMethod: true,
      bill: { include: { student: { include: { schoolClass: true } }, feeType: true } },
      histories: { orderBy: { createdAt: 'desc' }, take: 20 },
    };

    const byPaymentId = await prisma.payment.findUnique({ where: { id: ref }, include });
    if (byPaymentId) return byPaymentId;

    const billById = await prisma.bill.findUnique({ where: { id: ref } });
    if (billById) {
      return prisma.payment.findFirst({
        where: { billId: billById.id },
        orderBy: { createdAt: 'desc' },
        include,
      });
    }

    const billByNo = await prisma.bill.findUnique({ where: { invoiceNo: ref } });
    if (billByNo) {
      return prisma.payment.findFirst({
        where: { billId: billByNo.id },
        orderBy: { createdAt: 'desc' },
        include,
      });
    }

    return null;
  }

  listActivePaymentMethods() {
    return prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  createPaymentWebhook(data) {
    return prisma.paymentWebhook.create({ data });
  }

  createPaymentTransaction(data) {
    return prisma.paymentTransaction.create({ data });
  }

  upsertPaidInvoice({ billId, paymentId, invoiceNo, grossAmount, paidAt }) {
    return prisma.invoice.upsert({
      where: { paymentId },
      create: {
        billId,
        paymentId,
        invoiceNo,
        grossAmount,
        status: 'PAID',
        paidAt: paidAt || new Date(),
      },
      update: {
        status: 'PAID',
        paidAt: paidAt || new Date(),
        grossAmount,
      },
    });
  }

  findPendingByBillId(billId) {
    return prisma.payment.findFirst({
      where: { billId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPaymentWithHistory(data, historyNote) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data,
        include: {
          bill: { include: { student: true, feeType: true } },
          paymentMethod: true,
        },
      });
      await tx.paymentHistory.create({
        data: {
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount,
          note: historyNote,
        },
      });
      return payment;
    });
  }

  async updatePaymentWithHistory(paymentId, data, historyMeta = {}) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data,
        include: {
          bill: { include: { student: true, feeType: true } },
          paymentMethod: true,
        },
      });
      await tx.paymentHistory.create({
        data: {
          paymentId: payment.id,
          status: payment.status,
          amount: payment.amount,
          note: historyMeta.note || null,
          metadata: historyMeta.metadata || null,
        },
      });
      return payment;
    });
  }

  createMidtransLog({ paymentId, orderId, eventType, payload, response }) {
    return prisma.midtransLog.create({
      data: { paymentId, orderId, eventType, payload, response },
    });
  }

  createPaymentNotification({ paymentId, userId, type, title, body }) {
    return prisma.paymentNotification.create({
      data: { paymentId, userId, type, title, body, status: 'PENDING' },
    });
  }

  listHistoryForStudent(studentId, { status, year, page = 1, limit = 20 }) {
    const where = { bill: { studentId } };
    if (status) where.status = status;
    if (year) {
      const y = parseInt(year, 10);
      where.createdAt = {
        gte: new Date(`${y}-01-01T00:00:00.000Z`),
        lt: new Date(`${y + 1}-01-01T00:00:00.000Z`),
      };
    }
    const skip = (page - 1) * limit;
    return Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          bill: { include: { feeType: true } },
          paymentMethod: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);
  }
}

module.exports = { PaymentFlowRepository, paymentFlowRepository: new PaymentFlowRepository() };
