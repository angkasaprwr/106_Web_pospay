const { Router } = require('express');
const { asyncHandler } = require('../../core/asyncHandler');
const { ok, created } = require('../../core/ApiResponse');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const service = require('./masterdata.service');
const { feeTypeSchema, paymentMethodSchema, academicYearSchema, classSchema } = require('./masterdata.validation');

const router = Router();
router.use(authenticate, authorize('BENDAHARA'));

// Fee types
router.get('/fee-types', asyncHandler(async (req, res) => ok(res, await service.feeTypes.list())));
router.post('/fee-types', validate({ body: feeTypeSchema }), asyncHandler(async (req, res) => created(res, await service.feeTypes.create(req.body, req.user.id, req))));
router.patch('/fee-types/:id', validate({ body: feeTypeSchema.partial() }), asyncHandler(async (req, res) => ok(res, await service.feeTypes.update(req.params.id, req.body, req.user.id, req))));
router.delete('/fee-types/:id', asyncHandler(async (req, res) => { await service.feeTypes.remove(req.params.id, req.user.id, req); return ok(res, null, 'Dihapus'); }));

// Payment methods
router.get('/payment-methods', asyncHandler(async (req, res) => ok(res, await service.paymentMethods.list())));
router.post('/payment-methods/ensure-cash', asyncHandler(async (req, res) => ok(res, await service.paymentMethods.ensureCash(), 'Metode tunai siap')));
router.post('/payment-methods', validate({ body: paymentMethodSchema }), asyncHandler(async (req, res) => created(res, await service.paymentMethods.create(req.body, req.user.id, req))));
router.patch('/payment-methods/:id', validate({ body: paymentMethodSchema.partial() }), asyncHandler(async (req, res) => ok(res, await service.paymentMethods.update(req.params.id, req.body, req.user.id, req))));
router.delete('/payment-methods/:id', asyncHandler(async (req, res) => { await service.paymentMethods.remove(req.params.id, req.user.id, req); return ok(res, null, 'Dihapus'); }));

// Academic years
router.get('/academic-years', asyncHandler(async (req, res) => ok(res, await service.academicYears.list())));
router.post('/academic-years', validate({ body: academicYearSchema }), asyncHandler(async (req, res) => created(res, await service.academicYears.create(req.body, req.user.id, req))));
router.patch('/academic-years/:id', validate({ body: academicYearSchema.partial() }), asyncHandler(async (req, res) => ok(res, await service.academicYears.update(req.params.id, req.body, req.user.id, req))));
router.post('/academic-years/:id/activate', asyncHandler(async (req, res) => { await service.academicYears.activate(req.params.id); return ok(res, null, 'Diaktifkan'); }));
router.delete('/academic-years/:id', asyncHandler(async (req, res) => { await service.academicYears.remove(req.params.id, req.user.id, req); return ok(res, null, 'Dihapus'); }));

// Classes
router.get('/classes', asyncHandler(async (req, res) => ok(res, await service.classes.list(req.query.academicYearId))));
router.post('/classes', validate({ body: classSchema }), asyncHandler(async (req, res) => created(res, await service.classes.create(req.body, req.user.id, req))));
router.patch('/classes/:id', validate({ body: classSchema.partial() }), asyncHandler(async (req, res) => ok(res, await service.classes.update(req.params.id, req.body, req.user.id, req))));
router.delete('/classes/:id', asyncHandler(async (req, res) => { await service.classes.remove(req.params.id, req.user.id, req); return ok(res, null, 'Dihapus'); }));

module.exports = router;
