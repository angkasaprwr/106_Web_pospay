const { Router } = require('express');
const { asyncHandler } = require('../../core/asyncHandler');
const { ok } = require('../../core/ApiResponse');
const { authenticate, authorize } = require('../../middlewares/auth.middleware');
const { formatIDR } = require('../../utils/money');
const { streamPdf, streamExcel } = require('../../services/export.service');
const { recordAudit } = require('../audit/audit.service');
const service = require('./report.service');

const router = Router();
router.use(authenticate, authorize('BENDAHARA'));

function setDownloadName(res, name) {
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
}

// ----- Payment report -----
router.get('/payments', asyncHandler(async (req, res) => {
  const { payments, total } = await service.paymentReport(req.query);
  return ok(res, { rows: service.paymentRows(payments), total, totalFormatted: formatIDR(total) }, 'Laporan pembayaran');
}));

router.get('/payments/export', asyncHandler(async (req, res) => {
  const { payments, total } = await service.paymentReport(req.query);
  const rows = service.paymentRows(payments);
  const format = (req.query.format || 'pdf').toLowerCase();
  await recordAudit({ userId: req.user.id, action: 'EXPORT', entity: 'PaymentReport', metadata: { format }, req });

  if (format === 'excel' || format === 'xlsx') {
    setDownloadName(res, `laporan-pembayaran-${Date.now()}.xlsx`);
    return streamExcel(res, {
      title: 'Laporan Pembayaran',
      columns: [
        { header: 'Referensi', key: 'reference', width: 22 },
        { header: 'Tanggal', key: 'date', width: 14 },
        { header: 'NIS', key: 'nis', width: 14 },
        { header: 'Nama Siswa', key: 'student', width: 28 },
        { header: 'Kelas', key: 'className', width: 10 },
        { header: 'Jenis', key: 'feeType', width: 18 },
        { header: 'Metode', key: 'method', width: 16 },
        { header: 'Nominal', key: 'amountFormatted', width: 18 },
      ],
      rows,
    });
  }
  setDownloadName(res, `laporan-pembayaran-${Date.now()}.pdf`);
  return streamPdf(res, {
    title: 'Laporan Pembayaran',
    subtitle: 'SMP Pusponegoro Brebes',
    columns: [
      { header: 'Tanggal', key: 'date', width: 70 },
      { header: 'NIS', key: 'nis', width: 70 },
      { header: 'Nama Siswa', key: 'student', width: 160 },
      { header: 'Kelas', key: 'className', width: 50 },
      { header: 'Jenis', key: 'feeType', width: 120 },
      { header: 'Metode', key: 'method', width: 100 },
      { header: 'Nominal', key: 'amountFormatted', width: 110, align: 'right' },
    ],
    rows,
    summary: [{ label: 'Total Pembayaran', value: formatIDR(total) }],
  });
}));

// ----- Arrears (tunggakan) report -----
router.get('/arrears', asyncHandler(async (req, res) => {
  const { bills, total } = await service.arrearsReport(req.query);
  return ok(res, { rows: service.arrearsRows(bills), total, totalFormatted: formatIDR(total) }, 'Laporan tunggakan');
}));

router.get('/arrears/export', asyncHandler(async (req, res) => {
  const { bills, total } = await service.arrearsReport(req.query);
  const rows = service.arrearsRows(bills);
  const format = (req.query.format || 'pdf').toLowerCase();
  await recordAudit({ userId: req.user.id, action: 'EXPORT', entity: 'ArrearsReport', metadata: { format }, req });

  if (format === 'excel' || format === 'xlsx') {
    setDownloadName(res, `laporan-tunggakan-${Date.now()}.xlsx`);
    return streamExcel(res, {
      title: 'Laporan Tunggakan',
      columns: [
        { header: 'No. Invoice', key: 'invoiceNo', width: 22 },
        { header: 'NIS', key: 'nis', width: 14 },
        { header: 'Nama Siswa', key: 'student', width: 28 },
        { header: 'Kelas', key: 'className', width: 10 },
        { header: 'Jenis', key: 'feeType', width: 18 },
        { header: 'Jatuh Tempo', key: 'dueDate', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Tunggakan', key: 'outstandingFormatted', width: 18 },
      ],
      rows,
    });
  }
  setDownloadName(res, `laporan-tunggakan-${Date.now()}.pdf`);
  return streamPdf(res, {
    title: 'Laporan Tunggakan & Dispensasi',
    subtitle: 'SMP Pusponegoro Brebes',
    columns: [
      { header: 'NIS', key: 'nis', width: 70 },
      { header: 'Nama Siswa', key: 'student', width: 170 },
      { header: 'Kelas', key: 'className', width: 50 },
      { header: 'Jenis', key: 'feeType', width: 120 },
      { header: 'Jatuh Tempo', key: 'dueDate', width: 90 },
      { header: 'Status', key: 'status', width: 80 },
      { header: 'Tunggakan', key: 'outstandingFormatted', width: 110, align: 'right' },
    ],
    rows,
    summary: [{ label: 'Total Tunggakan', value: formatIDR(total) }],
  });
}));

// ----- Dispensation report -----
router.get('/dispensations', asyncHandler(async (req, res) => {
  const { items, total } = await service.dispensationReport(req.query);
  return ok(res, { rows: service.dispensationRows(items), total, totalFormatted: formatIDR(total) }, 'Laporan dispensasi');
}));

router.get('/dispensations/export', asyncHandler(async (req, res) => {
  const { items, total } = await service.dispensationReport(req.query);
  const rows = service.dispensationRows(items);
  const format = (req.query.format || 'pdf').toLowerCase();
  await recordAudit({ userId: req.user.id, action: 'EXPORT', entity: 'DispensationReport', metadata: { format }, req });

  if (format === 'excel' || format === 'xlsx') {
    setDownloadName(res, `laporan-dispensasi-${Date.now()}.xlsx`);
    return streamExcel(res, {
      title: 'Laporan Dispensasi',
      columns: [
        { header: 'Tanggal', key: 'date', width: 14 },
        { header: 'NIS', key: 'nis', width: 14 },
        { header: 'Nama Siswa', key: 'student', width: 28 },
        { header: 'Kelas', key: 'className', width: 10 },
        { header: 'Tipe', key: 'type', width: 14 },
        { header: 'Alasan', key: 'reason', width: 30 },
        { header: 'Nominal', key: 'amountFormatted', width: 16 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      rows,
    });
  }
  setDownloadName(res, `laporan-dispensasi-${Date.now()}.pdf`);
  return streamPdf(res, {
    title: 'Laporan Dispensasi',
    subtitle: 'SMP Pusponegoro Brebes',
    columns: [
      { header: 'Tanggal', key: 'date', width: 70 },
      { header: 'NIS', key: 'nis', width: 70 },
      { header: 'Nama Siswa', key: 'student', width: 150 },
      { header: 'Kelas', key: 'className', width: 50 },
      { header: 'Tipe', key: 'type', width: 80 },
      { header: 'Status', key: 'status', width: 80 },
      { header: 'Nominal', key: 'amountFormatted', width: 110, align: 'right' },
    ],
    rows,
    summary: [{ label: 'Total Nominal Dispensasi', value: formatIDR(total) }],
  });
}));

module.exports = router;
