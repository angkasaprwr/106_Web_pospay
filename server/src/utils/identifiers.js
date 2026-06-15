const crypto = require('crypto');

function pad(num, size) {
  return String(num).padStart(size, '0');
}

/** Generate an invoice number like INV-20260615-AB12CD */
function generateInvoiceNo() {
  const d = new Date();
  const datePart = `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${datePart}-${rand}`;
}

/** Generate a payment reference like PAY-20260615-AB12CD */
function generatePaymentRef() {
  const d = new Date();
  const datePart = `${d.getFullYear()}${pad(d.getMonth() + 1, 2)}${pad(d.getDate(), 2)}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PAY-${datePart}-${rand}`;
}

module.exports = { generateInvoiceNo, generatePaymentRef };
