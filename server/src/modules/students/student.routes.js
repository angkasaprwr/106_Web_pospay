const { Router } = require('express');
const controller = require('./student.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const {
  createStudentSchema,
  updateStudentSchema,
  listStudentSchema,
  resetPasswordSchema,
} = require('./student.validation');

const router = Router();

router.use(authenticate, authorize('BENDAHARA'));

router.get('/', validate({ query: listStudentSchema }), controller.list);
router.post('/', validate({ body: createStudentSchema }), controller.create);
router.get('/:id', controller.detail);
router.patch('/:id', validate({ body: updateStudentSchema }), controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/reset-password', validate({ body: resetPasswordSchema }), controller.resetPassword);
router.post('/:id/toggle-account', controller.toggleAccount);

module.exports = router;
