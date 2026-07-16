const paymentService = require('../payment.service');

module.exports = {
  execute: (invoiceRef, actor) => paymentService.getStatus(invoiceRef, actor),
};
