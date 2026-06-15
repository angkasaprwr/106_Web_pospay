const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/**
 * Stream a simple tabular PDF report to the HTTP response.
 * @param {import('express').Response} res
 * @param {{ title:string, subtitle?:string, columns:{header:string,key:string,width?:number,align?:string}[], rows:object[], summary?:{label:string,value:string}[] }} opts
 */
function streamPdf(res, { title, subtitle, columns, rows, summary = [] }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(16).text(title, { align: 'center' });
  if (subtitle) doc.moveDown(0.2).fontSize(10).fillColor('#555').text(subtitle, { align: 'center' });
  doc.fillColor('#000').moveDown(1);

  const startX = doc.x;
  let y = doc.y;
  const totalWidth = columns.reduce((s, c) => s + (c.width || 100), 0);

  // Header row
  doc.fontSize(9).font('Helvetica-Bold');
  let x = startX;
  columns.forEach((col) => {
    doc.text(col.header, x + 2, y + 4, { width: (col.width || 100) - 4, align: col.align || 'left' });
    x += col.width || 100;
  });
  y += 20;
  doc.moveTo(startX, y).lineTo(startX + totalWidth, y).stroke();

  // Body rows
  doc.font('Helvetica').fontSize(8);
  rows.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.y;
    }
    x = startX;
    columns.forEach((col) => {
      const value = row[col.key] === undefined || row[col.key] === null ? '' : String(row[col.key]);
      doc.text(value, x + 2, y + 3, { width: (col.width || 100) - 4, align: col.align || 'left' });
      x += col.width || 100;
    });
    y += 18;
    doc.moveTo(startX, y).lineTo(startX + totalWidth, y).strokeColor('#eeeeee').stroke().strokeColor('#000');
  });

  if (summary.length) {
    doc.moveDown(1).font('Helvetica-Bold').fontSize(10);
    summary.forEach((s) => doc.text(`${s.label}: ${s.value}`));
  }

  doc.moveDown(2).font('Helvetica').fontSize(8).fillColor('#888')
    .text(`Dicetak pada ${new Date().toLocaleString('id-ID')}`, { align: 'right' });

  doc.end();
}

/**
 * Stream an XLSX workbook to the HTTP response.
 */
async function streamExcel(res, { title, sheetName = 'Laporan', columns, rows }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'POSPAY';
  const sheet = workbook.addWorksheet(sheetName);

  sheet.mergeCells(1, 1, 1, columns.length);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { size: 14, bold: true };
  sheet.getCell(1, 1).alignment = { horizontal: 'center' };

  const headerRow = sheet.addRow(columns.map((c) => c.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center' };
  });

  columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width || 20;
  });

  rows.forEach((row) => {
    sheet.addRow(columns.map((c) => row[c.key] ?? ''));
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { streamPdf, streamExcel };
