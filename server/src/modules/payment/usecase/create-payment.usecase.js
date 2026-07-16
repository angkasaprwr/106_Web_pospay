const paymentService = require('../payment.service');

module.exports = {
  execute: (input, actor, req) => paymentService.createPayment(input, actor, req),
};
