const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

/** @type {import('socket.io').Server | null} */
let io = null;

const EVENTS = {
  BILL_CREATED: 'bill:created',
  BILL_UPDATED: 'bill:updated',
  PAYMENT_UPDATED: 'payment:updated',
  PAYMENT_VERIFIED: 'payment:verified',
  PAYMENT_PENDING: 'payment:pending',
  CATALOG_CHANGED: 'catalog:changed',
};

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token
        || socket.handshake.query?.token
        || (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = jwt.verify(token, env.jwt.accessSecret);
      socket.user = { id: payload.sub || payload.id, role: payload.role };
      return next();
    } catch (err) {
      logger.warn('Socket auth gagal', err.message);
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    if (role) socket.join(`role:${role}`);
    socket.emit('connected', { userId: id, role });
  });

  logger.info('Socket.IO aktif');
  return io;
}

function getIO() {
  return io;
}

function emitToUser(userId, event, data) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, data);
}

function emitToRole(role, event, data) {
  if (!io || !role) return;
  io.to(`role:${role}`).emit(event, data);
}

function emitCatalogChanged(payload = {}) {
  if (!io) return;
  io.to('role:SISWA').emit(EVENTS.CATALOG_CHANGED, payload);
  io.to('role:BENDAHARA').emit(EVENTS.CATALOG_CHANGED, payload);
}

function emitBillCreated(bill) {
  const data = {
    id: bill.id,
    studentId: bill.studentId,
    invoiceNo: bill.invoiceNo,
    amount: bill.amount,
    status: bill.status,
    feeTypeName: bill.feeType?.name,
  };
  if (bill.student?.userId) emitToUser(bill.student.userId, EVENTS.BILL_CREATED, data);
  emitToRole('BENDAHARA', EVENTS.BILL_CREATED, data);
  emitCatalogChanged({ reason: 'bill_created', billId: bill.id });
}

function emitPaymentUpdated(payment, extra = {}) {
  const data = {
    id: payment.id,
    billId: payment.billId,
    status: payment.status,
    midtransStatus: payment.midtransStatus,
    channel: payment.channel,
    orderId: payment.orderId,
    ...extra,
  };
  const studentUserId = payment.bill?.student?.userId;
  if (studentUserId) emitToUser(studentUserId, EVENTS.PAYMENT_UPDATED, data);
  emitToRole('BENDAHARA', EVENTS.PAYMENT_UPDATED, data);

  if (payment.status === 'VERIFIED') {
    if (studentUserId) emitToUser(studentUserId, EVENTS.PAYMENT_VERIFIED, data);
    emitToRole('BENDAHARA', EVENTS.PAYMENT_VERIFIED, data);
  }
  if (payment.status === 'PENDING') {
    emitToRole('BENDAHARA', EVENTS.PAYMENT_PENDING, data);
  }

  emitCatalogChanged({ reason: 'payment_updated', paymentId: payment.id, status: payment.status });
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitCatalogChanged,
  emitBillCreated,
  emitPaymentUpdated,
  EVENTS,
};
