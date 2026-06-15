const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { ApiError } = require('../core/ApiError');
const { asyncHandler } = require('../core/asyncHandler');
const { prisma } = require('../config/prisma');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  return null;
}

const authenticate = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Token akses tidak ditemukan');

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (e) {
    throw ApiError.unauthorized('Token tidak valid atau kedaluwarsa');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      isActive: true,
      student: { select: { id: true, nis: true } },
    },
  });

  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Akun tidak aktif atau tidak ditemukan');
  }

  req.user = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    studentId: user.student?.id || null,
  };
  next();
});

/** Restrict a route to one or more roles. */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Anda tidak memiliki izin untuk aksi ini'));
    }
    next();
  };
}

module.exports = { authenticate, authorize, extractToken };
