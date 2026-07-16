const QRCode = require('qrcode');
const { toNumber } = require('../../../utils/money');
const { logger } = require('../../../utils/logger');

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

/** Tolak payload palsu (order_id, SNAP token, demo lokal). */
function isInvalidQrisSource(qrString) {
  const s = String(qrString || '').trim();
  if (!s) return true;
  if (s.startsWith('SNAP:')) return true;
  if (s.startsWith('POSPAY-QRIS-DEMO')) return true;
  if (/^https?:\/\//i.test(s) && s.includes('midtrans.com/snap')) return true;
  return false;
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
  // Render HANYA dari qr_string EMV Midtrans — jangan encode order_id/snap_token
  return QRCode.toDataURL(qrString, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: 'M',
    type: 'image/png',
  });
}

/**
 * Siapkan URL/data-URL QR untuk ditampilkan di browser siswa.
 * Prioritas (sesuai Midtrans):
 * 1) Image URL Midtrans (actions generate-qr-code / qr_url) — tampilkan gambar resmi
 * 2) qr_string EMV Midtrans (000201...) — generate QR dari payload resmi
 * JANGAN generate dari order_id / snap_token / redirect_url / invoice.
 */
async function resolveQrDisplayUrl(qrUrl, qrString, options = {}) {
  const { serverKey } = options;

  if (isInvalidQrisSource(qrString) && !isEmvQrisString(qrString)) {
    logger.error('QRIS Loaded REJECTED: sumber QR bukan Midtrans EMV', {
      prefix: String(qrString || '').slice(0, 24),
    });
    // jangan render payload palsu
  }

  // 1) Image URL resmi Midtrans (prioritas utama)
  if (qrUrl && (qrUrl.startsWith('data:') || qrUrl.startsWith('/'))) {
    logger.info('QRIS Loaded from data/local url');
    return qrUrl;
  }

  if (qrUrl && /^https?:\/\//i.test(qrUrl) && !qrUrl.includes('midtrans.com/snap/v')) {
    try {
      const dataUrl = await fetchMidtransQrImage(qrUrl, serverKey);
      if (dataUrl) {
        logger.info('QRIS Loaded from Midtrans image URL');
        return dataUrl;
      }
      // Tanpa auth berhasil — browser mungkin tetap bisa load jika URL publik
      if (!serverKey) {
        logger.info('QRIS Loaded: passthrough Midtrans qr_url');
        return qrUrl;
      }
    } catch (e) {
      logger.warn('QRIS Loaded: gagal fetch Midtrans qr_url', e.message);
    }
  }

  // 2) Hanya qr_string EMV Midtrans yang valid
  if (isEmvQrisString(qrString)) {
    try {
      const dataUrl = await renderEmvQrisDataUrl(qrString);
      logger.info('QRIS Loaded from Midtrans qr_string EMV', { len: qrString.length });
      return dataUrl;
    } catch (e) {
      logger.error('QRIS Loaded: gagal render EMV', e.message);
      return null;
    }
  }

  logger.error('QRIS Loaded FAILED: tidak ada qr_url/qr_string Midtrans yang valid');
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
  const storedSnapToken = payment.snapToken || null;
  const legacySnapFromQr = String(payment.qrString || '').startsWith('SNAP:')
    ? String(payment.qrString).slice(5)
    : null;
  const snapToken = storedSnapToken || legacySnapFromQr;
  const sandboxLocal = String(payment.transactionId || '').startsWith('sandbox-local-')
    || isInvalidQrisSource(payment.qrString);
  const emv = isEmvQrisString(payment.qrString);

  // Jangan tampilkan Snap sebagai QR scannable — hanya EMV Midtrans
  const qr_url = (emv || (payment.qrUrl && !String(payment.qrUrl).includes('/snap/')))
    ? await resolveQrDisplayUrl(payment.qrUrl, payment.qrString, { serverKey })
    : null;
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

  const expired = payment.expiryTime
    ? new Date(payment.expiryTime).getTime() <= Date.now()
    : false;
  if (expired) {
    logger.info('Payment Expired', { orderId: payment.orderId, expiryTime: payment.expiryTime });
  }

  const scannable = emv && !sandboxLocal && !expired;

  const statusPaid = payment.status === 'VERIFIED' ? 'PAID' : payment.status;
  const midStatus = String(payment.midtransStatus || '').toUpperCase();
  const displayStatus = expired && payment.status === 'PENDING'
    ? 'EXPIRED'
    : (midStatus === 'EXPIRED' || midStatus === 'CANCELLED' ? midStatus : statusPaid);

  if (emv && qr_url) {
    logger.info('QRIS Loaded', { orderId: payment.orderId, scannable, expired });
  }

  return {
    id: payment.id,
    invoice_id: payment.bill.id,
    invoice_no: payment.bill.invoiceNo,
    reference: payment.reference,
    order_id: payment.orderId,
    transaction_id: payment.transactionId,
    status: payment.status,
    payment_status: displayStatus === 'EXPIRED' ? 'EXPIRED' : statusPaid,
    transaction_status: payment.midtransStatus || (payment.status === 'VERIFIED' ? 'settlement' : 'pending'),
    midtrans_status: payment.midtransStatus,
    amount: toNumber(payment.amount),
    gross_amount: toNumber(payment.amount),
    channel: payment.channel,
    payment_type: payment.paymentType || payment.channel,
    payment_method_label: method?.name || payment.channel,
    qr_string: emv ? payment.qrString : null,
    qr_url: qr_url || (emv ? payment.qrUrl : null),
    qrDataUrl: qr_url,
    scannable,
    expired,
    // snap_token disimpan untuk opsional Snap UI — QR tampilan tetap dari EMV/qr_url Midtrans
    snap_token: snapToken,
    token: snapToken,
    snap_redirect_url: payment.redirectUrl || null,
    redirect_url: payment.redirectUrl || null,
    midtrans_client_key: clientKey,
    midtrans_is_production: isProduction,
    enabled_payments: ['qris', 'gopay', 'shopeepay', 'bank_transfer'],
    display_mode: emv ? 'qris_image' : (sandboxLocal ? 'demo' : 'none'),
    midtrans_channel_inactive: channelInactive,
    midtrans_hint: !emv
      ? 'QRIS harus dari Midtrans (qr_string EMV / qr_url). Buat QR ulang.'
      : (expired ? 'QRIS telah kedaluwarsa. Buat QR baru.' : null),
    expiry_time: payment.expiryTime,
    paid_at: payment.verifiedAt || payment.paidAt,
    verifiedAt: payment.verifiedAt,
    createdAt: payment.createdAt,
    created_at: payment.createdAt,
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
    midtrans_simulator_url: !isProduction && emv
      ? 'https://simulator.sandbox.midtrans.com/openapi/qris/index'
      : null,
  };
}

module.exports = {
  sanitizeMethodForPortal,
  isEmvQrisString,
  isInvalidQrisSource,
  resolveQrDisplayUrl,
  formatPaymentStatusResponse,
};
