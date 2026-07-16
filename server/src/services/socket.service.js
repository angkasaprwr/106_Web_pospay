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
  STUDENT_CHANGED: 'student:changed',
};

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // Development: izinkan semua origin (port-forward / jaringan lambat)
      origin: env.isProd ? env.corsOrigins : true,
      credentials: true,
    },
    path: '/socket.io',
    pingInterval: 25000,
    pingTimeout: 20000,
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
  // Broadcast sekali ke kedua role (client debounce → 1 API refresh)
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
  // Targeted bill event + satu catalog (portal sync debounce kedua event → 1 refresh)
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
  const eventName = payment.status === 'VERIFIED' ? EVENTS.PAYMENT_VERIFIED : EVENTS.PAYMENT_UPDATED;

  if (studentUserId) emitToUser(studentUserId, eventName, data);
  emitToRole('BENDAHARA', eventName, data);

  // Satu catalog saja — jangan emit payment:updated + payment:pending + verified bersamaan
  emitCatalogChanged({ reason: 'payment_updated', paymentId: payment.id, status: payment.status });
}

function emitStudentChanged(action, student) {
  if (!io || !student) return;
  const data = {
    action,
    studentId: student.id,
    nis: student.nis,
    fullName: student.fullName,
    userId: student.userId || student.user?.id || null,
  };
  if (data.userId) emitToUser(data.userId, EVENTS.STUDENT_CHANGED, data);
  emitToRole('BENDAHARA', EVENTS.STUDENT_CHANGED, data);
  emitCatalogChanged({ reason: `student_${action}`, ...data });
}

module.exports = {
  initSocket,
  getIO,
  emitToUser,
  emitToRole,
  emitCatalogChanged,
  emitBillCreated,
  emitPaymentUpdated,
  emitStudentChanged,
  EVENTS,
};
