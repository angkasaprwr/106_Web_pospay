const paymentService = require('../payment.service');

module.exports = {
  execute: (payload) => paymentService.handleMidtransWebhook(payload),
};
