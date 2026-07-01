#!/usr/bin/env node
/**
 * Generate Gmail OAuth2 refresh token untuk pengiriman email via Gmail API.
 * Prasyarat: GMAIL_CLIENT_ID & GMAIL_CLIENT_SECRET di server/.env
 * Jalankan: npm run gmail:oauth
 */
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GMAIL_CLIENT_ID dan GMAIL_CLIENT_SECRET di server/.env terlebih dahulu.');
  console.error('Buat di: https://console.cloud.google.com/apis/credentials');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
});

console.log('\n1. Buka URL ini di browser (login sebagai smppusponegorobrebess@gmail.com):\n');
console.log(authUrl);
console.log('\n2. Salin kode otorisasi, lalu tempel di bawah.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Kode otorisasi: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log('\nTambahkan ke server/.env:\n');
    console.log(`SMTP_AUTH_TYPE=oauth2`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\nLalu restart backend dan jalankan: npm run test:smtp');
  } catch (err) {
    console.error('Gagal:', err.message);
    process.exit(1);
  }
});
