const { Router } = require('express');
const { asyncHandler } = require('../core/asyncHandler');
const { ok } = require('../core/ApiResponse');
const { prisma } = require('../config/prisma');
const { runReminders } = require('../jobs/reminder.job');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const authRoutes = require('../modules/auth/auth.routes');
const studentRoutes = require('../modules/students/student.routes');
const billRoutes = require('../modules/bills/bill.routes');
const legacyPaymentRoutes = require('../modules/payments/payment.routes');
const dispensationRoutes = require('../modules/dispensations/dispensation.routes');
const masterdataRoutes = require('../modules/masterdata/masterdata.routes');
const settingsRoutes = require('../modules/settings/settings.routes');
const auditRoutes = require('../modules/audit/audit.routes');
const backupRoutes = require('../modules/backup/backup.routes');
const dashboardRoutes = require('../modules/dashboard/dashboard.routes');
const reportRoutes = require('../modules/reports/report.routes');
const chatbotRoutes = require('../modules/chatbot/chatbot.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const portalRoutes = require('../modules/portal/portal.routes');
const { paymentRoutes: paymentGatewayRoutes } = require('../modules/payment');
const {
  createPaymentsAliasRouter,
  createPaymentMethodsAliasRouter,
} = require('../modules/payment/routes/payment.alias.routes');

const router = Router();

router.get('/health', asyncHandler(async (req, res) => {
  let database = 'disconnected';
  let tables = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'connected';
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
    `;
    tables = rows?.[0]?.count ?? 0;
  } catch {
    database = 'error';
  }
  return ok(res, {
    status: 'up',
    database,
    tables,
    prisma: database === 'connected' ? 'connected' : 'error',
    time: new Date().toISOString(),
  }, database === 'connected' ? 'OK' : 'Database unavailable');
}));

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/bills', billRoutes);
// Spec aliases (must be before /payments/:id legacy routes)
router.use('/payments', createPaymentsAliasRouter());
router.use('/payment-methods', createPaymentMethodsAliasRouter());
router.use('/payments', legacyPaymentRoutes);
router.use('/dispensations', dispensationRoutes);
router.use('/masterdata', masterdataRoutes);
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/backups', backupRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/notifications', notificationRoutes);
router.use('/portal', portalRoutes);
router.use('/payment', paymentGatewayRoutes);

// Manual trigger for reminders (treasurer only) - useful for testing the scheduler.
router.post(
  '/jobs/run-reminders',
  authenticate,
  authorize('BENDAHARA'),
  asyncHandler(async (req, res) => ok(res, await runReminders(), 'Pengingat dijalankan')),
);

module.exports = router;
