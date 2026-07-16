#!/usr/bin/env bash
# Jalankan backend + portal bendahara + portal siswa (development).
# - Bind 0.0.0.0 agar menjangkau localhost, LAN, dan port-forward Cloud
# - Skip restart jika semua sehat (POSPAY_FORCE_RESTART=1 untuk paksa)
# - Restart parsial: hanya layanan yang mati yang dihidupkan ulang
# - Timeout menyesuaikan latensi jaringan (jaringan lambat → tunggu lebih lama)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

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

LOG_DIR="/tmp/pospay-dev"
mkdir -p "$LOG_DIR"

# Hitung latensi jaringan → sesuaikan timeout/connect
measure_latency_ms() {
  local start end
  start=$(date +%s%3N 2>/dev/null || echo 0)
  if curl -sf --connect-timeout 2 --max-time 3 http://127.0.0.1:4000/api/health >/dev/null 2>&1 \
    || curl -sf --connect-timeout 2 --max-time 3 https://1.1.1.1 >/dev/null 2>&1; then
    end=$(date +%s%3N 2>/dev/null || echo 0)
    if [ "$start" != 0 ] && [ "$end" != 0 ]; then
      echo $((end - start))
      return
    fi
  fi
  echo 500
}

LATENCY_MS=$(measure_latency_ms)
# jaringan lambat → menunggu lebih lama; cepat → singkat
if [ "$LATENCY_MS" -gt 800 ]; then
  CONNECT_TO=5
  WAIT_BACKEND=90
  WAIT_FRONT=60
  SLEEP_POLL=2
  NET_LABEL="lambat (${LATENCY_MS}ms)"
elif [ "$LATENCY_MS" -gt 300 ]; then
  CONNECT_TO=3
  WAIT_BACKEND=75
  WAIT_FRONT=50
  SLEEP_POLL=1
  NET_LABEL="sedang (${LATENCY_MS}ms)"
else
  CONNECT_TO=2
  WAIT_BACKEND=60
  WAIT_FRONT=40
  SLEEP_POLL=1
  NET_LABEL="baik (${LATENCY_MS}ms)"
fi

service_ok() {
  local url="$1"
  curl -sf --connect-timeout "$CONNECT_TO" --max-time $((CONNECT_TO + 3)) "$url" >/dev/null 2>&1
}

backend_ok() { service_ok "http://127.0.0.1:4000/api/health"; }
bendahara_ok() { service_ok "http://127.0.0.1:5173/"; }
siswa_ok() { service_ok "http://127.0.0.1:5174/"; }

print_urls() {
  echo "  Backend API     : http://127.0.0.1:4000/api/health"
  echo "  Portal Bendahara: http://127.0.0.1:5173/login"
  echo "  Portal Siswa    : http://127.0.0.1:5174/login"
  echo "  Socket.IO       : /socket.io"
  echo "  Database        : postgresql://postgres:***@127.0.0.1:5433/db_sikes"
  echo "  Logs            : $LOG_DIR/*.log"
  echo "  Jaringan        : $NET_LABEL"
}

kill_port() {
  local port="$1"
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -t -i:"$port" 2>/dev/null || true)
  fi
  if [ -n "${pids:-}" ]; then
    echo "Menghentikan proses di port $port: $pids"
    # shellcheck disable=SC2086
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
    local max=20
    if [ "$LATENCY_MS" -gt 800 ]; then max=35; fi
    for i in $(seq 1 "$max"); do
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

ensure_env() {
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
}

start_backend() {
  echo "==> Memulai backend API (HOST=0.0.0.0 PORT=4000)..."
  kill_port 4000
  pkill -f "nodemon src/index.js" 2>/dev/null || true
  sleep 1
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
  for i in $(seq 1 "$WAIT_BACKEND"); do
    if backend_ok; then
      echo "  Backend API siap (port 4000, bind 0.0.0.0)"
      return 0
    fi
    sleep "$SLEEP_POLL"
  done
  echo "ERROR: Backend tidak merespons di port 4000"
  tail -40 "$LOG_DIR/backend.log" || true
  return 1
}

start_bendahara() {
  echo "==> Memulai portal bendahara (0.0.0.0:5173)..."
  kill_port 5173
  pkill -f "vite.*5173" 2>/dev/null || true
  sleep 1
  (
    cd "$ROOT/apps/bendahara"
    unset npm_config_prefix || true
    nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$LOG_DIR/bendahara.log" 2>&1 &
    echo $! > "$LOG_DIR/bendahara.pid"
  )
}

start_siswa() {
  echo "==> Memulai portal siswa (0.0.0.0:5174)..."
  kill_port 5174
  pkill -f "vite.*5174" 2>/dev/null || true
  sleep 1
  (
    cd "$ROOT/apps/siswa"
    unset npm_config_prefix || true
    nohup npm run dev -- --host 0.0.0.0 --port 5174 > "$LOG_DIR/siswa.log" 2>&1 &
    echo $! > "$LOG_DIR/siswa.pid"
  )
}

wait_frontends() {
  echo "==> Menunggu portal siap..."
  for i in $(seq 1 "$WAIT_FRONT"); do
    local b=0 s=0
    bendahara_ok && b=1
    siswa_ok && s=1
    # hanya tunggu yang diminta (1) atau yang sudah ok
    local need_b="${1:-1}"
    local need_s="${2:-1}"
    local ok=1
    [ "$need_b" = 1 ] && [ "$b" != 1 ] && ok=0
    [ "$need_s" = 1 ] && [ "$s" != 1 ] && ok=0
    if [ "$ok" = 1 ]; then
      return 0
    fi
    sleep "$SLEEP_POLL"
  done
  return 1
}

echo "==> Cek layanan POSPAY (jaringan: $NET_LABEL)..."
ensure_env

B_OK=0
BE_OK=0
S_OK=0
backend_ok && B_OK=1
bendahara_ok && BE_OK=1
siswa_ok && S_OK=1

if [ "${POSPAY_FORCE_RESTART:-0}" != "1" ] && [ "$B_OK" = 1 ] && [ "$BE_OK" = 1 ] && [ "$S_OK" = 1 ]; then
  echo ""
  echo "Semua layanan POSPAY sudah berjalan — lewati restart."
  print_urls
  echo "  Paksa restart   : POSPAY_FORCE_RESTART=1 npm run dev:all"
  exit 0
fi

# Restart penuh hanya jika dipaksa
if [ "${POSPAY_FORCE_RESTART:-0}" = "1" ]; then
  echo "==> Paksa restart semua layanan..."
  kill_port 4000
  kill_port 5173
  kill_port 5174
  pkill -f "nodemon src/index.js" 2>/dev/null || true
  pkill -f "vite.*5173" 2>/dev/null || true
  pkill -f "vite.*5174" 2>/dev/null || true
  sleep 1
  B_OK=0
  BE_OK=0
  S_OK=0
fi

ensure_postgres

NEED_BEND=0
NEED_SISWA=0

if [ "$B_OK" != 1 ]; then
  start_backend || exit 1
else
  echo "  Backend sudah sehat — tidak di-restart"
fi

if [ "$BE_OK" != 1 ]; then
  start_bendahara
  NEED_BEND=1
else
  echo "  Portal bendahara sudah sehat — tidak di-restart"
fi

if [ "$S_OK" != 1 ]; then
  start_siswa
  NEED_SISWA=1
else
  echo "  Portal siswa sudah sehat — tidak di-restart"
fi

if [ "$NEED_BEND" = 1 ] || [ "$NEED_SISWA" = 1 ]; then
  if ! wait_frontends "$NEED_BEND" "$NEED_SISWA"; then
    echo "PERINGATAN: Beberapa portal belum merespons."
    echo "  Bendahara: $(bendahara_ok && echo OK || echo FAIL)"
    echo "  Siswa    : $(siswa_ok && echo OK || echo FAIL)"
    tail -10 "$LOG_DIR/bendahara.log" 2>/dev/null || true
    tail -10 "$LOG_DIR/siswa.log" 2>/dev/null || true
    exit 1
  fi
fi

# Verifikasi akhir
backend_ok && bendahara_ok && siswa_ok || {
  echo "ERROR: Verifikasi akhir gagal"
  exit 1
}

echo ""
echo "Semua layanan POSPAY berjalan (jangkauan penuh 0.0.0.0):"
print_urls
echo ""
echo "Jika browser ERR_CONNECTION_REFUSED di Cursor Cloud:"
echo "  Forward port 4000, 5173, dan 5174 di tab Ports"
exit 0
