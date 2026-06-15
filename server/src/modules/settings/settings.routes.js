const { Router } = require('express');
const { z } = require('zod');
const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created } = require('../../core/ApiResponse');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { uploader, publicUrl } = require('../../middlewares/upload.middleware');
const service = require('./settings.service');

const router = Router();
const logoUpload = uploader('logos');

const schoolProfileSchema = z.object({
  name: z.string().min(1).optional(),
  npsn: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  headmaster: z.string().optional(),
  treasurer: z.string().optional(),
});

const securitySchema = z.object({
  passwordMinLength: z.coerce.number().int().min(4).max(64).optional(),
  sessionTimeoutMinutes: z.coerce.number().int().min(5).optional(),
  maxLoginAttempts: z.coerce.number().int().min(1).optional(),
  requireStrongPassword: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
});

const userSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.enum(['BENDAHARA']).optional().default('BENDAHARA'),
});

const userUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// School profile is readable by any authenticated user; updates limited to treasurer.
router.get('/school-profile', authenticate, asyncHandler(async (req, res) => ok(res, await service.getSchoolProfile())));
router.patch('/school-profile', authenticate, authorize('BENDAHARA'), validate({ body: schoolProfileSchema }), asyncHandler(async (req, res) => ok(res, await service.updateSchoolProfile(req.body, req.user.id, req), 'Profil sekolah diperbarui')));
router.post('/school-profile/logo', authenticate, authorize('BENDAHARA'), logoUpload.single('logo'), asyncHandler(async (req, res) => {
  const logoUrl = publicUrl('logos', req.file.filename);
  const profile = await service.updateSchoolProfile({ logoUrl }, req.user.id, req);
  return ok(res, profile, 'Logo diperbarui');
}));

router.get('/security', authenticate, authorize('BENDAHARA'), asyncHandler(async (req, res) => ok(res, await service.getSecuritySettings())));
router.patch('/security', authenticate, authorize('BENDAHARA'), validate({ body: securitySchema }), asyncHandler(async (req, res) => ok(res, await service.updateSecuritySettings(req.body, req.user.id, req), 'Pengaturan keamanan diperbarui')));

// User & account management
router.get('/users', authenticate, authorize('BENDAHARA'), asyncHandler(async (req, res) => ok(res, await service.listUsers(req.query))));
router.post('/users', authenticate, authorize('BENDAHARA'), validate({ body: userSchema }), asyncHandler(async (req, res) => created(res, await service.createUser(req.body, req.user.id, req), 'Pengguna dibuat')));
router.patch('/users/:id', authenticate, authorize('BENDAHARA'), validate({ body: userUpdateSchema }), asyncHandler(async (req, res) => ok(res, await service.updateUser(req.params.id, req.body, req.user.id, req), 'Pengguna diperbarui')));
router.delete('/users/:id', authenticate, authorize('BENDAHARA'), asyncHandler(async (req, res) => { await service.deleteUser(req.params.id, req.user.id, req); return ok(res, null, 'Pengguna dihapus'); }));

module.exports = router;
