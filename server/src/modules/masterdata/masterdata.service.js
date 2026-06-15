const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { recordAudit } = require('../audit/audit.service');

// ---------------- Fee Types ----------------
const feeTypes = {
  list: () => prisma.feeType.findMany({ orderBy: { name: 'asc' } }),
  create: async (data, actorId, req) => {
    const item = await prisma.feeType.create({ data });
    await recordAudit({ userId: actorId, action: 'CREATE', entity: 'FeeType', entityId: item.id, req });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const item = await prisma.feeType.update({ where: { id }, data });
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'FeeType', entityId: id, req });
    return item;
  },
  remove: async (id, actorId, req) => {
    const count = await prisma.bill.count({ where: { feeTypeId: id } });
    if (count > 0) throw ApiError.badRequest('Jenis tagihan dipakai oleh tagihan, nonaktifkan saja');
    await prisma.feeType.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'FeeType', entityId: id, req });
  },
};

// ---------------- Payment Methods ----------------
const paymentMethods = {
  list: () => prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
  create: async (data, actorId, req) => {
    const item = await prisma.paymentMethod.create({ data });
    await recordAudit({ userId: actorId, action: 'CREATE', entity: 'PaymentMethod', entityId: item.id, req });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const item = await prisma.paymentMethod.update({ where: { id }, data });
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'PaymentMethod', entityId: id, req });
    return item;
  },
  remove: async (id, actorId, req) => {
    await prisma.paymentMethod.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'PaymentMethod', entityId: id, req });
  },
};

// ---------------- Academic Years ----------------
const academicYears = {
  list: () => prisma.academicYear.findMany({ orderBy: { name: 'desc' }, include: { _count: { select: { classes: true } } } }),
  create: async (data, actorId, req) => {
    const item = await prisma.academicYear.create({ data });
    if (data.isActive) await academicYears.activate(item.id);
    await recordAudit({ userId: actorId, action: 'CREATE', entity: 'AcademicYear', entityId: item.id, req });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const item = await prisma.academicYear.update({ where: { id }, data });
    if (data.isActive) await academicYears.activate(id);
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'AcademicYear', entityId: id, req });
    return item;
  },
  activate: async (id) => {
    await prisma.$transaction([
      prisma.academicYear.updateMany({ data: { isActive: false }, where: { isActive: true } }),
      prisma.academicYear.update({ where: { id }, data: { isActive: true } }),
    ]);
  },
  remove: async (id, actorId, req) => {
    await prisma.academicYear.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'AcademicYear', entityId: id, req });
  },
};

// ---------------- Classes ----------------
const classes = {
  list: (academicYearId) =>
    prisma.schoolClass.findMany({
      where: academicYearId ? { academicYearId } : {},
      orderBy: [{ grade: 'asc' }, { name: 'asc' }],
      include: { academicYear: { select: { name: true } }, _count: { select: { students: true } } },
    }),
  create: async (data, actorId, req) => {
    const item = await prisma.schoolClass.create({ data });
    await recordAudit({ userId: actorId, action: 'CREATE', entity: 'SchoolClass', entityId: item.id, req });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const item = await prisma.schoolClass.update({ where: { id }, data });
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'SchoolClass', entityId: id, req });
    return item;
  },
  remove: async (id, actorId, req) => {
    await prisma.schoolClass.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'SchoolClass', entityId: id, req });
  },
};

module.exports = { feeTypes, paymentMethods, academicYears, classes };
