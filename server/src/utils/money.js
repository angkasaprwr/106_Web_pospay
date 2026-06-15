const { Prisma } = require('@prisma/client');

/** Convert a Prisma.Decimal | string | number to a JS number safely. */
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value);
}

/** Format an amount as Indonesian Rupiah. */
function formatIDR(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(toNumber(value));
}

module.exports = { toNumber, formatIDR };
