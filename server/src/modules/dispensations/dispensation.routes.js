const { Router } = require('express');
const controller = require('./dispensation.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { uploader } = require('../../middlewares/upload.middleware');
const { createDispensationSchema, reviewSchema, listDispensationSchema } = require('./dispensation.validation');

const router = Router();
const attachmentUpload = uploader('dispensations');

router.use(authenticate, authorize('BENDAHARA'));

router.get('/', validate({ query: listDispensationSchema }), controller.list);
router.post('/', attachmentUpload.single('attachment'), validate({ body: createDispensationSchema }), controller.create);
router.get('/:id', controller.detail);
router.post('/:id/review', validate({ body: reviewSchema }), controller.review);

module.exports = router;
