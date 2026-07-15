const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { recordAudit } = require('../audit/audit.service');
const { emitCatalogChanged } = require('../../services/socket.service');
const { applyMidtransKeysFromMethod } = require('../../services/midtrans-setup.service');

function notifyCatalog(reason, extra = {}) {
  emitCatalogChanged({ reason, ...extra });
}

function withSchoolAccountDefaults(data = {}) {
  const next = { ...data };
  if (next.channel === 'QRIS' || next.paymentType === 'QRIS_MIDTRANS' || next.channel === 'TRANSFER' || next.paymentType === 'TRANSFER_MIDTRANS') {
    next.accountNo = next.accountNo || '6513009817';
    next.accountName = next.accountName || 'PAPK SMP PUSPONEGORO BREBES';
    next.gateway = next.gateway || 'midtrans';
  }
  if (next.channel === 'QRIS') next.paymentType = next.paymentType || 'QRIS_MIDTRANS';
  if (next.channel === 'TRANSFER' && next.gateway === 'midtrans') {
    next.paymentType = next.paymentType || 'TRANSFER_MIDTRANS';
  }
  return next;
}

// ---------------- Fee Types ----------------
const feeTypes = {
  list: () => prisma.feeType.findMany({ orderBy: { name: 'asc' } }),
  create: async (data, actorId, req) => {
    const item = await prisma.feeType.create({ data });
    await recordAudit({ userId: actorId, action: 'CREATE', entity: 'FeeType', entityId: item.id, req });
    notifyCatalog('fee_type_created', { feeTypeId: item.id });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const item = await prisma.feeType.update({ where: { id }, data });
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'FeeType', entityId: id, req });
    notifyCatalog('fee_type_updated', { feeTypeId: id });
    return item;
  },
  remove: async (id, actorId, req) => {
    const count = await prisma.bill.count({ where: { feeTypeId: id } });
    if (count > 0) throw ApiError.badRequest('Jenis tagihan dipakai oleh tagihan, nonaktifkan saja');
    await prisma.feeType.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'FeeType', entityId: id, req });
    notifyCatalog('fee_type_deleted', { feeTypeId: id });
  },
};

// ---------------- Payment Methods ----------------
const paymentMethods = {
  list: () => prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } }),
  create: async (data, actorId, req) => {
    const payload = withSchoolAccountDefaults(data);
    const item = await prisma.paymentMethod.create({ data: payload });
    await applyMidtransKeysFromMethod(payload).catch(() => {});
    await recordAudit({ userId: actorId, action: 'CREATE', entity: 'PaymentMethod', entityId: item.id, req });
    notifyCatalog('payment_method_created', { paymentMethodId: item.id });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const payload = withSchoolAccountDefaults(data);
    const item = await prisma.paymentMethod.update({ where: { id }, data: payload });
    await applyMidtransKeysFromMethod(payload).catch(() => {});
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'PaymentMethod', entityId: id, req });
    notifyCatalog('payment_method_updated', { paymentMethodId: id });
    return item;
  },
  remove: async (id, actorId, req) => {
    await prisma.paymentMethod.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'PaymentMethod', entityId: id, req });
    notifyCatalog('payment_method_deleted', { paymentMethodId: id });
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
    notifyCatalog('class_created', { classId: item.id });
    return item;
  },
  update: async (id, data, actorId, req) => {
    const item = await prisma.schoolClass.update({ where: { id }, data });
    await recordAudit({ userId: actorId, action: 'UPDATE', entity: 'SchoolClass', entityId: id, req });
    notifyCatalog('class_updated', { classId: id });
    return item;
  },
  remove: async (id, actorId, req) => {
    const linked = await prisma.student.count({ where: { classId: id } });
    if (linked > 0) {
      throw ApiError.badRequest(`Kelas masih memiliki ${linked} siswa. Pindahkan siswa terlebih dahulu.`);
    }
    await prisma.schoolClass.delete({ where: { id } });
    await recordAudit({ userId: actorId, action: 'DELETE', entity: 'SchoolClass', entityId: id, req });
    notifyCatalog('class_deleted', { classId: id });
  },
};

module.exports = { feeTypes, paymentMethods, academicYears, classes };
