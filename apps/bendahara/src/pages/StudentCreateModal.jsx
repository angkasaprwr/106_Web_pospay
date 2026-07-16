import { useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

function formatClassLabel(name) {
  if (!name) return '-';
  const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' };
  const m = String(name).match(/^(\d)\s*(.*)$/);
  if (!m) return name;
  const grade = roman[Number(m[1])] || m[1];
  const section = m[2] || '';
  return section ? `${grade} ${section}`.trim() : grade;
}

function AutoBadge() {
  return (
    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
      Otomatis
    </span>
  );
}

function SectionHeader({ icon: IconC, title }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-pospay">
        <IconC width={18} height={18} />
      </span>
      <h3 className="text-sm font-bold text-pospay">{title}</h3>
    </div>
  );
}

function FormLabel({ children, hint }) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-medium text-slate-700">{children}</label>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const FORM_INPUT =
  'w-full rounded-xl border border-white/80 bg-gradient-to-br from-white via-white to-sky-50/50 px-3 py-2.5 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md placeholder:text-slate-400 outline-none transition focus:border-pospay/30 focus:ring-2 focus:ring-pospay/15 dark:border-slate-200 dark:bg-white dark:from-white dark:via-white dark:to-white dark:text-slate-800 dark:placeholder:text-slate-400 [color-scheme:light]';

const FORM_READONLY =
  'w-full rounded-xl border border-white/80 bg-gradient-to-br from-white via-slate-50/70 to-white px-3 py-2.5 text-sm text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md outline-none dark:border-slate-200 dark:bg-white dark:from-white dark:via-white dark:to-white dark:text-slate-700 [color-scheme:light]';

export default function StudentCreateModal({ open, onClose, classes, onSaved }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nis: '', fullName: '', classId: '', birthDate: '', password: '' });
  const [suggestedNis, setSuggestedNis] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setLoading(true);
    api.get('/students/next-nis')
      .then(({ data }) => {
        const nis = data.data.nis || '';
        setSuggestedNis(nis);
        setForm({ nis, fullName: '', classId: '', birthDate: '', password: '' });
      })
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));

    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]); // eslint-disable-line

  const save = async (e) => {
    e.preventDefault();
    const nis = form.nis.trim();
    if (!nis) {
      toast.error('NIS wajib diisi');
      return;
    }
    if (!form.fullName.trim()) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    if (!form.password.trim()) {
      toast.error('Password wajib diisi');
      return;
    }
    if (form.password.trim().length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    setSaving(true);
    try {
      await api.post('/students', {
        nis,
        fullName: form.fullName.trim(),
        classId: form.classId || '',
        birthDate: form.birthDate || undefined,
        password: form.password.trim(),
        createAccount: true,
      });
      toast.success(`Akun siswa tersimpan. Username login: ${nis} (portal siswa)`);
      onSaved?.();
      onClose?.();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const usernamePreview = form.nis.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="mt-6 w-full max-w-3xl animate-[slidein_.2s_ease-out] rounded-2xl border border-slate-100 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-pospay">Tambah Akun Siswa</h2>
            <p className="mt-1 text-sm text-slate-500">
              Buat akun baru untuk siswa. NIS akan digunakan sebagai username login.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Tutup">
            <Icon.X width={20} height={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size={32} />
          </div>
        ) : (
          <form onSubmit={save}>
            <div className="space-y-8 px-6 py-6">
              <section>
                <SectionHeader icon={Icon.User} title="Data Siswa" />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <FormLabel hint="NIS dapat diisi manual atau gunakan saran otomatis. Digunakan sebagai username login.">
                      NIS (Username)
                    </FormLabel>
                    <div className="flex gap-2">
                      <input
                        className={FORM_INPUT}
                        placeholder="Masukkan NIS siswa"
                        value={form.nis}
                        onChange={(e) => setForm({ ...form, nis: e.target.value })}
                        required
                      />
                      {suggestedNis && (
                        <button
                          type="button"
                          title="Gunakan saran NIS otomatis"
                          onClick={() => setForm({ ...form, nis: suggestedNis })}
                          className="shrink-0 rounded-xl border border-white/80 bg-gradient-to-br from-white to-sky-50/60 px-3 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md hover:from-sky-50/80 hover:to-white dark:border-slate-200 dark:bg-white dark:text-slate-600"
                        >
                          Saran
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <input
                      className={FORM_INPUT}
                      placeholder="Masukkan nama lengkap siswa"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <FormLabel>Kelas</FormLabel>
                    <div className="relative">
                      <select
                        className={`${FORM_INPUT} appearance-none`}
                        value={form.classId}
                        onChange={(e) => setForm({ ...form, classId: e.target.value })}
                      >
                        <option value="">Pilih kelas</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>{formatClassLabel(c.name)}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
                    </div>
                  </div>
                  <div>
                    <FormLabel>Tanggal Lahir</FormLabel>
                    <input
                      type="date"
                      className={FORM_INPUT}
                      value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader icon={Icon.Lock} title="Akun Login" />
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <FormLabel hint="Username mengikuti NIS yang diisi (manual atau otomatis).">
                      Username (NIS)
                    </FormLabel>
                    <div className="relative">
                      <input
                        className={`${FORM_READONLY} pr-24`}
                        value={usernamePreview}
                        readOnly
                      />
                      <AutoBadge />
                    </div>
                  </div>
                  <div>
                    <FormLabel hint="Password harus diketik manual oleh bendahara (minimal 6 karakter).">
                      Password
                    </FormLabel>
                    <input
                      type="password"
                      className={`${FORM_INPUT} font-mono`}
                      placeholder="Masukkan password akun siswa"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </section>

              <div className="flex gap-3 rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
                <Icon.Info width={20} height={20} className="mt-0.5 shrink-0 text-sky-600" />
                <div>
                  <p className="font-semibold">Informasi</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sky-800">
                    <li>Siswa tidak perlu verifikasi email saat pembuatan akun.</li>
                    <li>Email (Gmail) dapat ditambahkan atau diubah oleh siswa melalui halaman Profil Saya di website siswa.</li>
                    <li>Akun siswa dapat langsung digunakan untuk login ke website siswa.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-pospay px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pospay-700 disabled:opacity-60"
              >
                {saving ? <Spinner size={18} className="text-white" /> : <Icon.Students width={18} height={18} />}
                Simpan Akun Siswa
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
