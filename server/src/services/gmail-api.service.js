const { google } = require('googleapis');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

function isConfigured() {
  return Boolean(
    env.smtp.oauth.clientId
    && env.smtp.oauth.clientSecret
    && env.smtp.oauth.refreshToken
    && env.smtp.user,
  );
}

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    env.smtp.oauth.clientId,
    env.smtp.oauth.clientSecret,
    'https://developers.google.com/oauthplayground',
  );
  client.setCredentials({ refresh_token: env.smtp.oauth.refreshToken });
  return client;
}

function buildRawMessage({ from, to, subject, text, html }) {
  const boundary = `pospay_${Date.now()}`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    html,
    `--${boundary}--`,
  ];
  return Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendMail({ to, subject, text, html }) {
  if (!isConfigured()) {
    return { sent: false, reason: 'oauth_not_configured' };
  }

  const from = `"POSPAY ${env.school.name}" <${env.smtp.user}>`;
  const gmail = google.gmail({ version: 'v1', auth: getOAuthClient() });

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: buildRawMessage({ from, to, subject, text, html }),
      },
    });
    logger.info(`Gmail API: email terkirim ke ${to}`);
    return { sent: true, via: 'gmail_api' };
  } catch (err) {
    logger.error(`Gmail API gagal ke ${to}: ${err.message}`);
    return { sent: false, error: err };
  }
}

async function verifyConnection() {
  if (!isConfigured()) return { ok: false, reason: 'oauth_not_configured' };
  try {
    const gmail = google.gmail({ version: 'v1', auth: getOAuthClient() });
    await gmail.users.getProfile({ userId: 'me' });
    logger.info(`Gmail API terhubung (${env.smtp.user})`);
    return { ok: true, via: 'gmail_api' };
  } catch (err) {
    logger.error(`Gmail API gagal: ${err.message}`);
    return { ok: false, reason: err.message };
  }
}

module.exports = { isConfigured, sendMail, verifyConnection };
