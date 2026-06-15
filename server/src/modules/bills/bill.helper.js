const { toNumber } = require('../../utils/money');

/**
 * Compute the effective status of a bill from its amounts and due date.
 * @param {{ amount:any, discount:any, paidAmount:any, dueDate?:Date|null, status?:string }} bill
 */
function computeStatus(bill) {
  const amount = toNumber(bill.amount);
  const discount = toNumber(bill.discount);
  const paid = toNumber(bill.paidAmount);
  const payable = Math.max(0, amount - discount);

  if (payable <= 0) return 'WAIVED';
  if (paid >= payable) return 'PAID';

  const overdue = bill.dueDate && new Date(bill.dueDate) < new Date();
  if (paid > 0) return overdue ? 'OVERDUE' : 'PARTIAL';
  return overdue ? 'OVERDUE' : 'UNPAID';
}

function outstanding(bill) {
  const payable = Math.max(0, toNumber(bill.amount) - toNumber(bill.discount));
  return Math.max(0, payable - toNumber(bill.paidAmount));
}

module.exports = { computeStatus, outstanding };
