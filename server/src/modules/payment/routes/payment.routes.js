const { Router } = require('express');
const controller = require('../controller/payment.controller');
const { validate } = require('../../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');
const {
  createPaymentSchema,
  approveSchema,
  rejectSchema,
  cashActionSchema,
  cashRejectSchema,
  historyQuerySchema,
} = require('../validator/payment.validator');

const router = Router();

router.post('/webhook', controller.webhook);
router.post('/midtrans/webhook', controller.webhook);

router.use(authenticate);

router.get('/method', authorize('SISWA', 'BENDAHARA'), controller.methods);
router.post('/create', authorize('SISWA'), validate({ body: createPaymentSchema }), controller.create);
router.post('/cash', authorize('SISWA'), validate({ body: createPaymentSchema }), controller.createCash);
router.post('/verify', authorize('BENDAHARA'), validate({ body: cashActionSchema }), controller.cashApprove);
router.get('/status/:invoiceId', authorize('SISWA', 'BENDAHARA'), controller.status);
router.get('/history', authorize('SISWA'), validate({ query: historyQuerySchema }), controller.history);
router.post('/cash/approve', authorize('BENDAHARA'), validate({ body: cashActionSchema }), controller.cashApprove);
router.post('/cash/reject', authorize('BENDAHARA'), validate({ body: cashRejectSchema }), controller.cashReject);
router.patch('/approve/:id', authorize('BENDAHARA'), validate({ body: approveSchema }), controller.approve);
router.patch('/reject/:id', authorize('BENDAHARA'), validate({ body: rejectSchema }), controller.reject);
router.post('/cancel/:id', authorize('SISWA'), controller.cancel);
router.delete('/cancel/:id', authorize('SISWA'), controller.cancel);
router.get('/invoice/:id/pdf', authorize('SISWA', 'BENDAHARA'), controller.invoice);
router.get('/invoice/:id', authorize('SISWA', 'BENDAHARA'), controller.invoice);
router.get('/midtrans/status', authorize('BENDAHARA'), controller.midtransStatus);
router.post('/midtrans/test-qris', authorize('BENDAHARA'), controller.testQris);

module.exports = router;
