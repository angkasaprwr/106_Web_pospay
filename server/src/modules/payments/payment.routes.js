const { Router } = require('express');
const controller = require('./payment.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { uploader } = require('../../middlewares/upload.middleware');
const { createPaymentSchema, verifySchema, rejectSchema, listPaymentSchema } = require('./payment.validation');

const router = Router();
const proofUpload = uploader('proofs');

router.use(authenticate, authorize('BENDAHARA'));

router.get('/', validate({ query: listPaymentSchema }), controller.list);
router.post('/', proofUpload.single('proof'), validate({ body: createPaymentSchema }), controller.createByTreasurer);
router.get('/:id', controller.detail);
router.post('/:id/verify', validate({ body: verifySchema }), controller.verify);
router.post('/:id/reject', validate({ body: rejectSchema }), controller.reject);

module.exports = router;
