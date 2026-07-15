const rateLimit = require('express-rate-limit');

/** Jendela 15 menit; angka tinggi untuk uji CRUD / portal dengan banyak permintaan. */
const apiMax = parseInt(process.env.API_RATE_LIMIT_MAX || '5000', 10);
const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '200', 10);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(apiMax) && apiMax > 0 ? apiMax : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi nanti' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(authMax) && authMax > 0 ? authMax : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi nanti' },
});

module.exports = { apiLimiter, authLimiter };
