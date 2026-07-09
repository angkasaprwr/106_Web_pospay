const midtransClient = require('midtrans-client');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { env } = require('../../config/env');

function resolveKeys(method) {
  return {
    serverKey: method?.midtransServerKey || env.midtrans.serverKey,
    clientKey: method?.midtransClientKey || env.midtrans.clientKey,
    isProduction: method?.productionMode ?? env.midtrans.isProduction,
  };
}

function hasValidMidtransKeys(keys) {
  return Boolean(keys.serverKey && keys.serverKey.length > 8 && !keys.serverKey.includes('your-'));
}

function createCoreApi(method) {
  const keys = resolveKeys(method);
  return new midtransClient.CoreApi({
    isProduction: keys.isProduction,
    serverKey: keys.serverKey,
    clientKey: keys.clientKey,
  });
}

function verifySignature({ order_id: orderId, status_code: statusCode, gross_amount: grossAmount, signature_key: signatureKey }, serverKey) {
  const hash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  return hash === signatureKey;
}

function extractQrisData(chargeResponse) {
  const actions = chargeResponse.actions || [];
  const qrAction = actions.find((a) => /qr/i.test(a.name || '')) || actions[0];
  const qrUrl = qrAction?.url || chargeResponse.qr_url || null;
  const qrString = chargeResponse.qr_string
    || chargeResponse.qrString
    || (qrUrl && !qrUrl.startsWith('data:') ? qrUrl : null);

  return {
    transactionId: chargeResponse.transaction_id || null,
    orderId: chargeResponse.order_id,
    grossAmount: chargeResponse.gross_amount,
    qrString,
    qrUrl,
    expiryTime: chargeResponse.expiry_time ? new Date(chargeResponse.expiry_time) : new Date(Date.now() + 15 * 60 * 1000),
    midtransStatus: chargeResponse.transaction_status || 'pending',
    statusCode: chargeResponse.status_code || '201',
    raw: chargeResponse,
  };
}

async function simulateQrisCharge(orderId, grossAmount, merchantName) {
  const qrString = `00020101021226650016ID.CO.MIDTRANS${orderId.slice(-12)}52045${merchantName || 'SMP Pusponegoro'}5303360540${Math.round(grossAmount)}5802ID6304SIMU`;
  const qrUrl = await QRCode.toDataURL(qrString, { width: 280, margin: 2 });
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
  return {
    transactionId: `SIM-${Date.now()}`,
    orderId,
    grossAmount: String(Math.round(grossAmount)),
    qrString,
    qrUrl,
    expiryTime,
    midtransStatus: 'pending',
    statusCode: '201',
    raw: { simulated: true },
  };
}

async function chargeQris({ orderId, grossAmount, method, customerDetails }) {
  const keys = resolveKeys(method);
  if (!hasValidMidtransKeys(keys)) {
    return simulateQrisCharge(orderId, grossAmount, method?.merchantName || method?.accountName);
  }

  const core = createCoreApi(method);
  const parameter = {
    payment_type: 'qris',
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(grossAmount),
    },
    customer_details: customerDetails,
  };

  const response = await core.charge(parameter);
  return extractQrisData(response);
}

function isSettlementStatus(transactionStatus) {
  return ['settlement', 'capture'].includes(String(transactionStatus || '').toLowerCase());
}

module.exports = {
  chargeQris,
  verifySignature,
  resolveKeys,
  hasValidMidtransKeys,
  isSettlementStatus,
  simulateQrisCharge,
};
