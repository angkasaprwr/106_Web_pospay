const cron = require('node-cron');
const { prisma } = require('../config/prisma');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');
const { notifyUser } = require('../modules/notifications/notification.service');
const billService = require('../modules/bills/bill.service');
const { outstanding } = require('../modules/bills/bill.helper');
const { formatIDR } = require('../utils/money');

let task = null;

/**
 * Send reminders for bills due within REMINDER_DAYS_BEFORE days or already overdue,
 * and refresh overdue statuses.
 */
async function runReminders() {
  logger.info('Menjalankan pengingat tagihan...');
  const updated = await billService.refreshOverdue();
  if (updated) logger.info(`${updated} tagihan ditandai jatuh tempo`);

  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + env.reminder.daysBefore);

  const bills = await prisma.bill.findMany({
    where: {
      status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      dueDate: { lte: horizon },
      student: { user: { isNot: null } },
    },
    include: { feeType: true, student: { select: { userId: true, fullName: true } } },
  });

  let sent = 0;
  for (const bill of bills) {
    if (!bill.student.userId) continue;
    const remaining = outstanding(bill);
    if (remaining <= 0) continue;
    const isOverdue = bill.dueDate && new Date(bill.dueDate) < now;
    const title = isOverdue ? 'Tagihan Jatuh Tempo' : 'Pengingat Tagihan';
    const due = bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('id-ID') : '-';
    const body = `${bill.feeType.name}: sisa ${formatIDR(remaining)}, jatuh tempo ${due}.`;
    // eslint-disable-next-line no-await-in-loop
    await notifyUser(bill.student.userId, { title, body, type: 'REMINDER', data: { billId: bill.id } });
    sent += 1;
  }
  logger.info(`Pengingat tagihan terkirim: ${sent}`);
  return { updated, sent };
}

function startReminderJob() {
  if (!env.reminder.enabled) {
    logger.info('Penjadwal pengingat (node-cron) dinonaktifkan');
    return null;
  }
  if (!cron.validate(env.reminder.cron)) {
    logger.warn(`Ekspresi cron tidak valid: ${env.reminder.cron}`);
    return null;
  }
  task = cron.schedule(env.reminder.cron, () => {
    runReminders().catch((e) => logger.error('Gagal menjalankan pengingat', e.message));
  });
  logger.info(`Penjadwal pengingat aktif (cron: ${env.reminder.cron})`);
  return task;
}

function stopReminderJob() {
  if (task) task.stop();
}

module.exports = { startReminderJob, stopReminderJob, runReminders };
