const { Router } = require('express');
const controller = require('./portal.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { uploader } = require('../../middlewares/upload.middleware');
const { createPaymentSchema } = require('../payments/payment.validation');
const { createDispensationSchema } = require('../dispensations/dispensation.validation');

const router = Router();
const proofUpload = uploader('proofs');
const attachmentUpload = uploader('dispensations');

router.use(authenticate, authorize('SISWA'));

router.get('/dashboard', controller.dashboard);
router.get('/bills', controller.listBills);
router.get('/bills/:id', controller.billDetail);
router.get('/payment-methods', controller.paymentMethods);
router.post('/payments', proofUpload.single('proof'), validate({ body: createPaymentSchema }), controller.submitPayment);
router.get('/payments', controller.listPayments);
router.post('/dispensations', attachmentUpload.single('attachment'), validate({ body: createDispensationSchema }), controller.submitDispensation);
router.get('/dispensations', controller.listDispensations);

module.exports = router;
