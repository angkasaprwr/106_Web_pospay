const { Router } = require('express');
const fs = require('fs');
const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created } = require('../../core/ApiResponse');
const { ApiError } = require('../../core/ApiError');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { uploader } = require('../../middlewares/upload.middleware');
const service = require('./backup.service');

const router = Router();
const backupUpload = uploader('restores', (req, file, cb) => {
  if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) return cb(null, true);
  cb(ApiError.badRequest('File backup harus berformat JSON'));
});

router.use(authenticate, authorize('BENDAHARA'));

router.get('/', asyncHandler(async (req, res) => ok(res, await service.listBackups())));

router.post('/', asyncHandler(async (req, res) => created(res, await service.createBackup(req.user.id, req), 'Backup berhasil dibuat')));

router.get('/:id/download', asyncHandler(async (req, res) => {
  const record = await service.getBackupFile(req.params.id);
  if (!record || !fs.existsSync(record.filePath)) throw ApiError.notFound('File backup tidak ditemukan');
  return res.download(record.filePath, record.fileName);
}));

router.post('/:id/restore', asyncHandler(async (req, res) => {
  await service.restoreFromFile(req.params.id, req.user.id, req);
  return ok(res, null, 'Database berhasil direstore');
}));

router.post('/restore-upload', backupUpload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File backup wajib diunggah');
  const payload = JSON.parse(fs.readFileSync(req.file.path, 'utf-8'));
  await service.restoreFromPayload(payload, req.user.id, req);
  fs.unlinkSync(req.file.path);
  return ok(res, null, 'Database berhasil direstore dari file');
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteBackup(req.params.id);
  return ok(res, null, 'Backup dihapus');
}));

module.exports = router;
