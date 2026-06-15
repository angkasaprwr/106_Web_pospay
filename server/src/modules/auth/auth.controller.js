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
  const result = await authService.register(req.body, req);
  setRefreshCookie(res, result.refreshToken);
  return created(res, result, 'Akun bendahara berhasil dibuat');
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

module.exports = {
  registrationStatus,
  register,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  changePassword,
};
