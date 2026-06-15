const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { env } = require('../config/env');
const { ApiError } = require('../core/ApiError');

const uploadRoot = path.resolve(__dirname, '../../', env.upload.dir);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

ensureDir(uploadRoot);

function buildStorage(subfolder) {
  const dest = path.join(uploadRoot, subfolder);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      cb(null, unique);
    },
  });
}

const imageAndPdfFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest('Tipe file tidak didukung (hanya JPG, PNG, WEBP, PDF)'));
};

function uploader(subfolder = 'misc', filter = imageAndPdfFilter) {
  return multer({
    storage: buildStorage(subfolder),
    limits: { fileSize: env.upload.maxSizeMb * 1024 * 1024 },
    fileFilter: filter,
  });
}

/** Build a public URL for an uploaded file. */
function publicUrl(subfolder, filename) {
  return `/uploads/${subfolder}/${filename}`;
}

module.exports = { uploader, publicUrl, uploadRoot };
