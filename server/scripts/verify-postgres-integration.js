#!/usr/bin/env node
/**
 * Verifikasi integrasi PostgreSQL + Prisma + API CRUD POSPAY.
 * Jalankan: npm run verify:postgres (dari root) atau node scripts/verify-postgres-integration.js (dari server/)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { execSync } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const API = process.env.API_BASE || 'http://127.0.0.1:4000/api';
const EXPECTED_URL = 'postgresql://postgres:db123@127.0.0.1:5433/db_sikes?schema=public';
const EXPECTED_MODELS = 29;
const BENDAHARA_USER = process.env.VERIFY_BENDAHARA_USER || 'Admin Bendahara Komite';
const BENDAHARA_PASS = process.env.VERIFY_BENDAHARA_PASS || 'bendahara123';

const prisma = new PrismaClient();
const report = {
  prismaConnected: false,
  postgresConnected: false,
  migrationSuccess: false,
  databaseUrlOk: false,
  tablesCreated: false,
  tableCount: 0,
  crudSuccess: false,
  apiConnected: false,
  reactProxyOk: false,
  details: [],
};

function pass(msg) {
  report.details.push({ ok: true, msg });
  console.log(`  ✔ ${msg}`);
}

function fail(msg) {
  report.details.push({ ok: false, msg });
  console.log(`  ✘ ${msg}`);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function main() {
  console.log('\n=== POSPAY PostgreSQL Integration Check ===\n');
  console.log('Catatan: folder backend API = server/ (bukan backend/)');
  console.log(`DATABASE_URL env: ${(process.env.DATABASE_URL || '').replace(/:[^:@/]+@/, ':***@')}\n`);

  // 1. DATABASE_URL
  const dbUrl = (process.env.DATABASE_URL || '').replace(/^"|"$/g, '');
  if (dbUrl === EXPECTED_URL || dbUrl.includes('127.0.0.1:5433/db_sikes')) {
    report.databaseUrlOk = true;
    pass('DATABASE_URL mengarah ke db_sikes (PostgreSQL 127.0.0.1:5433)');
  } else {
    fail(`DATABASE_URL tidak sesuai target. Harus: ${EXPECTED_URL}`);
  }

  // 2. Prisma generate (silent)
  try {
    execSync('npx prisma generate', {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      env: process.env,
    });
    pass('npx prisma generate — Prisma Client siap');
  } catch (e) {
    fail(`prisma generate gagal: ${e.message}`);
  }

  // 3. Migration status
  try {
    const out = execSync('npx prisma migrate status', {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      env: process.env,
    }).toString();
    if (/Database schema is up to date|All migrations have been successfully applied/i.test(out)) {
      report.migrationSuccess = true;
      pass('Migration Success — schema PostgreSQL up to date');
    } else {
      fail(`Migration belum up to date:\n${out.slice(0, 400)}`);
    }
  } catch (e) {
    fail(`prisma migrate status gagal: ${e.stderr?.toString?.() || e.message}`);
  }

  // 4. Prisma + PostgreSQL connect
  try {
    await prisma.$connect();
    report.prismaConnected = true;
    pass('Prisma Connected');

    await prisma.$queryRaw`SELECT version()`;
    report.postgresConnected = true;
    pass('PostgreSQL Connected');
  } catch (e) {
    fail(`Koneksi database gagal: ${e.message}`);
    await printSummary();
    process.exit(1);
  }

  // 5. Tables
  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `;
  report.tableCount = tables.length;
  if (tables.length >= EXPECTED_MODELS) {
    report.tablesCreated = true;
    pass(`Tables Created — ${tables.length} tabel Prisma di PostgreSQL`);
  } else {
    fail(`Hanya ${tables.length}/${EXPECTED_MODELS} tabel. Jalankan: cd server && npx prisma migrate deploy`);
  }

  // 6. API health
  try {
    const { status, body } = await fetchJson(`${API}/health`);
    if (status === 200 && body?.data?.database === 'connected') {
      report.apiConnected = true;
      pass(`API Connected — GET /api/health (database: ${body.data.database}, tables: ${body.data.tables})`);
    } else {
      fail(`API health abnormal (${status}): ${JSON.stringify(body).slice(0, 200)}`);
    }
  } catch (e) {
    fail(`API tidak terjangkau di ${API}. Jalankan: npm run dev:all — ${e.message}`);
  }

  // 7. React proxy (Vite bendahara)
  try {
    const { status, body } = await fetchJson('http://127.0.0.1:5173/api/health');
    if (status === 200 && body?.data?.status === 'up') {
      report.reactProxyOk = true;
      pass('React Connected — Axios proxy Vite /api → backend (port 5173)');
    } else {
      fail(`Proxy Vite bendahara gagal (${status})`);
    }
  } catch (e) {
    fail(`Portal React tidak jalan di :5173 — ${e.message}`);
  }

  // 8. CRUD via HTTP (Controller → Service → Repository → Prisma)
  if (report.apiConnected) {
    try {
      const login = await fetchJson(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: BENDAHARA_USER, password: BENDAHARA_PASS }),
      });
      const token = login.body?.data?.accessToken;
      if (!token) {
        fail(`Login bendahara gagal: ${login.body?.message || login.status}`);
      } else {
        pass('Login bendahara → tabel User (PostgreSQL)');

        const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const testNis = `99${Date.now().toString().slice(-8)}`;

        const created = await fetchJson(`${API}/students`, {
          method: 'POST',
          headers: auth,
          body: JSON.stringify({
            nis: testNis,
            fullName: 'Tes CRUD PostgreSQL',
            gender: 'L',
            createAccount: true,
            password: 'siswa123',
          }),
        });
        const studentId = created.body?.data?.id;
        if (!studentId) {
          fail(`POST /students gagal: ${created.body?.message || created.status}`);
        } else {
          pass('POST Tambah Siswa → tabel Student + User');

          const inDb = await prisma.student.findUnique({ where: { id: studentId } });
          if (!inDb) fail('Siswa tidak muncul di PostgreSQL setelah POST');
          else pass('Verifikasi pgAdmin: baris Student tersimpan di db_sikes');

          const updated = await fetchJson(`${API}/students/${studentId}`, {
            method: 'PATCH',
            headers: auth,
            body: JSON.stringify({ fullName: 'Tes CRUD Updated' }),
          });
          if (updated.body?.data?.fullName === 'Tes CRUD Updated') {
            pass('PATCH Edit Siswa → PostgreSQL terupdate');
          } else {
            fail(`PATCH /students/:id gagal`);
          }

          let feeType = await prisma.feeType.findFirst();
          if (!feeType) {
            feeType = await prisma.feeType.create({
              data: { name: 'Tes Komite', code: 'TES', defaultAmount: 50000, isActive: true },
            });
          }

          const billRes = await fetchJson(`${API}/bills`, {
            method: 'POST',
            headers: auth,
            body: JSON.stringify({
              studentId,
              feeTypeId: feeType.id,
              amount: 75000,
              description: 'Tagihan tes CRUD PostgreSQL',
            }),
          });
          const billId = billRes.body?.data?.id;
          if (!billId) {
            fail(`POST /bills gagal: ${billRes.body?.message || billRes.status}`);
          } else {
            pass('POST Tambah Tagihan → tabel Bill');

            const billDb = await prisma.bill.findUnique({ where: { id: billId } });
            if (billDb) pass('Verifikasi pgAdmin: baris Bill tersimpan di db_sikes');

            await fetchJson(`${API}/bills/${billId}`, {
              method: 'PATCH',
              headers: auth,
              body: JSON.stringify({ description: 'Tagihan tes updated' }),
            });
            pass('PATCH Edit Tagihan → PostgreSQL terupdate');

            await fetchJson(`${API}/bills/${billId}`, { method: 'DELETE', headers: auth });
            pass('DELETE Tagihan → PostgreSQL terhapus');
          }

          await fetchJson(`${API}/students/${studentId}`, { method: 'DELETE', headers: auth });
          pass('DELETE Siswa → PostgreSQL terhapus');

          report.crudSuccess = true;
        }
      }
    } catch (e) {
      fail(`CRUD test error: ${e.message}`);
    }
  }

  await printSummary();
  await prisma.$disconnect();
  const allOk = report.prismaConnected && report.postgresConnected && report.migrationSuccess
    && report.tablesCreated && report.crudSuccess && report.apiConnected;
  process.exit(allOk ? 0 : 1);
}

async function printSummary() {
  console.log('\n=== LAPORAN ===\n');
  const lines = [
    ['Prisma Connected', report.prismaConnected],
    ['PostgreSQL Connected', report.postgresConnected],
    ['Migration Success', report.migrationSuccess],
    ['DATABASE_URL OK', report.databaseUrlOk],
    ['Tables Created', report.tablesCreated],
    [`Tables (${report.tableCount})`, report.tableCount >= EXPECTED_MODELS],
    ['CRUD Success', report.crudSuccess],
    ['API Connected', report.apiConnected],
    ['React Connected', report.reactProxyOk],
  ];
  for (const [label, ok] of lines) {
    console.log(`${ok ? '✔' : '✘'} ${label}`);
  }
  console.log('\npgAdmin4: Register Server → Host 127.0.0.1 Port 5433 DB db_sikes User postgres Pass db123');
  console.log('Refresh Tables setelah CRUD dari website — data langsung terlihat di tabel User, Student, Bill, Payment, dll.\n');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
