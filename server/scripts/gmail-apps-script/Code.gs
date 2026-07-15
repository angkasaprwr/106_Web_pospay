/**
 * POSPAY — Relay email Gmail sekolah (smppusponegorobrebess@gmail.com)
 *
 * Cara pasang (sekali saja, login sebagai Gmail sekolah):
 * 1. Buka https://script.google.com → New project
 * 2. Tempel seluruh isi file ini ke editor
 * 3. Project Settings → Script properties → tambah:
 *      POSPAY_TOKEN = (string rahasia, sama dengan GMAIL_WEBHOOK_TOKEN di server/.env)
 * 4. Deploy → New deployment → Type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Salin Web app URL ke server/.env:
 *      GMAIL_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
 *      GMAIL_WEBHOOK_TOKEN=<sama dengan POSPAY_TOKEN>
 * 6. Restart backend POSPAY
 *
 * Backend akan memakai relay ini otomatis bila SMTP App Password gagal (535).
 */

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const expected = PropertiesService.getScriptProperties().getProperty('POSPAY_TOKEN') || '';
    if (expected && data.token !== expected) {
      return json_({ ok: false, sent: false, error: 'token_invalid' });
    }

    const to = String(data.to || '').trim().toLowerCase();
    if (!to) return json_({ ok: false, sent: false, error: 'to_required' });

    MailApp.sendEmail({
      to: to,
      subject: String(data.subject || 'POSPAY'),
      body: String(data.text || ''),
      htmlBody: String(data.html || data.text || ''),
      name: String(data.fromName || 'POSPAY SMP Pusponegoro Brebes'),
    });

    return json_({ ok: true, sent: true });
  } catch (err) {
    return json_({ ok: false, sent: false, error: String(err && err.message || err) });
  }
}

function doGet() {
  return json_({ ok: true, service: 'pospay-gmail-relay' });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
