const { Router } = require('express');
const controller = require('./payment-flow.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const {
  createPaymentSchema,
  approveSchema,
  rejectSchema,
  cashActionSchema,
  cashRejectSchema,
  historyQuerySchema,
} = require('./payment-flow.validation');

const router = Router();

// Public webhook — no auth (Midtrans callback)
router.post('/webhook', controller.webhook);
router.post('/midtrans/webhook', controller.webhook);

router.use(authenticate);

router.get('/method', authorize('SISWA', 'BENDAHARA'), controller.methods);
router.post('/create', authorize('SISWA'), validate({ body: createPaymentSchema }), controller.create);
router.post('/cash', authorize('SISWA'), validate({ body: createPaymentSchema }), controller.createCash);
router.get('/status/:invoiceId', authorize('SISWA', 'BENDAHARA'), controller.status);
router.get('/history', authorize('SISWA'), validate({ query: historyQuerySchema }), controller.history);
router.post('/cash/approve', authorize('BENDAHARA'), validate({ body: cashActionSchema }), controller.cashApprove);
router.post('/cash/reject', authorize('BENDAHARA'), validate({ body: cashRejectSchema }), controller.cashReject);
router.patch('/approve/:id', authorize('BENDAHARA'), validate({ body: approveSchema }), controller.approve);
router.patch('/reject/:id', authorize('BENDAHARA'), validate({ body: rejectSchema }), controller.reject);
router.get('/invoice/:id/pdf', authorize('SISWA', 'BENDAHARA'), controller.invoice);
router.get('/invoice/:id', authorize('SISWA', 'BENDAHARA'), controller.invoice);

module.exports = router;
