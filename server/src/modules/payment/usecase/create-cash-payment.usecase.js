const paymentService = require('../payment.service');

module.exports = {
  execute: (input, actor, req) => paymentService.createCashPayment(input, actor, req),
};
