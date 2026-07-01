const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
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
    pass: normalizeSmtpPass(process.env.SMTP_PASS),
    authType: (process.env.SMTP_AUTH_TYPE || 'app_password').toLowerCase(),
    oauth: {
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    },
  },

  frontend: {
    bendaharaUrl: process.env.FRONTEND_BENDAHARA_URL || 'http://127.0.0.1:5173',
  },
};

module.exports = { env };
