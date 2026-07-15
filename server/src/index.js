const { createApp } = require('./app');
const { env } = require('./config/env');
const { prisma } = require('./config/prisma');
const { logger } = require('./utils/logger');
const fcm = require('./services/fcm.service');
const emailService = require('./services/email.service');
const { initSocket } = require('./services/socket.service');
const { startReminderJob, stopReminderJob } = require('./jobs/reminder.job');

async function bootstrap() {
  // Verify database connectivity early.
  try {
    await prisma.$connect();
    logger.info('Terhubung ke database');
  } catch (e) {
    logger.error('Gagal terhubung ke database. Periksa DATABASE_URL.', e.message);
  }

  await emailService.verifySmtpConnection();

  fcm.init();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`POSPAY API berjalan di port ${env.port} (${env.nodeEnv})`);
  });

  initSocket(server);
  startReminderJob();

  const shutdown = async (signal) => {
    logger.info(`${signal} diterima, mematikan server...`);
    stopReminderJob();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  ['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));
}

bootstrap().catch((e) => {
  logger.error('Gagal memulai server', e);
  process.exit(1);
});
