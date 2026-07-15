const QRCode = require('qrcode');
const { toNumber } = require('../../../utils/money');

function sanitizeMethodForPortal(method) {
  if (!method) return method;
  const { midtransServerKey, midtransClientKey, ...safe } = method;
  return safe;
}

async function resolveQrDisplayUrl(qrUrl, qrString) {
  // Data URL / relative sudah siap ditampilkan
  if (qrUrl && (qrUrl.startsWith('data:') || qrUrl.startsWith('/'))) return qrUrl;

  // URL gambar Midtrans (actions.generate-qr-code) — fetch lalu bungkus data URL agar tidak CORS di browser
  if (qrUrl && /^https?:\/\//i.test(qrUrl)) {
    try {
      const res = await fetch(qrUrl, { redirect: 'follow' });
      if (res.ok) {
        const ctype = res.headers.get('content-type') || 'image/png';
        if (ctype.includes('image') || ctype.includes('octet-stream')) {
          const buf = Buffer.from(await res.arrayBuffer());
          return `data:${ctype.split(';')[0]};base64,${buf.toString('base64')}`;
        }
      }
    } catch {
      // lanjut ke qrString
    }
    // Fallback: pakai URL langsung (kadang Midtrans image bisa di-embed)
    return qrUrl;
  }

  if (!qrString) return null;
  try {
    return await QRCode.toDataURL(qrString, { width: 280, margin: 1, errorCorrectionLevel: 'M' });
  } catch {
    return null;
  }
}

async function formatPaymentStatusResponse(payment) {
  const qr_url = await resolveQrDisplayUrl(payment.qrUrl, payment.qrString);
  const method = sanitizeMethodForPortal(payment.paymentMethod);
  return {
    id: payment.id,
    invoice_id: payment.bill.id,
    invoice_no: payment.bill.invoiceNo,
    reference: payment.reference,
    order_id: payment.orderId,
    transaction_id: payment.transactionId,
    status: payment.status,
    midtrans_status: payment.midtransStatus,
    amount: toNumber(payment.amount),
    channel: payment.channel,
    qr_string: payment.qrString,
    qr_url,
    qrDataUrl: qr_url,
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
  };
}

module.exports = {
  sanitizeMethodForPortal,
  resolveQrDisplayUrl,
  formatPaymentStatusResponse,
};
