const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created } = require('../../core/ApiResponse');
const { publicUrl } = require('../../middlewares/upload.middleware');
const portalService = require('./portal.service');
const paymentService = require('../payments/payment.service');
const dispensationService = require('../dispensations/dispensation.service');

const dashboard = asyncHandler(async (req, res) => {
  const data = await portalService.dashboard(req.user);
  return ok(res, data, 'Beranda siswa');
});

const listBills = asyncHandler(async (req, res) => {
  const { items, ...meta } = await portalService.listBills(req.user, req.query);
  return ok(res, items, 'Tagihan saya', meta);
});

const billDetail = asyncHandler(async (req, res) => {
  const bill = await portalService.billDetail(req.user, req.params.id);
  return ok(res, bill);
});

const paymentMethods = asyncHandler(async (req, res) => {
  const methods = await portalService.paymentMethods();
  return ok(res, methods, 'Metode pembayaran');
});

const catalogSyncVersion = asyncHandler(async (req, res) => {
  const version = await portalService.catalogSyncVersion(req.user);
  return ok(res, version, 'Versi sinkronisasi katalog');
});

const submitPayment = asyncHandler(async (req, res) => {
  if (req.file) req.body.proofUrl = publicUrl('proofs', req.file.filename);
  const payment = await paymentService.create(req.body, { actor: req.user, asTreasurer: false, req });
  const cashless = payment.cashlessPending || paymentService.isCashlessPayment(
    payment.channel,
    payment.paymentMethod?.name,
  );
  const message = cashless
    ? 'Pembayaran cashless dibuat. Scan QR untuk menyelesaikan pembayaran.'
    : 'Konfirmasi pembayaran terkirim, menunggu verifikasi';
  return created(res, payment, message);
});

const paymentDetail = asyncHandler(async (req, res) => {
  const payment = await paymentService.getForStudent(req.user, req.params.id);
  return ok(res, payment);
});

const paymentQr = asyncHandler(async (req, res) => {
  const qr = await paymentService.getQrForStudent(req.user, req.params.id);
  return ok(res, qr, 'QR pembayaran');
});

const settleCashless = asyncHandler(async (req, res) => {
  const payment = await paymentService.settleCashless(req.params.id, req.user, req);
  return ok(res, payment, 'Pembayaran cashless berhasil');
});

const listPayments = asyncHandler(async (req, res) => {
  const { items, ...meta } = await portalService.listPayments(req.user, req.query);
  return ok(res, items, 'Riwayat pembayaran', meta);
});

const submitDispensation = asyncHandler(async (req, res) => {
  if (req.file) req.body.attachmentUrl = publicUrl('dispensations', req.file.filename);
  const item = await dispensationService.create(req.body, { actor: req.user, req });
  return created(res, item, 'Pengajuan dispensasi terkirim');
});

const listDispensations = asyncHandler(async (req, res) => {
  const { items, ...meta } = await portalService.listDispensations(req.user, req.query);
  return ok(res, items, 'Riwayat dispensasi', meta);
});

module.exports = {
  dashboard,
  listBills,
  billDetail,
  paymentMethods,
  catalogSyncVersion,
  submitPayment,
  paymentDetail,
  paymentQr,
  settleCashless,
  listPayments,
  submitDispensation,
  listDispensations,
};
