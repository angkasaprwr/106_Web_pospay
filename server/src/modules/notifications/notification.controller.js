const { asyncHandler } = require('../../core/asyncHandler');
const { ok } = require('../../core/ApiResponse');
const service = require('./notification.service');

const list = asyncHandler(async (req, res) => {
  const result = await service.listForUser(req.user.id, {
    page: parseInt(req.query.page || '1', 10),
    limit: parseInt(req.query.limit || '20', 10),
  });
  const { items, ...meta } = result;
  return ok(res, items, 'Notifikasi', meta);
});

const markRead = asyncHandler(async (req, res) => {
  await service.markRead(req.user.id, req.params.id);
  return ok(res, null, 'Ditandai dibaca');
});

const markAllRead = asyncHandler(async (req, res) => {
  await service.markAllRead(req.user.id);
  return ok(res, null, 'Semua notifikasi ditandai dibaca');
});

const registerToken = asyncHandler(async (req, res) => {
  await service.registerDeviceToken(req.user.id, req.body.token, req.body.platform);
  return ok(res, null, 'Token perangkat terdaftar');
});

const removeToken = asyncHandler(async (req, res) => {
  await service.removeDeviceToken(req.body.token);
  return ok(res, null, 'Token perangkat dihapus');
});

module.exports = { list, markRead, markAllRead, registerToken, removeToken };
