const paymentService = require('../payment.service');

module.exports = {
  execute: (paymentId, input, actor, req) => paymentService.rejectPayment(paymentId, input, actor, req),
};
