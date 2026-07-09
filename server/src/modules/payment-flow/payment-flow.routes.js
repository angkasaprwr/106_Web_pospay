const { Router } = require('express');
const controller = require('./payment-flow.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const {
  createPaymentSchema,
  approveSchema,
  rejectSchema,
  historyQuerySchema,
} = require('./payment-flow.validation');

const router = Router();

// Public webhook — no auth
router.post('/midtrans/webhook', controller.webhook);

router.use(authenticate);

router.post('/create', authorize('SISWA'), validate({ body: createPaymentSchema }), controller.create);
router.post('/cash', authorize('SISWA'), validate({ body: createPaymentSchema }), controller.createCash);
router.get('/status/:id', authorize('SISWA', 'BENDAHARA'), controller.status);
router.get('/history', authorize('SISWA'), validate({ query: historyQuerySchema }), controller.history);
router.patch('/approve/:id', authorize('BENDAHARA'), validate({ body: approveSchema }), controller.approve);
router.patch('/reject/:id', authorize('BENDAHARA'), validate({ body: rejectSchema }), controller.reject);
router.get('/invoice/:id', authorize('SISWA', 'BENDAHARA'), controller.invoice);

module.exports = router;
