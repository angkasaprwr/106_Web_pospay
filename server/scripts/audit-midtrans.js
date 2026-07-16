#!/usr/bin/env node
/**
 * Audit integrasi Midtrans Snap (Sandbox preference).
 * npm run audit:midtrans
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const midtransGateway = require('../src/modules/payment/gateway/midtrans.gateway');
const { env } = require('../src/config/env');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const report = {
  databaseConnected: false,
  midtransConnected: false,
  snapTokenSuccess: false,
  paymentChannelsLoaded: false,
  qrisAppears: false,
  crudPaymentSuccess: false,
  isSandbox: false,
  channels: [],
  errors: [],
  filesHint: [],
};

function ok(m) { console.log(`  ✔ ${m}`); }
function bad(m) { console.log(`  ✘ ${m}`); report.errors.push(m); }

async function main() {
  console.log('\n=== AUDIT MIDTRANS SNAP ===\n');

  const sk = String(env.midtrans.serverKey || '').trim();
  const ck = String(env.midtrans.clientKey || '').trim();
  const sbSk = String(env.midtrans.sandboxServerKey || '').trim();
  const sbCk = String(env.midtrans.sandboxClientKey || '').trim();

  console.log('Config:');
  console.log('  MIDTRANS_IS_PRODUCTION =', env.midtrans.isProduction);
  console.log('  MIDTRANS_PREFER_SANDBOX =', env.midtrans.preferSandbox);
  console.log('  MIDTRANS_MERCHANT_ID   =', env.midtrans.merchantId || '(kosong)');
  console.log('  SERVER_KEY prefix      =', sk.slice(0, 16) || '(kosong)', `len=${sk.length}`);
  console.log('  CLIENT_KEY prefix      =', ck.slice(0, 16) || '(kosong)', `len=${ck.length}`);
  console.log('  SANDBOX_SERVER prefix  =', sbSk.slice(0, 16) || '(kosong)', `len=${sbSk.length}`);
  console.log('  DATABASE_URL           =', (env.databaseUrl || '').replace(/:[^:@/]+@/, ':***@'));
  console.log('');

  // DB
  try {
    await prisma.$queryRaw`SELECT 1`;
    report.databaseConnected = true;
    ok('Database Connected (db_sikes)');
  } catch (e) {
    bad(`Database: ${e.message}`);
  }

  const method = {
    midtransServerKey: sk,
    midtransClientKey: ck,
    productionMode: env.midtrans.isProduction,
    accountNo: '6513009817',
    accountName: 'PAPK SMP PUSPONEGORO BREBES',
  };

  const keys = midtransGateway.resolveKeys(method);
  report.isSandbox = !keys.isProduction;
  console.log('  resolveKeys → isProduction =', keys.isProduction, '| keyPrefix =', keys.serverKey.slice(0, 16));

  if (/^Mid-server-/.test(keys.serverKey)) {
    bad('Server Key Production (Mid-server-). Untuk Sandbox ganti ke SB-Mid-server-… dari dashboard.sandbox.midtrans.com');
    report.filesHint.push('server/.env → MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY harus SB-Mid-…');
    report.filesHint.push('atau isi MIDTRANS_SANDBOX_SERVER_KEY + MIDTRANS_SANDBOX_CLIENT_KEY');
  } else if (/^SB-Mid-server-/.test(keys.serverKey)) {
    ok('Menggunakan Server Key Sandbox (SB-Mid-server-)');
  }

  if (!midtransGateway.hasValidMidtransKeys(keys)) {
    bad('Key Midtrans tidak valid');
    await finish();
    return;
  }

  const orderId = `AUDIT-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  const amount = 10000;

  // Snap create
  try {
    const snap = await midtransGateway.createSnapTransaction({
      orderId,
      grossAmount: amount,
      method,
      customerDetails: {
        first_name: 'Audit',
        email: 'audit@smppusponegoro.local',
        phone: '081234567890',
      },
      itemDetails: [{ id: 'AUDIT1', price: amount, quantity: 1, name: 'Audit Snap' }],
      enabledPayments: midtransGateway.DEFAULT_SNAP_ENABLED_PAYMENTS,
    });

    report.midtransConnected = true;
    report.snapTokenSuccess = Boolean(snap.snapToken);
    ok(`Midtrans Connected (${keys.isProduction ? 'Production' : 'Sandbox'})`);
    ok(`Snap Token Success: ${String(snap.snapToken).slice(0, 20)}…`);
    console.log('  redirect_url:', snap.redirectUrl);
    console.log('  transaction_status:', snap.transactionStatus);

    report.channels = snap.enabledPayments || [];
    if (report.channels.length) {
      report.paymentChannelsLoaded = true;
      ok(`Payment Channels Loaded: ${report.channels.join(', ')}`);
      if (report.channels.some((c) => /qris|gopay|shopee/i.test(c))) {
        report.qrisAppears = true;
        ok('QRIS/GoPay/ShopeePay channel tersedia di Snap');
      } else {
        bad('Kanal e-wallet/QRIS tidak ada di enabled_payments');
      }
    } else {
      bad('Payment Channels KOSONG → Snap akan menampilkan "No payment channels available"');
      bad('Perbaikan: aktifkan QRIS/GoPay/ShopeePay/Transfer di MAP, ATAU ganti ke key Sandbox (SB-Mid-)');
      if (snap.probeRaw) {
        console.log('  probe_raw:', JSON.stringify(snap.probeRaw).slice(0, 500));
      }
    }
  } catch (e) {
    bad(`Snap createTransaction gagal: ${e.message}`);
  }

  // Core QRIS
  try {
    const core = await midtransGateway.chargeQris({
      orderId: `${orderId}-CORE`,
      grossAmount: amount,
      method,
      customerDetails: { first_name: 'Audit', email: 'audit@smppusponegoro.local', phone: '081234567890' },
    });
    if (core.scannable || core.qrString) {
      report.qrisAppears = true;
      ok(`Core QRIS EMV OK (qr_string ${String(core.qrString).slice(0, 20)}…)`);
    }
  } catch (e) {
    console.log(`  · Core QRIS: ${e.message?.slice?.(0, 120) || e}`);
  }

  // CRUD payment count (read-only check)
  try {
    const n = await prisma.payment.count();
    report.crudPaymentSuccess = true;
    ok(`CRUD Payment table readable (${n} rows di PostgreSQL)`);
  } catch (e) {
    bad(`Payment table: ${e.message}`);
  }

  await finish();
}

async function finish() {
  console.log('\n=== LAPORAN AKHIR ===\n');
  const lines = [
    ['Database Connected', report.databaseConnected],
    ['Midtrans Connected', report.midtransConnected],
    ['Snap Token Success', report.snapTokenSuccess],
    ['Payment Channels Loaded', report.paymentChannelsLoaded],
    ['QRIS Appears', report.qrisAppears],
    ['CRUD Payment Success', report.crudPaymentSuccess],
    ['Sandbox Mode', report.isSandbox],
  ];
  for (const [l, v] of lines) console.log(`${v ? '✔' : '✘'} ${l}`);

  if (report.filesHint.length) {
    console.log('\nFile yang perlu diubah:');
    report.filesHint.forEach((h) => console.log('  →', h));
  }
  if (report.errors.length) {
    console.log('\nError:');
    report.errors.forEach((e) => console.log('  -', e));
  }
  console.log('');
  await prisma.$disconnect().catch(() => {});
  const pass = report.databaseConnected && report.midtransConnected && report.snapTokenSuccess
    && report.paymentChannelsLoaded && report.qrisAppears;
  process.exit(pass ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
