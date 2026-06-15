const { prisma } = require('../../config/prisma');
const { ApiError } = require('../../core/ApiError');
const { dispensationRepository } = require('./dispensation.repository');
const { computeStatus } = require('../bills/bill.helper');
const { toNumber } = require('../../utils/money');
const { recordAudit } = require('../audit/audit.service');
const { notifyUser } = require('../notifications/notification.service');

async function list(query) {
  return dispensationRepository.list(query);
}

async function getById(id) {
  const item = await dispensationRepository.detail(id);
  if (!item) throw ApiError.notFound('Pengajuan dispensasi tidak ditemukan');
  return item;
}

async function create(input, { actor, req }) {
  let studentId = input.studentId;
  if (actor.role === 'SISWA') {
    if (!actor.studentId) throw ApiError.badRequest('Akun siswa tidak tertaut data siswa');
    studentId = actor.studentId;
  }
  if (!studentId) throw ApiError.badRequest('Siswa wajib dipilih');

  if (input.billId) {
    const bill = await prisma.bill.findUnique({ where: { id: input.billId } });
    if (!bill) throw ApiError.notFound('Tagihan tidak ditemukan');
    if (bill.studentId !== studentId) throw ApiError.forbidden('Tagihan bukan milik siswa ini');
  }

  const dispensation = await prisma.dispensation.create({
    data: {
      studentId,
      billId: input.billId || null,
      type: input.type,
      reason: input.reason,
      amount: input.amount || 0,
      newDueDate: input.newDueDate || null,
      attachmentUrl: input.attachmentUrl || null,
      status: 'PENDING',
    },
    include: { student: true },
  });

  await recordAudit({ userId: actor.id, action: 'CREATE', entity: 'Dispensation', entityId: dispensation.id, req });

  const treasurers = await prisma.user.findMany({ where: { role: 'BENDAHARA', isActive: true }, select: { id: true } });
  await Promise.all(
    treasurers.map((t) =>
      notifyUser(t.id, {
        title: 'Pengajuan Dispensasi Baru',
        body: `${dispensation.student.fullName} mengajukan dispensasi.`,
        type: 'DISPENSATION_SUBMITTED',
        data: { dispensationId: dispensation.id },
      }),
    ),
  );

  return dispensation;
}

async function review(id, input, actor, req) {
  const dispensation = await prisma.dispensation.findUnique({ where: { id }, include: { bill: true, student: true } });
  if (!dispensation) throw ApiError.notFound('Pengajuan dispensasi tidak ditemukan');
  if (dispensation.status !== 'PENDING') throw ApiError.badRequest('Pengajuan sudah diproses');

  await prisma.$transaction(async (tx) => {
    await tx.dispensation.update({
      where: { id },
      data: {
        status: input.status,
        reviewNote: input.reviewNote || null,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.newDueDate !== undefined ? { newDueDate: input.newDueDate } : {}),
      },
    });

    if (input.status === 'APPROVED' && dispensation.bill) {
      const bill = dispensation.bill;
      const data = {};
      if (dispensation.type === 'WAIVER') {
        data.discount = toNumber(bill.amount);
      } else if (dispensation.type === 'DISCOUNT') {
        const disc = input.amount ?? toNumber(dispensation.amount);
        data.discount = Math.min(toNumber(bill.amount), toNumber(bill.discount) + disc);
      } else if (dispensation.type === 'POSTPONE') {
        const newDue = input.newDueDate || dispensation.newDueDate;
        if (newDue) data.dueDate = newDue;
      }
      const merged = {
        amount: bill.amount,
        discount: data.discount ?? bill.discount,
        paidAmount: bill.paidAmount,
        dueDate: data.dueDate ?? bill.dueDate,
      };
      data.status = computeStatus(merged);
      await tx.bill.update({ where: { id: bill.id }, data });
    }
  });

  await recordAudit({ userId: actor.id, action: input.status === 'APPROVED' ? 'APPROVE' : 'REJECT', entity: 'Dispensation', entityId: id, req });

  if (dispensation.student.userId) {
    await notifyUser(dispensation.student.userId, {
      title: input.status === 'APPROVED' ? 'Dispensasi Disetujui' : 'Dispensasi Ditolak',
      body: input.status === 'APPROVED' ? 'Pengajuan dispensasi Anda disetujui.' : `Pengajuan dispensasi ditolak. ${input.reviewNote || ''}`,
      type: 'DISPENSATION_REVIEWED',
      data: { dispensationId: id, status: input.status },
    });
  }

  return getById(id);
}

module.exports = { list, getById, create, review };
