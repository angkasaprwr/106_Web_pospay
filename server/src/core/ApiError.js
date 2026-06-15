/**
 * Standard application error carrying an HTTP status code.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Permintaan tidak valid', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Tidak terautentikasi') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Akses ditolak') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Data tidak ditemukan') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Data sudah ada') {
    return new ApiError(409, message);
  }

  static internal(message = 'Terjadi kesalahan pada server') {
    return new ApiError(500, message);
  }
}

module.exports = { ApiError };
