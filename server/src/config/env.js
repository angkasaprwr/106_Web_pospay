const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Prioritas: server/.env (folder backend), fallback root /.env
const serverEnvPath = path.resolve(__dirname, '../../.env'); // server/src/config → server/.env
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

function bool(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === 'true';
}

/** Gmail App Password: strip spaces/quotes so "fls l wuff twdt z uey" works in .env */
function normalizeSmtpPass(raw) {
  return String(raw || '')
    .replace(/['"]/g, '')
    .replace(/\s+/g, '')
    .trim();
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  /** Bind semua interface agar IPv4/IPv6 & port-forward Cloud bisa menjangkau API */
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: (process.env.CORS_ORIGINS
    || 'http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  studentDefaultPassword: process.env.STUDENT_DEFAULT_PASSWORD || 'siswa123',

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '5', 10),
  },

  backupDir: process.env.BACKUP_DIR || 'backups',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },

  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    serviceAccountBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '',
  },

  reminder: {
    cron: process.env.REMINDER_CRON || '0 8 * * *',
    enabled: bool(process.env.REMINDER_ENABLED, true),
    daysBefore: parseInt(process.env.REMINDER_DAYS_BEFORE || '3', 10),
  },

  registrationAlwaysOpen: bool(process.env.REGISTRATION_ALWAYS_OPEN, false),

  school: {
    name: process.env.SCHOOL_NAME || 'SMP Pusponegoro Brebes',
    emailDomain: process.env.SCHOOL_EMAIL_DOMAIN || 'smppusponegoro.sch.id',
    gmailAddress: (process.env.SCHOOL_GMAIL_ADDRESS || 'smppusponegorobrebess@gmail.com').toLowerCase(),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: bool(process.env.SMTP_SECURE, false),
    user: (process.env.SMTP_USER || process.env.SCHOOL_GMAIL_ADDRESS || 'smppusponegorobrebess@gmail.com')
      .toLowerCase()
      .trim(),
    pass: normalizeSmtpPass(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD),
    authType: (process.env.SMTP_AUTH_TYPE || 'app_password').toLowerCase(),
    oauth: {
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    },
  },

  frontend: {
    bendaharaUrl: process.env.FRONTEND_BENDAHARA_URL || 'http://127.0.0.1:5173',
    siswaUrl: process.env.FRONTEND_SISWA_URL || 'http://127.0.0.1:5174',
  },

  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    merchantId: process.env.MIDTRANS_MERCHANT_ID || '',
    isProduction: bool(process.env.MIDTRANS_IS_PRODUCTION, false),
    callbackUrl: process.env.MIDTRANS_CALLBACK_URL || '',
    sandboxFallback: bool(process.env.MIDTRANS_SANDBOX_FALLBACK, true),
    /** Opsional: jika Production tanpa kanal QRIS, charge ulang pakai Sandbox */
    sandboxServerKey: process.env.MIDTRANS_SANDBOX_SERVER_KEY || '',
    sandboxClientKey: process.env.MIDTRANS_SANDBOX_CLIENT_KEY || '',
    /** true = utamakan Sandbox keys bila tersedia (default true) */
    preferSandbox: bool(process.env.MIDTRANS_PREFER_SANDBOX, true),
  },
};

module.exports = { env, normalizeSmtpPass };
