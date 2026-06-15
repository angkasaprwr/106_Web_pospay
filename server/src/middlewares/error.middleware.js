const { Prisma } = require('@prisma/client');
const { ApiError } = require('../core/ApiError');
const { logger } = require('../utils/logger');
const { env } = require('../config/env');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Terjadi kesalahan pada server';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err && err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validasi gagal';
    details = err.errors?.map((e) => ({ path: e.path.join('.'), message: e.message }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target;
      message = `Data dengan ${target || 'nilai tersebut'} sudah ada`;
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Data tidak ditemukan';
    } else {
      statusCode = 400;
      message = 'Operasi database gagal';
    }
  } else if (err && err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token tidak valid';
  } else if (err && err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token kedaluwarsa';
  } else if (err && err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Ukuran file terlalu besar';
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, err.stack);
  }

  const body = { success: false, message };
  if (details) body.details = details;
  if (!env.isProd && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
