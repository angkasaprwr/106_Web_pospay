const path = require('path');
const { execSync } = require('child_process');
const { createApp } = require('./app');
const { env } = require('./config/env');
const { prisma } = require('./config/prisma');
const { logger } = require('./utils/logger');
const fcm = require('./services/fcm.service');
const emailService = require('./services/email.service');
const { initSocket } = require('./services/socket.service');
const { startReminderJob, stopReminderJob } = require('./jobs/reminder.job');
const { syncMidtransKeysToPaymentMethods } = require('./services/midtrans-setup.service');

const SERVER_ROOT = path.join(__dirname, '..');
const EXPECTED_MODELS = 29;

async function ensurePrismaMigrations() {
  try {
    execSync('npx prisma migrate deploy', {
      cwd: SERVER_ROOT,
      stdio: 'pipe',
      env: process.env,
    });
    logger.info('Migration Success');
    return true;
  } catch (e) {
    const msg = e.stderr?.toString?.() || e.message || String(e);
    logger.warn('Migration deploy gagal atau belum diperlukan', msg.slice(0, 300));
    return false;
  }
}

async function verifyDatabaseConnection() {
  await prisma.$connect();
  logger.info('Prisma Connected');

  await prisma.$queryRaw`SELECT 1`;
  logger.info('PostgreSQL Connected');

  const tables = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
  `;
  const tableCount = tables?.[0]?.count ?? 0;
  logger.info(`PostgreSQL tables ready (${tableCount} tabel, ${EXPECTED_MODELS} model Prisma)`);

  return tableCount;
}

async function bootstrap() {
  try {
    await verifyDatabaseConnection();
    await ensurePrismaMigrations();
  } catch (e) {
    logger.error('Gagal terhubung ke database. Periksa DATABASE_URL di server/.env', e.message);
    logger.error('Format: postgresql://postgres:db123@127.0.0.1:5433/db_sikes?schema=public');
  }

  await emailService.verifySmtpConnection();

  await syncMidtransKeysToPaymentMethods().catch((e) => {
    logger.warn('Sinkronisasi Midtrans keys gagal', e.message);
  });

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
