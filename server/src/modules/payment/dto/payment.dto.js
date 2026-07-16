const QRCode = require('qrcode');
const { toNumber } = require('../../../utils/money');

function sanitizeMethodForPortal(method) {
  if (!method) return method;
  const { midtransServerKey, midtransClientKey, ...safe } = method;
  return safe;
}

/** EMV QRIS payload dari Midtrans (bisa di-scan GoPay/Dana/ShopeePay/BRImo/Livin/dll). */
function isEmvQrisString(qrString) {
  const s = String(qrString || '').trim();
  return s.startsWith('000201') && s.length >= 40;
}

function midtransAuthHeader(serverKey) {
  if (!serverKey) return {};
  return { Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}` };
}

async function fetchMidtransQrImage(url, serverKey) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      Accept: 'image/*,application/octet-stream,*/*',
      ...midtransAuthHeader(serverKey),
    },
  });
  if (!res.ok) return null;
  const ctype = res.headers.get('content-type') || 'image/png';
  if (!ctype.includes('image') && !ctype.includes('octet-stream')) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${ctype.split(';')[0]};base64,${buf.toString('base64')}`;
}

async function renderEmvQrisDataUrl(qrString) {
  // EMV QRIS panjang — gunakan error correction L agar tetap terbaca scanner bank/e-wallet
  return QRCode.toDataURL(qrString, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: 'L',
    type: 'image/png',
  });
}

/**
 * Siapkan URL/data-URL QR untuk ditampilkan di browser siswa.
 * Prioritas: EMV qr_string → gambar Midtrans (dengan auth) → qr_string lain → qrUrl.
 */
async function resolveQrDisplayUrl(qrUrl, qrString, options = {}) {
  const { serverKey } = options;
  const emv = isEmvQrisString(qrString);

  if (emv) {
    try {
      return await renderEmvQrisDataUrl(qrString);
    } catch {
      /* lanjut ke URL Midtrans */
    }
  }

  if (qrUrl && (qrUrl.startsWith('data:') || qrUrl.startsWith('/'))) return qrUrl;

  if (qrUrl && /^https?:\/\//i.test(qrUrl)) {
    try {
      const dataUrl = await fetchMidtransQrImage(qrUrl, serverKey);
      if (dataUrl) return dataUrl;
    } catch {
      /* lanjut */
    }
    if (!serverKey) return qrUrl;
  }

  if (qrString) {
    try {
      return await QRCode.toDataURL(qrString, { width: 280, margin: 1, errorCorrectionLevel: 'M' });
    } catch {
      return null;
    }
  }

  return null;
}

async function formatPaymentStatusResponse(payment, options = {}) {
  const serverKey = options.serverKey
    || payment.paymentMethod?.midtransServerKey
    || null;
  const clientKey = options.clientKey
    || payment.paymentMethod?.midtransClientKey
    || null;
  const isProduction = options.isProduction;
  const snapToken = String(payment.qrString || '').startsWith('SNAP:')
    ? String(payment.qrString).slice(5)
    : (String(payment.transactionId || '').includes('-') && String(payment.qrUrl || '').includes('midtrans.com/snap')
      ? payment.transactionId
      : null);
  const sandboxLocal = String(payment.transactionId || '').startsWith('sandbox-local-');
  const qr_url = snapToken
    ? null
    : await resolveQrDisplayUrl(payment.qrUrl, payment.qrString, { serverKey });
  const method = sanitizeMethodForPortal(payment.paymentMethod);

  let channelInactive = false;
  if (snapToken && typeof options.probeSnap === 'function') {
    try {
      const probed = await options.probeSnap(snapToken, Boolean(isProduction));
      channelInactive = Array.isArray(probed?.enabledPayments) && probed.enabledPayments.length === 0;
    } catch {
      channelInactive = false;
    }
  }

  const scannable = (!channelInactive && Boolean(snapToken))
    || (isEmvQrisString(payment.qrString) && !sandboxLocal);

  const statusPaid = payment.status === 'VERIFIED' ? 'PAID' : payment.status;

  return {
    id: payment.id,
    invoice_id: payment.bill.id,
    invoice_no: payment.bill.invoiceNo,
    reference: payment.reference,
    order_id: payment.orderId,
    transaction_id: payment.transactionId,
    status: payment.status,
    /** Alias LUNAS untuk frontend polling (VERIFIED → PAID) */
    payment_status: statusPaid,
    transaction_status: payment.midtransStatus || (payment.status === 'VERIFIED' ? 'settlement' : 'pending'),
    midtrans_status: payment.midtransStatus,
    amount: toNumber(payment.amount),
    gross_amount: toNumber(payment.amount),
    channel: payment.channel,
    payment_method_label: method?.name || payment.channel,
    qr_string: payment.qrString,
    qr_url: qr_url || payment.qrUrl,
    qrDataUrl: qr_url,
    scannable,
    snap_token: channelInactive ? null : snapToken,
    token: channelInactive ? null : snapToken,
    snap_redirect_url: snapToken && !channelInactive ? (payment.qrUrl || null) : null,
    redirect_url: snapToken && !channelInactive ? (payment.qrUrl || null) : null,
    midtrans_client_key: clientKey,
    midtrans_is_production: isProduction,
    display_mode: snapToken && !channelInactive ? 'snap_embed' : (sandboxLocal ? 'demo' : 'qris_image'),
    midtrans_channel_inactive: channelInactive,
    midtrans_hint: channelInactive
      ? 'Kanal QRIS/GoPay belum aktif di Midtrans (enabled_payments kosong). Isi key Sandbox SB-Mid-… atau aktifkan QRIS di MAP.'
      : null,
    expiry_time: payment.expiryTime,
    paid_at: payment.verifiedAt || payment.paidAt,
    verifiedAt: payment.verifiedAt,
    createdAt: payment.createdAt,
    settlement_time: payment.settlementTime,
    fraud_status: payment.fraudStatus,
    bill: {
      id: payment.bill.id,
      invoiceNo: payment.bill.invoiceNo,
      status: payment.bill.status,
      feeType: payment.bill.feeType ? { name: payment.bill.feeType.name } : null,
    },
    paymentMethod: method,
    payment_method: method,
    school_account: method
      ? {
          bank: 'BNI',
          accountNo: method.accountNo || '6513009817',
          accountName: method.accountName || 'PAPK SMP PUSPONEGORO BREBES',
        }
      : {
          bank: 'BNI',
          accountNo: '6513009817',
          accountName: 'PAPK SMP PUSPONEGORO BREBES',
        },
    sandbox_local: sandboxLocal,
  };
}

module.exports = {
  sanitizeMethodForPortal,
  isEmvQrisString,
  resolveQrDisplayUrl,
  formatPaymentStatusResponse,
};
