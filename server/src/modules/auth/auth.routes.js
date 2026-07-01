const { Router } = require('express');
const controller = require('./auth.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authLimiter } = require('../../middlewares/rateLimit.middleware');
const {
  registerSchema,
  verifyRegistrationSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('./auth.validation');

const router = Router();

router.get('/registration-status', controller.registrationStatus);
router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
router.post('/register/verify', authLimiter, validate({ body: verifyRegistrationSchema }), controller.verifyRegister);
router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
router.get('/reset-password/validate', controller.validateResetToken);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
router.post('/refresh', validate({ body: refreshSchema }), controller.refresh);
router.post('/logout', controller.logout);

router.get('/me', authenticate, controller.me);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), controller.updateProfile);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), controller.changePassword);

module.exports = router;
