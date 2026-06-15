const { BaseRepository } = require('../../core/BaseRepository');
const { prisma } = require('../../config/prisma');

class BillRepository extends BaseRepository {
  constructor() {
    super(prisma, 'bill');
  }

  buildWhere({ search, studentId, feeTypeId, status, academicYearId, classId }) {
    const where = {};
    if (studentId) where.studentId = studentId;
    if (feeTypeId) where.feeTypeId = feeTypeId;
    if (status) where.status = status;
    if (academicYearId) where.academicYearId = academicYearId;
    if (classId) where.student = { classId };
    if (search) {
      where.OR = [
        { invoiceNo: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { student: { fullName: { contains: search, mode: 'insensitive' } } },
        { student: { nis: { contains: search, mode: 'insensitive' } } },
      ];
    }
    return where;
  }

  list(query) {
    return this.paginate({
      where: this.buildWhere(query),
      page: query.page,
      limit: query.limit,
      orderBy: query.orderBy || { createdAt: 'desc' },
      include: {
        feeType: true,
        student: { select: { id: true, nis: true, fullName: true, classId: true, schoolClass: { select: { name: true } } } },
      },
    });
  }

  detail(id) {
    return this.delegate.findUnique({
      where: { id },
      include: {
        feeType: true,
        student: { include: { schoolClass: true } },
        academicYear: true,
        payments: { orderBy: { createdAt: 'desc' }, include: { paymentMethod: true, verifiedBy: { select: { fullName: true } } } },
        dispensations: { orderBy: { createdAt: 'desc' } },
      },
    });
  }
}

module.exports = { BillRepository, billRepository: new BillRepository() };
