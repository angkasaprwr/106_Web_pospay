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

const midtransStatus = asyncHandler(async (req, res) => {
  const keysOk = Boolean(
    String(require('../../../config/env').env.midtrans.serverKey || '').trim()
    && String(require('../../../config/env').env.midtrans.clientKey || '').trim(),
  );
  const method = await require('../../../config/prisma').prisma.paymentMethod.findFirst({
    where: { channel: 'QRIS', isActive: true },
  });
  return ok(res, {
    configured: keysOk || Boolean(method?.midtransServerKey && method?.midtransClientKey),
    isProduction: require('../../../config/env').env.midtrans.isProduction,
    school_account: {
      bank: 'BNI',
      accountNo: method?.accountNo || '6513009817',
      accountName: method?.accountName || 'PAPK SMP PUSPONEGORO BREBES',
    },
    simulator_url: 'https://simulator.sandbox.midtrans.com/openapi/qris/index',
    dashboard_keys_url: 'https://dashboard.sandbox.midtrans.com/settings/config_info',
  }, 'Status konfigurasi Midtrans');
});

const testQris = asyncHandler(async (req, res) => {
  const { testQrisCharge } = require('../../../services/midtrans-setup.service');
  const result = await testQrisCharge({
    methodId: req.body?.paymentMethodId || req.body?.methodId,
    amount: req.body?.amount || 10000,
  });
  return ok(res, result, result.message);
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
  midtransStatus,
  testQris,
};
