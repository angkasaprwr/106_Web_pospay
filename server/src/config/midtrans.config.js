/**
 * Konfigurasi Midtrans resmi dari process.env (dotenv dimuat di config/env.js).
 * Jangan hardcode Server/Client Key.
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

/**
 * Key yang dipakai Snap/Core:
 * - MIDTRANS_IS_PRODUCTION=false → HANYA Sandbox (SB-Mid-…)
 * - Preferensi: MIDTRANS_SANDBOX_* → MIDTRANS_* jika SB- → (opsional) method SB-
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
    // Mode Sandbox: jangan pakai Mid-server- Production (penyebab "No payment channels")
    if (/^SB-Mid-server-/.test(sbSk) && /^SB-Mid-client-/.test(sbCk || 'SB-Mid-client-')) {
      serverKey = sbSk;
      clientKey = sbCk || envCk;
    } else if (/^SB-Mid-server-/.test(envSk)) {
      serverKey = envSk;
      clientKey = /^SB-Mid-client-/.test(envCk) ? envCk : (sbCk || envCk);
    } else if (/^SB-Mid-server-/.test(methodSk)) {
      serverKey = methodSk;
      clientKey = /^SB-Mid-client-/.test(methodCk) ? methodCk : (sbCk || envCk);
    } else {
      // Tetap expose env key agar validasi/error jelas (bukan diam-diam Production)
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

  // Mode Production
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
 * Saat Sandbox, isProduction selalu false; key diambil dari resolveEnvMidtransKeys.
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
 * @returns {{ ok: boolean, readyForQris: boolean, issues: string[], warnings: string[] }}
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
  console.log(`dotenv: server/.env (MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY)`);

  if (!envSk && !sbSk) {
    const msg = 'MIDTRANS_SERVER_KEY kosong. Isi di server/.env (Sandbox: SB-Mid-server-…).';
    issues.push(msg);
    logger.error(msg);
    // eslint-disable-next-line no-console
    console.error(`[Midtrans] ERROR: ${msg}`);
  }
  if (!envCk && !sbCk) {
    const msg = 'MIDTRANS_CLIENT_KEY kosong. Isi di server/.env (Sandbox: SB-Mid-client-…).';
    issues.push(msg);
    logger.error(msg);
    // eslint-disable-next-line no-console
    console.error(`[Midtrans] ERROR: ${msg}`);
  }

  if (!flagProduction) {
    const effectiveSk = resolved.serverKey || envSk || sbSk;
    const effectiveCk = resolved.clientKey || envCk || sbCk;
    if (effectiveSk && !effectiveSk.startsWith('SB-Mid-server-')) {
      const msg = 'MIDTRANS_IS_PRODUCTION=false tetapi SERVER_KEY bukan SB-Mid-server-. Sandbox Key wajib digunakan agar QRIS tidak "No payment channels available".';
      warnings.push(msg);
      logger.warn(msg);
      // eslint-disable-next-line no-console
      console.warn(`[Midtrans] WARNING: ${msg}`);
    }
    if (effectiveCk && !effectiveCk.startsWith('SB-Mid-client-')) {
      const msg = 'MIDTRANS_IS_PRODUCTION=false tetapi CLIENT_KEY bukan SB-Mid-client-. Sandbox Client Key wajib digunakan.';
      warnings.push(msg);
      logger.warn(msg);
      // eslint-disable-next-line no-console
      console.warn(`[Midtrans] WARNING: ${msg}`);
    }
    if (/^Mid-server-/.test(envSk) && !sbSk) {
      const msg = 'Key Production (Mid-server-) terdeteksi di MIDTRANS_SERVER_KEY. Ganti ke SB-Mid-server- dari dashboard.sandbox.midtrans.com atau isi MIDTRANS_SANDBOX_SERVER_KEY.';
      warnings.push(msg);
      logger.warn(msg);
    }
  }

  const readyForQris = !flagProduction
    && /^SB-Mid-server-/.test(resolved.serverKey)
    && (!resolved.clientKey || /^SB-Mid-client-/.test(resolved.clientKey));

  // eslint-disable-next-line no-console
  console.log(`QRIS Sandbox Ready: ${readyForQris ? 'YES' : 'NO'}`);
  if (!readyForQris && !flagProduction) {
    // eslint-disable-next-line no-console
    console.log('Action: https://dashboard.sandbox.midtrans.com/settings/config_info → copy SB-Mid-server- / SB-Mid-client- → server/.env → restart');
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
  resolveEnvMidtransKeys,
  createSnapFromEnv,
  createCoreFromEnv,
  validateMidtransStartup,
};
