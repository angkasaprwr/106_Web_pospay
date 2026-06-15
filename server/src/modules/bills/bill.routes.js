const { Router } = require('express');
const controller = require('./bill.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { createBillSchema, bulkBillSchema, updateBillSchema, listBillSchema } = require('./bill.validation');

const router = Router();

router.use(authenticate, authorize('BENDAHARA'));

router.get('/', validate({ query: listBillSchema }), controller.list);
router.post('/', validate({ body: createBillSchema }), controller.create);
router.post('/bulk', validate({ body: bulkBillSchema }), controller.bulkCreate);
router.get('/:id', controller.detail);
router.patch('/:id', validate({ body: updateBillSchema }), controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
