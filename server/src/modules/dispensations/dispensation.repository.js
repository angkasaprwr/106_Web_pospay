const { BaseRepository } = require('../../core/BaseRepository');
const { prisma } = require('../../config/prisma');

class DispensationRepository extends BaseRepository {
  constructor() {
    super(prisma, 'dispensation');
  }

  buildWhere({ status, type, studentId, search }) {
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (studentId) where.studentId = studentId;
    if (search) {
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
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
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, nis: true, fullName: true } },
        bill: { select: { id: true, invoiceNo: true, amount: true, period: true, description: true, academicYearId: true, feeType: { select: { name: true } } } },
        reviewedBy: { select: { fullName: true } },
      },
    });
  }

  detail(id) {
    return this.delegate.findUnique({
      where: { id },
      include: { student: true, bill: { include: { feeType: true } }, reviewedBy: { select: { fullName: true } } },
    });
  }
}

module.exports = { DispensationRepository, dispensationRepository: new DispensationRepository() };
