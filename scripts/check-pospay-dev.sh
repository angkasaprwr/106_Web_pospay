#!/usr/bin/env bash
# Cek cepat apakah layanan POSPAY dev sedang berjalan
set -uo pipefail

check() {
  local name="$1"
  local url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null || echo "000")
  if [ "$code" = "200" ]; then
    echo "  OK   $name  $url"
    return 0
  fi
  echo "  FAIL $name  $url  (HTTP $code)"
  return 1
}

echo "==> Cek layanan POSPAY"
fail=0
check "Backend API" "http://127.0.0.1:4000/api/health" || fail=1
check "Portal Bendahara" "http://127.0.0.1:5173/" || fail=1
check "Portal Siswa" "http://127.0.0.1:5174/" || fail=1

if command -v lsof >/dev/null 2>&1; then
  echo ""
  echo "==> Proses di port 4000 / 5173 / 5174"
  lsof -i:4000,5173,5174 2>/dev/null || echo "  (tidak ada proses)"
fi

echo ""
if [ "$fail" -eq 0 ]; then
  echo "Semua layanan merespons. Buka:"
  echo "  Bendahara: http://127.0.0.1:5173/login"
  echo "  Siswa    : http://127.0.0.1:5174/login"
  echo ""
  echo "Jika browser Anda ERR_CONNECTION_REFUSED padahal cek ini OK:"
  echo "  1. Jalankan server di mesin yang sama dengan browser (npm run dev:all)"
  echo "  2. Di Cursor Cloud Agent, pastikan port 5173/5174 di-forward (tab Ports)"
  exit 0
fi

echo "Beberapa layanan tidak berjalan. Jalankan:"
echo "  npm run dev:all"
exit 1
