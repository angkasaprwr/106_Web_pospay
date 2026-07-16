const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created, paginated } = require('../../core/ApiResponse');
const { publicUrl } = require('../../middlewares/upload.middleware');
const service = require('./dispensation.service');

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await service.list(req.validatedQuery);
  return paginated(res, items, meta, 'Daftar dispensasi');
});

const detail = asyncHandler(async (req, res) => {
  const item = await service.getById(req.params.id);
  return ok(res, item);
});

const create = asyncHandler(async (req, res) => {
  if (req.file) req.body.attachmentUrl = publicUrl('dispensations', req.file.filename);
  const item = await service.create(req.body, { actor: req.user, req });
  return created(res, item, 'Pengajuan dispensasi terkirim');
});

const review = asyncHandler(async (req, res) => {
  const item = await service.review(req.params.id, req.body, req.user, req);
  return ok(res, item, 'Pengajuan dispensasi diproses');
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.id, req);
  return ok(res, null, 'Pengajuan dispensasi dihapus permanen');
});

module.exports = { list, detail, create, review, remove };
