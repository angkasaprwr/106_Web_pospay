import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icons';
import { Spinner } from '../components/ui';

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0056D2] focus:outline-none focus:ring-1 focus:ring-[#0056D2] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-500';
const READONLY =
  'w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200';

const HUBUNGAN_OPTIONS = ['Ayah', 'Ibu', 'Wali'];
const JENIS_DISPENSASI = [
  { value: 'DISCOUNT', label: 'Keringanan Tagihan' },
  { value: 'POSTPONE', label: 'Penundaan Pembayaran' },
  { value: 'WAIVER', label: 'Pembebasan Tagihan' },
];

function formatClassLabel(name) {
  if (!name) return '—';
  const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' };
  const m = String(name).match(/^(\d)\s*(.*)$/);
  if (!m) return name;
  const grade = roman[Number(m[1])] || m[1];
  const section = m[2] || '';
  return section ? `${grade} ${section}`.trim() : grade;
}

function SectionBadge({ num, title }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0056D2] text-sm font-bold text-white dark:bg-blue-600">
        {num}
      </span>
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
    </div>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{children}</label>
      {hint && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

export default function DispensationApply() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    parentName: '',
    relation: '',
    dispType: 'DISCOUNT',
    billId: '',
    amount: '',
    reason: '',
  });

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => setProfile(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayName = profile?.fullName || user?.fullName || '—';
  const nis = profile?.username || user?.username || '—';
  const classLabel = formatClassLabel(profile?.student?.schoolClass?.name);
  const reasonLen = form.reason.length;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    toast.info('Pengajuan dispensasi akan terkirim ke bendahara setelah uji CRUD selesai di portal siswa dan bendahara.');
  };

  return (
    <div className="space-y-6 pb-24">
      <Link
        to="/tagihan"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0056D2] dark:text-slate-400 dark:hover:text-blue-400"
      >
        <Icon.ChevronRight width={16} height={16} className="rotate-180" />
        Kembali
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#0056D2] dark:text-blue-400">Ajukan Dispensasi Siswa</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Ajukan dispensasi untuk keringanan atau penyesuaian tagihan siswa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`${CARD} p-5 sm:p-8`}>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size={32} />
          </div>
        ) : (
          <div className="space-y-10">
            {/* Section 1 */}
            <section>
              <SectionBadge num={1} title="Informasi Siswa" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <FieldLabel>Nama Siswa</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon.User width={16} height={16} />
                    </span>
                    <input type="text" readOnly value={displayName} className={`${READONLY} pl-9`} />
                  </div>
                </div>
                <div>
                  <FieldLabel>NIS</FieldLabel>
                  <input type="text" readOnly value={nis} className={READONLY} />
                </div>
                <div>
                  <FieldLabel>Kelas</FieldLabel>
                  <input type="text" readOnly value={classLabel} className={READONLY} />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Nama Orang Tua/Wali</FieldLabel>
                  <input
                    type="text"
                    value={form.parentName}
                    onChange={set('parentName')}
                    placeholder="Masukkan nama orang tua/wali"
                    className={INPUT}
                  />
                </div>
                <div>
                  <FieldLabel>Hubungan</FieldLabel>
                  <div className="relative">
                    <select value={form.relation} onChange={set('relation')} className={`${INPUT} appearance-none pr-9`}>
                      <option value="">Pilih hubungan</option>
                      {HUBUNGAN_OPTIONS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <Icon.ChevronRight width={16} height={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <SectionBadge num={2} title="Informasi Dispensasi" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Jenis Dispensasi</FieldLabel>
                  <div className="relative">
                    <select value={form.dispType} onChange={set('dispType')} className={`${INPUT} appearance-none pr-9`}>
                      {JENIS_DISPENSASI.map((j) => (
                        <option key={j.value} value={j.value}>{j.label}</option>
                      ))}
                    </select>
                    <Icon.ChevronRight width={16} height={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
                  </div>
                </div>
                <div>
                  <FieldLabel hint="Pilih tagihan yang ingin diajukan dispensasi.">Tagihan yang Diajukan</FieldLabel>
                  <div className="relative">
                    <select value={form.billId} onChange={set('billId')} className={`${INPUT} appearance-none pr-9`}>
                      <option value="">Belum ada tagihan tersedia</option>
                    </select>
                    <Icon.ChevronRight width={16} height={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400" />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <FieldLabel hint="Masukkan jumlah keringanan yang diajukan.">Jumlah yang Diajukan</FieldLabel>
                <div className="relative max-w-xs">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={set('amount')}
                    placeholder="0"
                    className={`${INPUT} pl-10`}
                  />
                </div>
              </div>
              <div className="mt-4">
                <FieldLabel>Alasan Pengajuan</FieldLabel>
                <textarea
                  value={form.reason}
                  onChange={set('reason')}
                  maxLength={500}
                  rows={4}
                  placeholder="Jelaskan alasan pengajuan dispensasi..."
                  className={`${INPUT} resize-none`}
                />
                <p className="mt-1 text-right text-xs text-slate-400 dark:text-slate-500">{reasonLen}/500</p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <SectionBadge num={3} title="Persetujuan Orang Tua/Wali" />
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
                  <p className="text-sm text-sky-900 dark:text-sky-200">
                    <span className="font-semibold">Nama:</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">{form.parentName || '—'}</span>
                  </p>
                  <p className="mt-2 text-sm text-sky-900 dark:text-sky-200">
                    <span className="font-semibold">No. HP:</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">—</span>
                  </p>
                  <p className="mt-2 text-sm text-sky-900 dark:text-sky-200">
                    <span className="font-semibold">Email:</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">—</span>
                  </p>
                </div>
                <div>
                  <p className="mb-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Menyatakan bahwa informasi yang saya berikan adalah benar dan saya mengajukan dispensasi ini dengan penuh tanggung jawab.
                  </p>
                  <FieldLabel>Tanda Tangan Digital</FieldLabel>
                  <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-800/50">
                    <Icon.User width={28} height={28} className="mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                      Silakan tanda tangan Anda di area di atas menggunakan mouse, trackpad, atau layar sentuh.
                    </p>
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                      (Tersedia setelah integrasi CRUD selesai)
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                    Ulangi Tanda Tangan
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Icon.Shield width={16} height={16} className="shrink-0 text-[#0056D2] dark:text-blue-400" />
            Data pengajuan dispensasi akan diverifikasi oleh pihak sekolah.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/tagihan')}
              className="rounded-lg border-2 border-[#0056D2] px-6 py-2.5 text-sm font-semibold text-[#0056D2] hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0056D2] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#004BB8] dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Icon.Send width={18} height={18} />
              Kirim Pengajuan
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
