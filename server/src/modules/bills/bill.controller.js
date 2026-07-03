const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created, paginated } = require('../../core/ApiResponse');
const service = require('./bill.service');

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await service.list(req.validatedQuery);
  return paginated(res, items, meta, 'Daftar tagihan');
});

const detail = asyncHandler(async (req, res) => {
  const bill = await service.getById(req.params.id);
  return ok(res, bill);
});

const create = asyncHandler(async (req, res) => {
  const bill = await service.create(req.body, req.user.id, req);
  return created(res, bill, 'Tagihan dibuat');
});

const bulkCreate = asyncHandler(async (req, res) => {
  const result = await service.bulkCreate(req.body, req.user.id, req);
  return created(res, result, `${result.created} tagihan dibuat`);
});

const update = asyncHandler(async (req, res) => {
  const bill = await service.update(req.params.id, req.body, req.user.id, req);
  return ok(res, bill, 'Tagihan diperbarui');
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.id, req);
  return ok(res, null, 'Tagihan dihapus');
});

const sendReminder = asyncHandler(async (req, res) => {
  const notification = await service.sendPaymentReminder(req.params.id, req.user.id, req);
  return ok(res, notification, 'Notifikasi pengingat tagihan terkirim ke siswa');
});

module.exports = { list, detail, create, bulkCreate, update, remove, sendReminder };
