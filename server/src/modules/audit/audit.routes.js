const { Router } = require('express');
const { asyncHandler } = require('../../core/asyncHandler');
const { paginated } = require('../../core/ApiResponse');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { prisma } = require('../../config/prisma');

const router = Router();
router.use(authenticate, authorize('BENDAHARA'));

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const where = {};
    if (req.query.action) where.action = req.query.action;
    if (req.query.entity) where.entity = req.query.entity;
    if (req.query.userId) where.userId = req.query.userId;
    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { fullName: true, username: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return paginated(res, items, { page, limit, total }, 'Audit log');
  }),
);

module.exports = router;
