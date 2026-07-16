/** Cegah double-click hapus; opsional min loading agar UX konsisten (~2 detik). */
const inflight = new Set();

export async function deleteOnce(key, fn, { minMs = 2000 } = {}) {
  if (!key || inflight.has(key)) return { skipped: true };
  inflight.add(key);
  const started = Date.now();
  try {
    const result = await fn();
    return result;
  } finally {
    const wait = Math.max(0, minMs - (Date.now() - started));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    inflight.delete(key);
  }
}
