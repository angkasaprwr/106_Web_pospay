#!/usr/bin/env bash
# Jalankan ulang backend + portal bendahara + portal siswa (development)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMUX_BIN="${TMUX_BIN:-tmux}"
TMUX_CONF="${TMUX_CONF:-/exec-daemon/tmux.portal.conf}"
TMUX() { "$TMUX_BIN" -f "$TMUX_CONF" "$@"; }

kill_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids=$(lsof -t -i:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "Menghentikan proses di port $port: $pids"
      kill $pids 2>/dev/null || true
      sleep 1
    fi
  fi
}

echo "==> Membersihkan port 4000, 5173, 5174..."
kill_port 4000
kill_port 5173
kill_port 5174

for session in pospay-backend pospay-bendahara pospay-siswa; do
  TMUX kill-session -t "$session" 2>/dev/null || true
done

start_session() {
  local name="$1"
  local dir="$2"
  local cmd="$3"
  TMUX new-session -d -s "$name" -c "$dir" -- "${SHELL:-bash}" -l
  TMUX send-keys -t "$name:0.0" "$cmd" C-m
  echo "  + sesi tmux: $name"
}

echo "==> Memulai layanan..."
start_session pospay-backend "$ROOT/server" "npm run dev"
start_session pospay-bendahara "$ROOT/apps/bendahara" "npm run dev"
start_session pospay-siswa "$ROOT/apps/siswa" "npm run dev"

echo "==> Menunggu layanan siap..."
for i in $(seq 1 30); do
  backend_ok=0
  bendahara_ok=0
  siswa_ok=0
  curl -sf http://127.0.0.1:4000/api/health >/dev/null 2>&1 && backend_ok=1
  curl -sf http://127.0.0.1:5173/ >/dev/null 2>&1 && bendahara_ok=1
  curl -sf http://127.0.0.1:5174/ >/dev/null 2>&1 && siswa_ok=1
  if [ "$backend_ok" = 1 ] && [ "$bendahara_ok" = 1 ] && [ "$siswa_ok" = 1 ]; then
    echo ""
    echo "Semua layanan POSPAY berjalan:"
    echo "  Backend API    : http://127.0.0.1:4000/api"
    echo "  Portal Bendahara: http://127.0.0.1:5173"
    echo "  Portal Siswa   : http://127.0.0.1:5174"
    exit 0
  fi
  sleep 1
done

echo "PERINGATAN: Beberapa layanan belum merespons. Periksa log tmux:"
echo "  tmux -f $TMUX_CONF attach -t pospay-backend"
echo "  tmux -f $TMUX_CONF attach -t pospay-bendahara"
echo "  tmux -f $TMUX_CONF attach -t pospay-siswa"
exit 1
