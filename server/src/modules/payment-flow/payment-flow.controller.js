const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created } = require('../../core/ApiResponse');
const service = require('./payment-flow.service');

const create = asyncHandler(async (req, res) => {
  const payment = await service.createPayment(req.body, req.user, req);
  return created(res, payment, 'Transaksi pembayaran dibuat');
});

const createCash = asyncHandler(async (req, res) => {
  const payment = await service.createCashPayment(req.body, req.user, req);
  return created(res, payment, 'Pengajuan pembayaran tunai terkirim');
});

const webhook = asyncHandler(async (req, res) => {
  const result = await service.handleMidtransWebhook(req.body);
  return ok(res, { order_id: result.payment.orderId, status: result.payment.status }, 'Webhook diterima');
});

const status = asyncHandler(async (req, res) => {
  const data = await service.getStatus(req.params.id, req.user);
  return ok(res, data, 'Status pembayaran');
});

const history = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await service.getHistory(req.user, req.query);
  return ok(res, items, 'Riwayat pembayaran', { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

const approve = asyncHandler(async (req, res) => {
  const payment = await service.approvePayment(req.params.id, req.body, req.user, req);
  return ok(res, payment, 'Pembayaran disetujui');
});

const reject = asyncHandler(async (req, res) => {
  const payment = await service.rejectPayment(req.params.id, req.body, req.user, req);
  return ok(res, payment, 'Pembayaran ditolak');
});

const invoice = asyncHandler(async (req, res) => {
  await service.streamInvoicePdf(req.params.id, req.user, res);
});

module.exports = { create, createCash, webhook, status, history, approve, reject, invoice };
