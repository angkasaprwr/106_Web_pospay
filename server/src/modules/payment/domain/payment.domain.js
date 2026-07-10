/** Domain helpers — payment method classification & constants */

const FCM_SUCCESS_TITLE = 'Pembayaran Berhasil';
const FCM_SUCCESS_BODY = 'Pembayaran tagihan berhasil diterima.';

function isMidtransQrisMethod(method) {
  if (!method) return false;
  return method.paymentType === 'QRIS_MIDTRANS' || (method.gateway === 'midtrans' && method.channel === 'QRIS');
}

function isMidtransTransferMethod(method) {
  if (!method) return false;
  return method.paymentType === 'TRANSFER_MIDTRANS' || (method.gateway === 'midtrans' && method.channel === 'TRANSFER');
}

function isCashPaymentMethod(method) {
  if (!method) return false;
  return method.paymentType === 'CASH' || method.channel === 'CASH';
}

module.exports = {
  FCM_SUCCESS_TITLE,
  FCM_SUCCESS_BODY,
  isMidtransQrisMethod,
  isMidtransTransferMethod,
  isCashPaymentMethod,
};
