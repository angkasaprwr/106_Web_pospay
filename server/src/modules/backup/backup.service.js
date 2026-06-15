const fs = require('fs');
const path = require('path');
const { prisma } = require('../../config/prisma');
const { env } = require('../../config/env');
const { ApiError } = require('../../core/ApiError');
const { recordAudit } = require('../audit/audit.service');
const { logger } = require('../../utils/logger');

const backupDir = path.resolve(__dirname, '../../../', env.backupDir);
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

// Order matters for restore (respect FK dependencies).
const MODELS = [
  'schoolProfile',
  'setting',
  'user',
  'academicYear',
  'schoolClass',
  'student',
  'feeType',
  'paymentMethod',
  'bill',
  'payment',
  'dispensation',
  'chatbotQA',
  'chatbotDocument',
  'workingHour',
  'chatSession',
  'chatMessage',
  'deviceToken',
  'notification',
  'auditLog',
];

async function createBackup(actorId, req) {
  const data = {};
  for (const model of MODELS) {
    // eslint-disable-next-line no-await-in-loop
    data[model] = await prisma[model].findMany();
  }
  const payload = { version: 1, createdAt: new Date().toISOString(), data };
  const fileName = `backup-${Date.now()}.json`;
  const filePath = path.join(backupDir, fileName);
  const content = JSON.stringify(payload, null, 2);
  fs.writeFileSync(filePath, content);

  const record = await prisma.backupRecord.create({
    data: { fileName, filePath, sizeBytes: Buffer.byteLength(content), createdById: actorId || null },
  });
  await recordAudit({ userId: actorId, action: 'BACKUP', entity: 'BackupRecord', entityId: record.id, req });
  return record;
}

async function listBackups() {
  return prisma.backupRecord.findMany({ orderBy: { createdAt: 'desc' } });
}

function getBackupFile(id) {
  return prisma.backupRecord.findUnique({ where: { id } });
}

async function restoreFromPayload(payload, actorId, req) {
  if (!payload || !payload.data) throw ApiError.badRequest('Format backup tidak valid');
  const { data } = payload;

  await prisma.$transaction(
    async (tx) => {
      // Delete in reverse dependency order.
      for (const model of [...MODELS].reverse()) {
        // eslint-disable-next-line no-await-in-loop
        await tx[model].deleteMany();
      }
      // Insert in dependency order.
      for (const model of MODELS) {
        const rows = data[model];
        if (Array.isArray(rows) && rows.length) {
          // eslint-disable-next-line no-await-in-loop
          await tx[model].createMany({ data: rows, skipDuplicates: true });
        }
      }
    },
    { timeout: 120000 },
  );

  await recordAudit({ userId: actorId, action: 'RESTORE', entity: 'Database', req });
  logger.warn('Database direstore dari backup');
}

async function restoreFromFile(id, actorId, req) {
  const record = await getBackupFile(id);
  if (!record || !fs.existsSync(record.filePath)) throw ApiError.notFound('File backup tidak ditemukan');
  const payload = JSON.parse(fs.readFileSync(record.filePath, 'utf-8'));
  await restoreFromPayload(payload, actorId, req);
}

async function deleteBackup(id) {
  const record = await getBackupFile(id);
  if (!record) throw ApiError.notFound('Backup tidak ditemukan');
  if (fs.existsSync(record.filePath)) fs.unlinkSync(record.filePath);
  await prisma.backupRecord.delete({ where: { id } });
}

module.exports = {
  backupDir,
  createBackup,
  listBackups,
  getBackupFile,
  restoreFromPayload,
  restoreFromFile,
  deleteBackup,
};
