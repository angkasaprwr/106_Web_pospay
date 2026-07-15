#!/usr/bin/env bash
# Jalankan ulang backend + portal bendahara + portal siswa (development)
# Backend di-bind ke 0.0.0.0 agar menjangkau IPv4, localhost, dan port-forward Cloud.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Pastikan Node/npm tersedia (hindari nvm broken oleh npm_config_prefix=/)
unset npm_config_prefix || true
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NODE_BIN=""
if [ -x "$HOME/.nvm/versions/node/v22.22.2/bin/npm" ]; then
  NODE_BIN="$HOME/.nvm/versions/node/v22.22.2/bin"
elif [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  NODE_BIN="$(dirname "$(command -v npm)")"
fi
if [ -n "$NODE_BIN" ]; then
  export PATH="$NODE_BIN:$PATH"
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm tidak ditemukan. Periksa instalasi Node.js / nvm."
  exit 1
fi

kill_port() {
  local port="$1"
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -t -i:"$port" 2>/dev/null || true)
  fi
  if [ -n "${pids:-}" ]; then
    echo "Menghentikan proses di port $port: $pids"
    kill $pids 2>/dev/null || true
    sleep 1
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

# Matikan proses lama dari log nohup / tmux sebelumnya
pkill -f "nodemon src/index.js" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true
pkill -f "vite.*5174" 2>/dev/null || true
sleep 1

ensure_postgres

# Pastikan HOST + DATABASE_URL di server/.env
mkdir -p "$ROOT/server"
if [ -f "$ROOT/server/.env" ]; then
  if ! grep -q '^HOST=' "$ROOT/server/.env" 2>/dev/null; then
    echo 'HOST=0.0.0.0' >> "$ROOT/server/.env"
  else
    sed -i 's/^HOST=.*/HOST=0.0.0.0/' "$ROOT/server/.env"
  fi
  if grep -q '^DATABASE_URL=' "$ROOT/server/.env"; then
    sed -i 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:db123@127.0.0.1:5433/db_sikes?schema=public"|' "$ROOT/server/.env"
  fi
fi

LOG_DIR="/tmp/pospay-dev"
mkdir -p "$LOG_DIR"

echo "==> Memulai backend API (HOST=0.0.0.0 PORT=4000)..."
(
  cd "$ROOT/server"
  unset npm_config_prefix || true
  export HOST=0.0.0.0 PORT=4000
  export PATH="$PATH"
  nohup npm run dev > "$LOG_DIR/backend.log" 2>&1 &
  echo $! > "$LOG_DIR/backend.pid"
)
echo "  + backend pid $(cat "$LOG_DIR/backend.pid") → log $LOG_DIR/backend.log"

echo "==> Menunggu backend siap..."
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:4000/api/health >/dev/null 2>&1 \
    || curl -sf http://[::1]:4000/api/health >/dev/null 2>&1; then
    echo "  Backend API siap (port 4000, bind 0.0.0.0)"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Backend tidak merespons di port 4000"
    tail -40 "$LOG_DIR/backend.log" || true
    exit 1
  fi
  sleep 1
done

echo "==> Memulai portal bendahara (0.0.0.0:5173)..."
(
  cd "$ROOT/apps/bendahara"
  unset npm_config_prefix || true
  nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$LOG_DIR/bendahara.log" 2>&1 &
  echo $! > "$LOG_DIR/bendahara.pid"
)

echo "==> Memulai portal siswa (0.0.0.0:5174)..."
(
  cd "$ROOT/apps/siswa"
  unset npm_config_prefix || true
  nohup npm run dev -- --host 0.0.0.0 --port 5174 > "$LOG_DIR/siswa.log" 2>&1 &
  echo $! > "$LOG_DIR/siswa.pid"
)

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
    echo "  Socket.IO       : /socket.io"
    echo "  Database        : postgresql://postgres:***@127.0.0.1:5433/db_sikes"
    echo "  Logs            : $LOG_DIR/*.log"
    echo ""
    echo "Jika browser ERR_CONNECTION_REFUSED di Cursor Cloud:"
    echo "  Forward port 4000, 5173, dan 5174 di tab Ports"
    exit 0
  fi
  sleep 1
done

echo "PERINGATAN: Beberapa layanan belum merespons."
echo "  Backend  : $(curl -sf http://127.0.0.1:4000/api/health >/dev/null && echo OK || echo FAIL)"
echo "  Bendahara: $(curl -sf http://127.0.0.1:5173/ >/dev/null && echo OK || echo FAIL)"
echo "  Siswa    : $(curl -sf http://127.0.0.1:5174/ >/dev/null && echo OK || echo FAIL)"
tail -20 "$LOG_DIR/backend.log" || true
tail -10 "$LOG_DIR/bendahara.log" || true
tail -10 "$LOG_DIR/siswa.log" || true
exit 1
