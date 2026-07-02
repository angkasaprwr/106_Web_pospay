const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created } = require('../../core/ApiResponse');
const { env } = require('../../config/env');
const authService = require('./auth.service');

const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, cookieOptions);
}

const registrationStatus = asyncHandler(async (req, res) => {
  const open = await authService.isRegistrationOpen();
  return ok(res, { open }, open ? 'Registrasi terbuka' : 'Registrasi ditutup');
});

const register = asyncHandler(async (req, res) => {
  const result = await authService.requestRegistration(req.body, req);
  return created(res, result, result.message);
});

const verifyRegister = asyncHandler(async (req, res) => {
  const result = await authService.verifyRegistration(req.body, req);
  setRefreshCookie(res, result.refreshToken);
  return created(res, result, 'Akun bendahara berhasil diverifikasi dan dibuat');
});

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const result = await authService.login(username, password, req);
  setRefreshCookie(res, result.refreshToken);
  return ok(res, result, 'Login berhasil');
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  const result = await authService.refresh(token, req);
  setRefreshCookie(res, result.refreshToken);
  return ok(res, result, 'Token diperbarui');
});

const logout = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  await authService.logout(token, req.user?.id, req);
  res.clearCookie('refreshToken', { path: '/' });
  return ok(res, null, 'Logout berhasil');
});

const me = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.id);
  return ok(res, profile);
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await authService.updateProfile(req.user.id, req.body);
  return ok(res, profile, 'Profil diperbarui');
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword, req);
  return ok(res, null, 'Password berhasil diubah, silakan login kembali');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body.email, req);
  return ok(res, result, result.message);
});

const validateResetToken = asyncHandler(async (req, res) => {
  if (!req.query.token) return ok(res, { valid: false }, 'Token tidak ditemukan');
  const result = await authService.validatePasswordResetToken(req.query.token);
  return ok(res, result, result.valid ? 'Token valid' : 'Token tidak valid');
});

const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPasswordWithToken(req.body, req);
  return ok(res, result, result.message);
});

module.exports = {
  registrationStatus,
  register,
  verifyRegister,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  changePassword,
  forgotPassword,
  validateResetToken,
  resetPassword,
};
