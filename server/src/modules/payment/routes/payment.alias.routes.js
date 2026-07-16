const { Router } = require('express');
const paymentController = require('../controller/payment.controller');
const { validate } = require('../../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../../middlewares/auth.middleware');
const {
  createPaymentSchema,
  cashActionSchema,
} = require('../validator/payment.validator');
const masterdataService = require('../../masterdata/masterdata.service');
const { paymentMethodSchema } = require('../../masterdata/masterdata.validation');
const { asyncHandler } = require('../../../core/asyncHandler');
const { ok, created } = require('../../../core/ApiResponse');

/**
 * Alias routes sesuai spesifikasi:
 * POST /payments/create|webhook|cash|verify
 * GET  /payments/status/:id
 * CRUD /payment-methods
 *
 * Handler sama dengan modul /payment dan /masterdata agar UI existing tidak berubah.
 */
function createPaymentsAliasRouter() {
  const router = Router();

  router.post('/webhook', paymentController.webhook);

  router.use(authenticate);
  router.post('/create', authorize('SISWA'), validate({ body: createPaymentSchema }), paymentController.create);
  router.post('/cash', authorize('SISWA'), validate({ body: createPaymentSchema }), paymentController.createCash);
  router.post('/verify', authorize('BENDAHARA'), validate({ body: cashActionSchema }), paymentController.cashApprove);
  router.get('/status/:id', authorize('SISWA', 'BENDAHARA'), (req, res, next) => {
    req.params.invoiceId = req.params.id;
    return paymentController.status(req, res, next);
  });

  return router;
}

function createPaymentMethodsAliasRouter() {
  const router = Router();
  router.use(authenticate, authorize('BENDAHARA'));

  router.get('/', asyncHandler(async (req, res) => ok(res, await masterdataService.paymentMethods.list())));
  router.post('/', validate({ body: paymentMethodSchema }), asyncHandler(async (req, res) =>
    created(res, await masterdataService.paymentMethods.create(req.body, req.user.id, req))));
  router.put('/:id', validate({ body: paymentMethodSchema.partial() }), asyncHandler(async (req, res) =>
    ok(res, await masterdataService.paymentMethods.update(req.params.id, req.body, req.user.id, req))));
  router.patch('/:id', validate({ body: paymentMethodSchema.partial() }), asyncHandler(async (req, res) =>
    ok(res, await masterdataService.paymentMethods.update(req.params.id, req.body, req.user.id, req))));
  router.delete('/:id', asyncHandler(async (req, res) => {
    await masterdataService.paymentMethods.remove(req.params.id, req.user.id, req);
    return ok(res, null, 'Dihapus');
  }));

  return router;
}

module.exports = {
  createPaymentsAliasRouter,
  createPaymentMethodsAliasRouter,
};
