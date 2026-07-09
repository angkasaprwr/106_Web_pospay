const { Router } = require('express');
const { asyncHandler } = require('../core/asyncHandler');
const { ok } = require('../core/ApiResponse');
const { runReminders } = require('../jobs/reminder.job');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const authRoutes = require('../modules/auth/auth.routes');
const studentRoutes = require('../modules/students/student.routes');
const billRoutes = require('../modules/bills/bill.routes');
const paymentRoutes = require('../modules/payments/payment.routes');
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
const paymentFlowRoutes = require('../modules/payment-flow/payment-flow.routes');

const router = Router();

router.get('/health', (req, res) => ok(res, { status: 'up', time: new Date().toISOString() }, 'OK'));

router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/bills', billRoutes);
router.use('/payments', paymentRoutes);
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
router.use('/payment', paymentFlowRoutes);

// Manual trigger for reminders (treasurer only) - useful for testing the scheduler.
router.post(
  '/jobs/run-reminders',
  authenticate,
  authorize('BENDAHARA'),
  asyncHandler(async (req, res) => ok(res, await runReminders(), 'Pengingat dijalankan')),
);

module.exports = router;
