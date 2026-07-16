/**
 * Payment module — Clean Architecture entry point.
 * Settlement: semua QRIS / transfer Midtrans ke satu rekening resmi sekolah via Midtrans.
 */
const paymentRoutes = require('./routes/payment.routes');
const paymentService = require('./payment.service');
const { paymentRepository } = require('./repository/payment.repository');
const midtransGateway = require('./gateway/midtrans.gateway');

module.exports = {
  paymentRoutes,
  paymentService,
  paymentRepository,
  midtransGateway,
};
