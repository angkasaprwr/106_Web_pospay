const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created, paginated } = require('../../core/ApiResponse');
const { publicUrl } = require('../../middlewares/upload.middleware');
const service = require('./payment.service');

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await service.list(req.validatedQuery);
  return paginated(res, items, meta, 'Daftar pembayaran');
});

const detail = asyncHandler(async (req, res) => {
  const payment = await service.getById(req.params.id);
  return ok(res, payment);
});

// Used by treasurer to record a payment directly (auto-verified).
const createByTreasurer = asyncHandler(async (req, res) => {
  if (req.file) req.body.proofUrl = publicUrl('proofs', req.file.filename);
  const payment = await service.create(req.body, { actor: req.user, asTreasurer: true, req });
  return created(res, payment, 'Pembayaran dicatat');
});

const verify = asyncHandler(async (req, res) => {
  const payment = await service.verify(req.params.id, req.body, req.user, req);
  return ok(res, payment, 'Pembayaran diverifikasi');
});

const reject = asyncHandler(async (req, res) => {
  const payment = await service.reject(req.params.id, req.body, req.user, req);
  return ok(res, payment, 'Pembayaran ditolak');
});

module.exports = { list, detail, createByTreasurer, verify, reject };
