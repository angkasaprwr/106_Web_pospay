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

const statusByOrder = asyncHandler(async (req, res) => {
  const data = await paymentService.getStatus(req.params.orderId, req.user);
  return ok(res, data, 'Status pembayaran');
});

const detail = asyncHandler(async (req, res) => {
  const data = await paymentService.getStatus(req.params.id, req.user);
  return ok(res, data, 'Detail pembayaran');
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

const cancel = asyncHandler(async (req, res) => {
  const paymentId = req.params.id || req.body?.paymentId;
  const result = await paymentService.cancelPendingPayment(paymentId, req.user, req);
  return ok(res, result, result.message || 'Pembayaran dibatalkan');
});

const invoice = asyncHandler(async (req, res) => {
  await paymentService.streamInvoicePdf(req.params.id, req.user, res);
});

const midtransStatus = asyncHandler(async (req, res) => {
  const { env } = require('../../../config/env');
  const midtransGateway = require('../gateway/midtrans.gateway');
  const method = await require('../../../config/prisma').prisma.paymentMethod.findFirst({
    where: { channel: 'QRIS', isActive: true },
  });
  const keys = midtransGateway.resolveKeys(method || {});
  const sandboxReady = midtransGateway.isSandboxKeyPair(keys);
  return ok(res, {
    configured: midtransGateway.hasValidMidtransKeys(keys),
    sandbox_ready: sandboxReady,
    isProduction: keys.isProduction,
    env_is_production: env.midtrans.isProduction,
    key_prefix: keys.serverKey ? keys.serverKey.slice(0, 14) : null,
    school_account: {
      bank: 'BNI',
      accountNo: method?.accountNo || '6513009817',
      accountName: method?.accountName || 'PAPK SMP PUSPONEGORO BREBES',
    },
    simulator_url: 'https://simulator.sandbox.midtrans.com/openapi/qris/index',
    dashboard_keys_url: 'https://dashboard.sandbox.midtrans.com/settings/config_info',
    hint: sandboxReady
      ? 'Key Sandbox OK — buat pembayaran QRIS untuk generate EMV QR scannable.'
      : 'Isi SB-Mid-server-/SB-Mid-client- di server/.env (MIDTRANS_IS_PRODUCTION=false). Key Mid-server- Production menyebabkan No payment channels available.',
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
  statusByOrder,
  detail,
  history,
  methods,
  approve,
  reject,
  cashApprove,
  cashReject,
  cancel,
  invoice,
  midtransStatus,
  testQris,
};
