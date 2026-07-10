const paymentService = require('../payment.service');

module.exports = {
  execute: (paymentId, input, actor, req) => paymentService.approvePayment(paymentId, input, actor, req),
};
