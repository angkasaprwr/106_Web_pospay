const { asyncHandler } = require('../../../core/asyncHandler');
const { ok, created } = require('../../../core/ApiResponse');
const createPaymentUsecase = require('../usecase/create-payment.usecase');
const createCashPaymentUsecase = require('../usecase/create-cash-payment.usecase');
const handleWebhookUsecase = require('../usecase/handle-webhook.usecase');
const getPaymentStatusUsecase = require('../usecase/get-payment-status.usecase');
const approvePaymentUsecase = require('../usecase/approve-payment.usecase');
const rejectPaymentUsecase = require('../usecase/reject-payment.usecase');
const paymentService = require('../payment.service');

const create = asyncHandler(async (req, res) => {
  const payment = await createPaymentUsecase.execute(req.body, req.user, req);
  return created(res, payment, 'Transaksi pembayaran dibuat');
});

const createCash = asyncHandler(async (req, res) => {
  const payment = await createCashPaymentUsecase.execute(req.body, req.user, req);
  return created(res, payment, 'Pengajuan pembayaran tunai terkirim');
});

const webhook = asyncHandler(async (req, res) => {
  const result = await handleWebhookUsecase.execute(req.body);
  return ok(res, { order_id: result.payment.orderId, status: result.payment.status }, 'Webhook diterima');
});

const status = asyncHandler(async (req, res) => {
  const data = await getPaymentStatusUsecase.execute(req.params.invoiceId, req.user);
  return ok(res, data, 'Status pembayaran');
});

const history = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await paymentService.getHistory(req.user, req.query);
  return ok(res, items, 'Riwayat pembayaran', { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

const methods = asyncHandler(async (req, res) => {
  const items = await paymentService.getPaymentMethods();
  return ok(res, items, 'Metode pembayaran');
});

const approve = asyncHandler(async (req, res) => {
  const payment = await approvePaymentUsecase.execute(req.params.id, req.body, req.user, req);
  return ok(res, payment, 'Pembayaran disetujui');
});

const reject = asyncHandler(async (req, res) => {
  const payment = await rejectPaymentUsecase.execute(req.params.id, req.body, req.user, req);
  return ok(res, payment, 'Pembayaran ditolak');
});

const cashApprove = asyncHandler(async (req, res) => {
  const payment = await approvePaymentUsecase.execute(req.body.paymentId, req.body, req.user, req);
  return ok(res, payment, 'Pembayaran tunai disetujui');
});

const cashReject = asyncHandler(async (req, res) => {
  const payment = await rejectPaymentUsecase.execute(req.body.paymentId, req.body, req.user, req);
  return ok(res, payment, 'Pembayaran tunai ditolak');
});

const invoice = asyncHandler(async (req, res) => {
  await paymentService.streamInvoicePdf(req.params.id, req.user, res);
});

module.exports = {
  create,
  createCash,
  webhook,
  status,
  history,
  methods,
  approve,
  reject,
  cashApprove,
  cashReject,
  invoice,
};
