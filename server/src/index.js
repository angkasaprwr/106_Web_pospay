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
  const host = env.host || '0.0.0.0';
  const server = app.listen(env.port, host, () => {
    logger.info(`POSPAY API berjalan di http://${host}:${env.port} (${env.nodeEnv}) [IPv4+all interfaces]`);
    logger.info(`Health: http://127.0.0.1:${env.port}/api/health`);
  });

  // Kapasitas koneksi & keep-alive untuk jangkauan jauh / banyak permintaan paralel
  server.keepAliveTimeout = parseInt(process.env.HTTP_KEEP_ALIVE_MS || '65000', 10);
  server.headersTimeout = parseInt(process.env.HTTP_HEADERS_TIMEOUT_MS || '66000', 10);
  server.requestTimeout = parseInt(process.env.HTTP_REQUEST_TIMEOUT_MS || '120000', 10);
  const maxConn = parseInt(process.env.HTTP_MAX_CONNECTIONS || '0', 10);
  if (Number.isFinite(maxConn) && maxConn > 0) {
    server.maxConnections = maxConn;
  }

  server.on('error', (err) => {
    logger.error('Gagal bind HTTP server', err.message);
    process.exit(1);
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
