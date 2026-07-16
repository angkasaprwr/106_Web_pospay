-- POSPAY: view baca-saja untuk Query Tool pgAdmin 4 (nama Indonesia)
-- Aman: TIDAK mengubah/menghapus data tabel asli (Bill, Payment, Student, dll.)
-- Jalankan di Query Tool db_sikes, atau: psql ... -f server/scripts/pgadmin-readable-views.sql

CREATE OR REPLACE VIEW tagihan AS
SELECT
  id AS id_tagihan,
  "invoiceNo" AS no_invoice,
  "studentId" AS id_siswa,
  "feeTypeId" AS id_jenis_tagihan,
  "academicYearId" AS id_tahun_ajaran,
  period AS periode,
  description AS keterangan,
  amount AS nominal_tagihan,
  discount AS diskon,
  "paidAmount" AS nominal_dibayar,
  "dueDate" AS tanggal_jatuh_tempo,
  status AS status_tagihan,
  "createdAt" AS dibuat_pada,
  "updatedAt" AS diubah_pada
FROM "Bill";

CREATE OR REPLACE VIEW pembayaran AS
SELECT
  id AS id_pembayaran,
  reference AS referensi,
  "billId" AS id_tagihan,
  "paymentMethodId" AS id_metode,
  amount AS nominal_bayar,
  channel AS metode_pembayaran,
  "proofUrl" AS bukti_pembayaran,
  note AS catatan,
  status AS status_pembayaran,
  "paidAt" AS tanggal_bayar,
  "verifiedById" AS diverifikasi_oleh,
  "verifiedAt" AS tanggal_verifikasi,
  "rejectionReason" AS alasan_penolakan,
  "orderId" AS order_id_midtrans,
  "transactionId" AS transaksi_midtrans,
  "createdAt" AS dibuat_pada,
  "updatedAt" AS diubah_pada
FROM "Payment";

CREATE OR REPLACE VIEW siswa AS
SELECT
  id AS id_siswa,
  nis AS nis_siswa,
  nisn,
  "fullName" AS nama_siswa,
  "parentName" AS nama_orang_tua,
  "parentPhone" AS no_hp_orang_tua,
  address AS alamat,
  status AS status_siswa,
  "userId" AS id_user,
  "classId" AS id_kelas,
  "createdAt" AS dibuat_pada,
  "updatedAt" AS diubah_pada
FROM "Student";

CREATE OR REPLACE VIEW users_akun AS
SELECT
  id AS id_user,
  username,
  role,
  "fullName" AS nama_lengkap,
  email,
  phone,
  "isActive" AS status_aktif,
  "emailVerified" AS email_terverifikasi,
  "lastLogin" AS last_login,
  "createdAt" AS dibuat_pada
FROM "User";

CREATE OR REPLACE VIEW jenis_tagihan AS
SELECT
  id AS id_jenis_tagihan,
  code AS kode,
  name AS nama_tagihan,
  description AS keterangan,
  "defaultAmount" AS nominal_default,
  "isRecurring" AS berulang,
  "isActive" AS status_aktif,
  "createdAt" AS dibuat_pada
FROM "FeeType";

CREATE OR REPLACE VIEW kelas AS
SELECT
  id AS id_kelas,
  name AS nama_kelas,
  grade AS tingkat,
  homeroom AS wali_kelas,
  "academicYearId" AS id_tahun_ajaran,
  "createdAt" AS dibuat_pada
FROM "SchoolClass";

CREATE OR REPLACE VIEW dispensasi AS
SELECT
  id AS id_dispensasi,
  "studentId" AS id_siswa,
  "billId" AS id_tagihan,
  type AS tipe,
  reason AS alasan,
  amount AS nominal,
  "newDueDate" AS rencana_tanggal_bayar,
  status AS status_dispensasi,
  "reviewedById" AS diproses_oleh,
  "reviewedAt" AS tanggal_diproses,
  "reviewNote" AS catatan_bendahara,
  "createdAt" AS tanggal_pengajuan
FROM "Dispensation";

CREATE OR REPLACE VIEW metode_pembayaran AS
SELECT
  id AS id_metode,
  name AS nama_metode,
  channel AS kanal,
  "accountName" AS nama_rekening,
  "accountNo" AS no_rekening,
  instruction AS instruksi,
  "isActive" AS status_aktif,
  "paymentType" AS tipe_pembayaran,
  gateway,
  "createdAt" AS dibuat_pada
FROM "PaymentMethod";
