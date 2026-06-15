# POSPAY — Sistem Informasi Keuangan Sekolah

Aplikasi **fullstack** untuk pengelolaan keuangan sekolah berbasis website.
Studi kasus: **SMP Pusponegoro Brebes**.

Mencakup pengelolaan data siswa, tagihan, pembayaran (dengan verifikasi bukti),
dispensasi, laporan (PDF/Excel), chatbot AI (Gemini 2.5 Flash dengan Function
Calling + RAG), notifikasi push (Firebase Cloud Messaging), dan pengingat tagihan
otomatis (node-cron).

---

## Arsitektur & Tech Stack

| Lapisan       | Teknologi                                                            |
| ------------- | -------------------------------------------------------------------- |
| Frontend      | React.js + Vite + Tailwind CSS + React Router + Axios                |
| Backend       | Node.js + Express.js (Clean Architecture + Repository Pattern)       |
| ORM / DB      | Prisma + PostgreSQL                                                   |
| AI Chatbot    | Google Gemini 2.5 Flash (Function Calling + RAG)                     |
| Notifikasi    | Firebase Cloud Messaging (FCM)                                        |
| Scheduler     | node-cron                                                            |
| Auth          | JWT (access + refresh) + bcrypt + RBAC                               |
| Export        | PDFKit (PDF) + ExcelJS (Excel)                                       |

### Struktur Repository (monorepo / npm workspaces)

```
.
├── apps/
│   ├── bendahara/     # Frontend bendahara (port 5173)
│   └── siswa/         # Frontend siswa (port 5174)
├── server/            # Backend API (port 4000)
│   ├── prisma/        # schema.prisma, migrations, seed
│   └── src/
│       ├── config/    # env, prisma client
│       ├── core/      # ApiError, ApiResponse, BaseRepository, asyncHandler
│       ├── middlewares/
│       ├── modules/   # fitur (auth, students, bills, payments, ...)
│       ├── services/  # gemini, fcm, export
│       ├── jobs/      # node-cron reminder
│       └── routes/
├── .env.example
└── package.json       # workspaces
```

Setiap modul backend mengikuti pola **controller → service → repository → Prisma**.

---

## Fitur

### Role Bendahara
Beranda (dashboard statistik), Data Siswa, Tagihan (daftar, satuan & massal,
status, tunggakan), Pembayaran (verifikasi/tolak bukti), Dispensasi (review),
Laporan (pembayaran/tunggakan/dispensasi + ekspor PDF/Excel), Chatbot (uji chat,
sesi live/human handover, kelola Q&A, dokumen RAG, jam kerja), Pengaturan (profil
sekolah, pengguna & akun, metode pembayaran, data master, backup & restore,
keamanan, tentang), Profil Saya.

Registrasi bendahara **hanya dapat dilakukan sekali saat instalasi**, setelah itu
otomatis nonaktif.

### Role Siswa
Login dengan **NIS** (password default dibuat bendahara), Beranda, Tagihan
(daftar, detail, konfirmasi pembayaran + upload bukti, halaman berhasil), Tombol
Pengajuan Dispensasi, Riwayat (pembayaran & dispensasi), Bantuan (chatbot),
Profil, Pengaturan (keamanan akun, tampilan, bantuan, tentang).

### Lintas fitur
RBAC, JWT Auth, hash password, upload bukti pembayaran, verifikasi pembayaran,
dispensasi, dashboard statistik, ekspor PDF/Excel, audit log, backup database,
push notification FCM, reminder tagihan otomatis (node-cron), chatbot FAQ + RAG
dokumen sekolah + human handover saat jam kerja, dark mode, responsive UI, toast,
loading state, validasi form (zod), error handling terpusat.

---

## Menjalankan Secara Lokal

### Prasyarat
- Node.js >= 18
- PostgreSQL >= 13

### 1. Instalasi dependensi
```bash
npm install
```

### 2. Konfigurasi environment
```bash
cp .env.example server/.env
# Edit server/.env -> isi DATABASE_URL, JWT secrets, (opsional) GEMINI_API_KEY & Firebase
```

Untuk frontend (opsional, default sudah memakai proxy `/api`):
```bash
cp apps/bendahara/.env.example apps/bendahara/.env
cp apps/siswa/.env.example apps/siswa/.env
```

### 3. Migrasi & seed database
```bash
npm run prisma:migrate     # buat tabel
npm run prisma:seed        # data contoh + akun default
```

Akun default hasil seed:
- **Bendahara** → username `bendahara`, password `bendahara123`
- **Siswa** → username `2025001`–`2025004`, password `siswa123`

> Untuk menguji alur registrasi instalasi, jalankan seed dengan
> `SEED_DEFAULT_BENDAHARA=false npm run prisma:seed` (atau reset DB) agar belum ada
> akun bendahara, lalu daftar via halaman `/register` aplikasi bendahara.

### 4. Menjalankan
Tiga terminal terpisah:
```bash
npm run dev:server      # http://localhost:4000
npm run dev:bendahara   # http://localhost:5173
npm run dev:siswa       # http://localhost:5174
```

---

## Konfigurasi Integrasi

### Gemini (Chatbot AI)
Isi `GEMINI_API_KEY` di `server/.env`. Jika kosong, chatbot otomatis memakai mode
**fallback FAQ** (pencocokan kata kunci ke Q&A). Saat API key tersedia, chatbot
memakai Gemini 2.5 Flash dengan **function calling** (mengambil data tagihan,
tunggakan, metode pembayaran, info sekolah) dan **RAG** (Q&A + dokumen sekolah).

### Firebase Cloud Messaging (Notifikasi Push)
Sediakan service account melalui `FIREBASE_SERVICE_ACCOUNT_PATH` atau
`FIREBASE_SERVICE_ACCOUNT_BASE64`. Jika tidak dikonfigurasi, notifikasi tetap
tersimpan dan tampil **in-app** (push dinonaktifkan).

### Scheduler Pengingat (node-cron)
Diatur via `REMINDER_CRON` (default `0 8 * * *`), `REMINDER_ENABLED`, dan
`REMINDER_DAYS_BEFORE`. Endpoint manual untuk uji: `POST /api/jobs/run-reminders`.

---

## Ringkasan API

Base URL: `/api`

- `auth` — register (sekali), login, refresh, logout, me, change-password
- `students` — CRUD siswa, reset password, toggle akun
- `bills` — daftar, buat satuan/massal, update, hapus
- `payments` — daftar, catat, verifikasi, tolak
- `dispensations` — daftar, buat, review
- `portal` — endpoint siswa (dashboard, bills, payments, dispensations)
- `reports` — payments / arrears / dispensations (+`/export?format=pdf|excel`)
- `chatbot` — message, sessions, qa, documents, working-hours
- `notifications` — list, read, device-token
- `masterdata` — fee-types, payment-methods, academic-years, classes
- `settings` — school-profile, security, users
- `backups` — buat, unduh, restore, hapus
- `audit-logs`, `dashboard`

---

## Deployment (ringkas)

1. **Database**: sediakan PostgreSQL terkelola, set `DATABASE_URL`.
2. **Backend**: `npm --workspace server run prisma:deploy` lalu `npm run start`
   (port dari `PORT`). Sajikan folder `server/uploads` sebagai statis (sudah
   ditangani Express di `/uploads`).
3. **Frontend**: `npm run build` menghasilkan `apps/*/dist` (static). Deploy ke
   CDN/static host, arahkan `VITE_API_BASE_URL` ke domain backend, dan aktifkan
   SPA fallback (semua route ke `index.html`).
4. Set `CORS_ORIGINS` ke domain frontend produksi.

---

## Catatan Keamanan
- Ganti seluruh secret di `.env` untuk produksi.
- Akun bendahara default hanya untuk pengembangan; hapus/ubah pada produksi.
- Backup berformat JSON logical (portable); untuk skala besar pertimbangkan
  `pg_dump`.

© SMP Pusponegoro Brebes
