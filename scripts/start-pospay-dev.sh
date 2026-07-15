#!/usr/bin/env bash
# Jalankan ulang backend + portal bendahara + portal siswa (development)
# Backend di-bind ke 0.0.0.0 agar menjangkau IPv4, localhost, dan port-forward Cloud.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMUX_BIN="${TMUX_BIN:-tmux}"
TMUX_CONF="${TMUX_CONF:-/exec-daemon/tmux.portal.conf}"
TMUX() { "$TMUX_BIN" -f "$TMUX_CONF" "$@"; }

kill_port() {
  local port="$1"
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -t -i:"$port" 2>/dev/null || true)
  elif command -v fuser >/dev/null 2>&1; then
    pids=$(fuser "${port}/tcp" 2>/dev/null || true)
  fi
  if [ -n "${pids:-}" ]; then
    echo "Menghentikan proses di port $port: $pids"
    kill $pids 2>/dev/null || true
    sleep 1
    # force jika masih hidup
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  fi
}

ensure_postgres() {
  echo "==> Memastikan PostgreSQL (5433 / db_sikes) siap..."
  if command -v pg_isready >/dev/null 2>&1; then
    for i in $(seq 1 20); do
      if pg_isready -h 127.0.0.1 -p 5433 >/dev/null 2>&1; then
        echo "  PostgreSQL siap di 127.0.0.1:5433"
        return 0
      fi
      # coba start cluster jika down
      if [ "$i" -eq 3 ] && command -v pg_ctlcluster >/dev/null 2>&1; then
        sudo pg_ctlcluster 16 main start 2>/dev/null || true
      fi
      sleep 1
    done
    echo "PERINGATAN: PostgreSQL belum merespons di :5433 — backend mungkin gagal connect"
  fi
}

echo "==> Membersihkan port 4000, 5173, 5174..."
kill_port 4000
kill_port 5173
kill_port 5174

for session in pospay-backend pospay-bendahara pospay-siswa; do
  TMUX kill-session -t "$session" 2>/dev/null || true
done

ensure_postgres

# Pastikan HOST bind semua interface
if [ -f "$ROOT/server/.env" ]; then
  if ! grep -q '^HOST=' "$ROOT/server/.env" 2>/dev/null; then
    echo 'HOST=0.0.0.0' >> "$ROOT/server/.env"
  else
    sed -i 's/^HOST=.*/HOST=0.0.0.0/' "$ROOT/server/.env"
  fi
  # DATABASE_URL wajib format yang diminta
  if grep -q '^DATABASE_URL=' "$ROOT/server/.env"; then
    sed -i 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:db123@127.0.0.1:5433/db_sikes?schema=public"|' "$ROOT/server/.env"
  fi
fi

start_session() {
  local name="$1"
  local dir="$2"
  local cmd="$3"
  TMUX new-session -d -s "$name" -c "$dir" -- "${SHELL:-bash}" -l
  TMUX send-keys -t "$name:0.0" "$cmd" C-m
  echo "  + sesi tmux: $name"
}

echo "==> Memulai backend API (HOST=0.0.0.0 PORT=4000)..."
start_session pospay-backend "$ROOT/server" "HOST=0.0.0.0 PORT=4000 npm run dev"

echo "==> Menunggu backend siap (IPv4 127.0.0.1 + health)..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:4000/api/health >/dev/null 2>&1 \
    || curl -sf http://localhost:4000/api/health >/dev/null 2>&1; then
    echo "  Backend API siap (port 4000, bind 0.0.0.0)"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Backend tidak merespons di port 4000. Periksa:"
    echo "  - DATABASE_URL di server/.env"
    echo "  - tmux -f $TMUX_CONF capture-pane -t pospay-backend -p | tail -40"
    exit 1
  fi
  sleep 1
done

echo "==> Memulai portal bendahara & siswa (host 0.0.0.0)..."
start_session pospay-bendahara "$ROOT/apps/bendahara" "npm run dev -- --host 0.0.0.0 --port 5173"
start_session pospay-siswa "$ROOT/apps/siswa" "npm run dev -- --host 0.0.0.0 --port 5174"

echo "==> Menunggu seluruh layanan siap..."
for i in $(seq 1 40); do
  backend_ok=0
  bendahara_ok=0
  siswa_ok=0
  curl -sf http://127.0.0.1:4000/api/health >/dev/null 2>&1 && backend_ok=1
  curl -sf http://127.0.0.1:5173/ >/dev/null 2>&1 && bendahara_ok=1
  curl -sf http://127.0.0.1:5174/ >/dev/null 2>&1 && siswa_ok=1
  if [ "$backend_ok" = 1 ] && [ "$bendahara_ok" = 1 ] && [ "$siswa_ok" = 1 ]; then
    echo ""
    echo "Semua layanan POSPAY berjalan (jangkauan penuh 0.0.0.0):"
    echo "  Backend API     : http://127.0.0.1:4000/api/health"
    echo "  Portal Bendahara: http://127.0.0.1:5173/login"
    echo "  Portal Siswa    : http://127.0.0.1:5174/login"
    echo "  Socket.IO       : path /socket.io (proxy Vite → backend)"
    echo "  Database        : postgresql://…@127.0.0.1:5433/db_sikes"
    echo ""
    echo "Jika browser ERR_CONNECTION_REFUSED di Cursor Cloud:"
    echo "  Forward port 4000, 5173, dan 5174 di tab Ports"
    exit 0
  fi
  sleep 1
done

echo "PERINGATAN: Beberapa layanan belum merespons. Periksa log tmux:"
echo "  tmux -f $TMUX_CONF capture-pane -t pospay-backend -p | tail -50"
echo "  tmux -f $TMUX_CONF capture-pane -t pospay-bendahara -p | tail -30"
echo "  tmux -f $TMUX_CONF capture-pane -t pospay-siswa -p | tail -30"
exit 1
