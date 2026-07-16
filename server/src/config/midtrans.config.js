/**
 * Konfigurasi Midtrans resmi dari process.env (dotenv dimuat di config/env.js).
 * Jangan hardcode Server/Client Key.
 *
 * Catatan dashboard.sandbox.midtrans.com:
 * Merchant baru sering menampilkan Mid-server- / Mid-client- (bukan SB-Mid-).
 * Environment ditentukan oleh MIDTRANS_IS_PRODUCTION === "true", bukan prefix key.
 */
const midtransClient = require('midtrans-client');
const { env } = require('./env');
const { logger } = require('../utils/logger');

function readEnvServerKey() {
  return String(process.env.MIDTRANS_SERVER_KEY || env.midtrans.serverKey || '').trim();
}

function readEnvClientKey() {
  return String(process.env.MIDTRANS_CLIENT_KEY || env.midtrans.clientKey || '').trim();
}

function readSandboxServerKey() {
  return String(process.env.MIDTRANS_SANDBOX_SERVER_KEY || env.midtrans.sandboxServerKey || '').trim();
}

function readSandboxClientKey() {
  return String(process.env.MIDTRANS_SANDBOX_CLIENT_KEY || env.midtrans.sandboxClientKey || '').trim();
}

/** true hanya jika MIDTRANS_IS_PRODUCTION === "true" (string), sesuai dokumentasi Midtrans. */
function isProductionFlag() {
  return String(process.env.MIDTRANS_IS_PRODUCTION || '').toLowerCase() === 'true';
}

function keyPrefix(key, kind = 'server') {
  const k = String(key || '');
  if (!k) return '(kosong)';
  if (kind === 'server') {
    if (k.startsWith('SB-Mid-server-')) return 'SB-Mid-server-';
    if (k.startsWith('Mid-server-')) return 'Mid-server-';
    return `${k.slice(0, 12)}…`;
  }
  if (k.startsWith('SB-Mid-client-')) return 'SB-Mid-client-';
  if (k.startsWith('Mid-client-')) return 'Mid-client-';
  return `${k.slice(0, 12)}…`;
}

function isServerKeyFormat(sk) {
  return /^SB-Mid-server-|^Mid-server-/.test(String(sk || ''));
}

function isClientKeyFormat(ck) {
  if (!ck) return true;
  return /^SB-Mid-client-|^Mid-client-/.test(String(ck || ''));
}

/**
 * Key yang dipakai Snap/Core.
 * MIDTRANS_IS_PRODUCTION=false → host Sandbox (isProduction:false).
 * Prefix Mid-server- dari dashboard Sandbox tetap valid.
 */
function resolveEnvMidtransKeys(method = null) {
  const flagProduction = isProductionFlag();
  const envSk = readEnvServerKey();
  const envCk = readEnvClientKey();
  const sbSk = readSandboxServerKey();
  const sbCk = readSandboxClientKey();
  const methodSk = String(method?.midtransServerKey || '').trim();
  const methodCk = String(method?.midtransClientKey || '').trim();

  let serverKey = '';
  let clientKey = '';

  if (!flagProduction) {
    // Prioritas Sandbox: MIDTRANS_SANDBOX_* → MIDTRANS_* → method DB
    if (isServerKeyFormat(sbSk)) {
      serverKey = sbSk;
      clientKey = isClientKeyFormat(sbCk) && sbCk ? sbCk : (envCk || methodCk);
    } else if (isServerKeyFormat(envSk)) {
      serverKey = envSk;
      clientKey = envCk || sbCk || methodCk;
    } else if (isServerKeyFormat(methodSk)) {
      serverKey = methodSk;
      clientKey = methodCk || envCk || sbCk;
    } else {
      serverKey = envSk || methodSk || sbSk;
      clientKey = envCk || methodCk || sbCk;
    }
    return {
      serverKey,
      clientKey,
      isProduction: false,
      mode: 'Sandbox',
      source: describeKeySource(serverKey, { envSk, sbSk, methodSk }),
    };
  }

  serverKey = methodSk || envSk;
  clientKey = methodCk || envCk;
  return {
    serverKey,
    clientKey,
    isProduction: true,
    mode: 'Production',
    source: describeKeySource(serverKey, { envSk, sbSk, methodSk }),
  };
}

function describeKeySource(serverKey, { envSk, sbSk, methodSk }) {
  if (serverKey && serverKey === sbSk) return 'MIDTRANS_SANDBOX_*';
  if (serverKey && serverKey === envSk) return 'MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY';
  if (serverKey && serverKey === methodSk) return 'payment_method.midtransServerKey';
  return 'unknown';
}

/**
 * Instance Snap sesuai pola resmi Midtrans + dotenv.
 */
function createSnapFromEnv(method = null) {
  const keys = resolveEnvMidtransKeys(method);
  return {
    snap: new midtransClient.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: keys.serverKey || process.env.MIDTRANS_SERVER_KEY,
      clientKey: keys.clientKey || process.env.MIDTRANS_CLIENT_KEY,
    }),
    keys,
  };
}

function createCoreFromEnv(method = null) {
  const keys = resolveEnvMidtransKeys(method);
  return {
    core: new midtransClient.CoreApi({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: keys.serverKey || process.env.MIDTRANS_SERVER_KEY,
      clientKey: keys.clientKey || process.env.MIDTRANS_CLIENT_KEY,
    }),
    keys,
  };
}

/**
 * Validasi + logging saat startup (tanpa menampilkan full key).
 */
function validateMidtransStartup() {
  const issues = [];
  const warnings = [];
  const flagProduction = isProductionFlag();
  const envSk = readEnvServerKey();
  const envCk = readEnvClientKey();
  const sbSk = readSandboxServerKey();
  const sbCk = readSandboxClientKey();
  const resolved = resolveEnvMidtransKeys();

  // eslint-disable-next-line no-console
  console.log('========== Midtrans Configuration Audit ==========');
  // eslint-disable-next-line no-console
  console.log(`Midtrans Mode: ${flagProduction ? 'Production' : 'Sandbox'}`);
  // eslint-disable-next-line no-console
  console.log(`MIDTRANS_IS_PRODUCTION: ${process.env.MIDTRANS_IS_PRODUCTION || 'false'}`);
  // eslint-disable-next-line no-console
  console.log(`Server Key Prefix: ${keyPrefix(resolved.serverKey, 'server')}`);
  // eslint-disable-next-line no-console
  console.log(`Client Key Prefix: ${keyPrefix(resolved.clientKey, 'client')}`);
  // eslint-disable-next-line no-console
  console.log(`Key Source: ${resolved.source}`);
  // eslint-disable-next-line no-console
  console.log('dotenv: server/.env (MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY)');

  if (!envSk && !sbSk) {
    const msg = 'MIDTRANS_SERVER_KEY kosong. Isi di server/.env dari dashboard.sandbox.midtrans.com → Settings → Access Keys.';
    issues.push(msg);
    logger.error(msg);
    // eslint-disable-next-line no-console
    console.error(`[Midtrans] ERROR: ${msg}`);
  }
  if (!envCk && !sbCk) {
    const msg = 'MIDTRANS_CLIENT_KEY kosong. Isi di server/.env dari dashboard.sandbox.midtrans.com → Settings → Access Keys.';
    issues.push(msg);
    logger.error(msg);
    // eslint-disable-next-line no-console
    console.error(`[Midtrans] ERROR: ${msg}`);
  }

  if (resolved.serverKey && !isServerKeyFormat(resolved.serverKey)) {
    const msg = 'SERVER_KEY tidak diawali Mid-server- atau SB-Mid-server-. Salin ulang dari dashboard Midtrans.';
    warnings.push(msg);
    logger.warn(msg);
  }
  if (resolved.clientKey && !isClientKeyFormat(resolved.clientKey)) {
    const msg = 'CLIENT_KEY tidak diawali Mid-client- atau SB-Mid-client-. Salin ulang dari dashboard Midtrans.';
    warnings.push(msg);
    logger.warn(msg);
  }

  if (!flagProduction && /^SB-Mid-server-/.test(resolved.serverKey || '')) {
    // eslint-disable-next-line no-console
    console.log('Note: memakai format SB-Mid-server- (Sandbox klasik)');
  } else if (!flagProduction && /^Mid-server-/.test(resolved.serverKey || '')) {
    // eslint-disable-next-line no-console
    console.log('Note: Mid-server- dari dashboard Sandbox OK (host api.sandbox.midtrans.com)');
  }

  const readyForQris = !flagProduction
    && isServerKeyFormat(resolved.serverKey)
    && isClientKeyFormat(resolved.clientKey)
    && Boolean(resolved.serverKey)
    && Boolean(resolved.clientKey);

  // eslint-disable-next-line no-console
  console.log(`QRIS Sandbox Ready: ${readyForQris ? 'YES' : 'NO'}`);
  if (!readyForQris && !flagProduction) {
    // eslint-disable-next-line no-console
    console.log('Action: https://dashboard.sandbox.midtrans.com/settings/access-keys → copy Server/Client Key → server/.env → restart');
  }
  // eslint-disable-next-line no-console
  console.log('==================================================');

  logger.info('Midtrans startup audit', {
    mode: flagProduction ? 'Production' : 'Sandbox',
    serverKeyPrefix: keyPrefix(resolved.serverKey, 'server'),
    clientKeyPrefix: keyPrefix(resolved.clientKey, 'client'),
    source: resolved.source,
    readyForQris,
    issueCount: issues.length,
    warningCount: warnings.length,
  });

  return {
    ok: issues.length === 0,
    readyForQris,
    issues,
    warnings,
    mode: flagProduction ? 'Production' : 'Sandbox',
    serverKeyPrefix: keyPrefix(resolved.serverKey, 'server'),
    clientKeyPrefix: keyPrefix(resolved.clientKey, 'client'),
    source: resolved.source,
  };
}

module.exports = {
  isProductionFlag,
  readEnvServerKey,
  readEnvClientKey,
  keyPrefix,
  isServerKeyFormat,
  isClientKeyFormat,
  resolveEnvMidtransKeys,
  createSnapFromEnv,
  createCoreFromEnv,
  validateMidtransStartup,
};
