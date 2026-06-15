const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created, paginated } = require('../../core/ApiResponse');
const service = require('./student.service');

const list = asyncHandler(async (req, res) => {
  const { items, ...meta } = await service.list(req.validatedQuery);
  return paginated(res, items, meta, 'Daftar siswa');
});

const detail = asyncHandler(async (req, res) => {
  const student = await service.getById(req.params.id);
  return ok(res, student);
});

const create = asyncHandler(async (req, res) => {
  const student = await service.create(req.body, req.user.id, req);
  return created(res, student, 'Siswa berhasil ditambahkan');
});

const update = asyncHandler(async (req, res) => {
  const student = await service.update(req.params.id, req.body, req.user.id, req);
  return ok(res, student, 'Data siswa diperbarui');
});

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.id, req.user.id, req);
  return ok(res, null, 'Siswa dihapus');
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await service.resetPassword(req.params.id, req.body.newPassword, req.user.id, req);
  return ok(res, result, 'Password siswa direset');
});

const toggleAccount = asyncHandler(async (req, res) => {
  await service.toggleAccount(req.params.id, !!req.body.isActive, req.user.id, req);
  return ok(res, null, 'Status akun diperbarui');
});

module.exports = { list, detail, create, update, remove, resetPassword, toggleAccount };
