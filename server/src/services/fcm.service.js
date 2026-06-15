const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

let admin = null;
let initialized = false;
let enabled = false;

function loadServiceAccount() {
  if (env.firebase.serviceAccountBase64) {
    try {
      const json = Buffer.from(env.firebase.serviceAccountBase64, 'base64').toString('utf-8');
      return JSON.parse(json);
    } catch (e) {
      logger.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 tidak valid', e.message);
    }
  }
  if (env.firebase.serviceAccountPath) {
    const resolved = path.isAbsolute(env.firebase.serviceAccountPath)
      ? env.firebase.serviceAccountPath
      : path.resolve(__dirname, '../../', env.firebase.serviceAccountPath);
    if (fs.existsSync(resolved)) {
      return JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    }
    logger.warn(`Firebase service account tidak ditemukan di ${resolved}`);
  }
  return null;
}

function init() {
  if (initialized) return enabled;
  initialized = true;
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    logger.info('FCM tidak dikonfigurasi - notifikasi push dinonaktifkan (in-app tetap berjalan)');
    return false;
  }
  try {
    // eslint-disable-next-line global-require
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    enabled = true;
    logger.info('Firebase Admin (FCM) terinisialisasi');
  } catch (e) {
    logger.warn('Gagal menginisialisasi Firebase Admin', e.message);
    enabled = false;
  }
  return enabled;
}

function isEnabled() {
  if (!initialized) init();
  return enabled;
}

/**
 * Send a push notification to a set of device tokens.
 * @returns {Promise<{successCount:number, failureCount:number, invalidTokens:string[]}>}
 */
async function sendToTokens(tokens, { title, body, data = {} }) {
  if (!isEnabled() || !tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }
  const stringData = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
  const message = {
    notification: { title, body },
    data: stringData,
    tokens,
  };
  try {
    const res = await admin.messaging().sendEachForMulticast(message);
    const invalidTokens = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalidTokens.push(tokens[i]);
        }
      }
    });
    return { successCount: res.successCount, failureCount: res.failureCount, invalidTokens };
  } catch (e) {
    logger.warn('Gagal mengirim FCM', e.message);
    return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
  }
}

module.exports = { init, isEnabled, sendToTokens };
