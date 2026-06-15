const { BaseRepository } = require('../../core/BaseRepository');
const { prisma } = require('../../config/prisma');

class StudentRepository extends BaseRepository {
  constructor() {
    super(prisma, 'student');
  }

  findByNis(nis) {
    return this.delegate.findUnique({ where: { nis } });
  }

  list({ search, classId, status, page, limit }) {
    const where = {};
    if (status) where.status = status;
    if (classId) where.classId = classId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { nis: { contains: search, mode: 'insensitive' } },
        { nisn: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.paginate({
      where,
      page,
      limit,
      orderBy: { fullName: 'asc' },
      include: { schoolClass: true, user: { select: { id: true, username: true, isActive: true } } },
    });
  }

  detail(id) {
    return this.delegate.findUnique({
      where: { id },
      include: {
        schoolClass: { include: { academicYear: true } },
        user: { select: { id: true, username: true, isActive: true, lastLogin: true } },
      },
    });
  }
}

module.exports = { StudentRepository, studentRepository: new StudentRepository() };
