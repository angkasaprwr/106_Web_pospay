/* Minimal structured logger (no external dependency). */
const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const current = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

function log(level, message, meta) {
  if (levels[level] > levels[current]) return;
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](base, meta);
  } else {
    // eslint-disable-next-line no-console
    console[level === 'debug' ? 'log' : level](base);
  }
}

const logger = {
  error: (m, meta) => log('error', m, meta),
  warn: (m, meta) => log('warn', m, meta),
  info: (m, meta) => log('info', m, meta),
  debug: (m, meta) => log('debug', m, meta),
};

module.exports = { logger };
