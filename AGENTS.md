# AGENTS.md

## Cursor Cloud specific instructions

POSPAY is an npm-workspaces monorepo (school finance app). Setup/run commands live in the root `README.md` and `package.json`; this section only captures non-obvious cloud caveats.

### Services
- Backend API (`server`) — Express + Prisma, port `4000`. Start: `npm run dev:server`. The node-cron reminder scheduler and FCM are embedded in this process (FCM/Gemini degrade gracefully when unset).
- Bendahara (treasurer) frontend — Vite, port `5173`. Start: `npm run dev:bendahara`.
- Siswa (student) frontend — Vite, port `5174`. Start: `npm run dev:siswa`.
- Frontends proxy `/api` → `localhost:4000`, so the backend must be running for them to load data.

### PostgreSQL (required, not handled by the update script)
- PostgreSQL 16 is installed at the system level (persisted in the VM snapshot). The update script does NOT install or start it.
- The service is not auto-started on boot. Start it each session if needed: `sudo pg_ctlcluster 16 main start`.
- First-time-only DB bootstrap (already done once; data persists in the snapshot):
  - `sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"`
  - `sudo -u postgres psql -c "CREATE DATABASE pospay;"`
- `server/.env` is git-ignored. If missing, recreate with `cp .env.example server/.env` (its default `DATABASE_URL` matches the local DB above). Frontend `.env` files are optional.
- Apply schema + seed (idempotent-ish; only needed on a fresh DB):
  - `npm --workspace server run prisma:deploy` (applies committed migrations; use this over `prisma migrate dev` in non-interactive runs)
  - `npm run prisma:seed`

### Seeded login accounts
- Bendahara (treasurer): username `bendahara`, password `bendahara123`.
- Siswa (student): username `2025001`–`2025004`, password `siswa123`.

### Lint / test / build
- No automated test suite exists. The only `lint` script (in `apps/*`) is a placeholder (`echo`).
- `npm run build` builds the two frontends (`apps/*/dist`); it does not require the DB.
- `prisma generate` is NOT run via a postinstall hook, so it is included in the update script; if you change `server/prisma/schema.prisma`, re-run `npm run prisma:generate`.
