import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';
import ChatInboxTab from '../components/chatbot/ChatInboxTab';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const TABS = [
  { id: 'chat', label: 'Chat', icon: Icon.Chat },
  { id: 'qa', label: 'Kelola Pertanyaan & Jawaban', icon: Icon.Info },
  { id: 'hours', label: 'Pengaturan Jam Kerja', icon: Icon.Clock },
];

export default function Chatbot() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = TABS.some((t) => t.id === tabParam) ? tabParam : 'chat';
  const [tab, setTab] = useState(initialTab);

  const selectTab = (id) => {
    setTab(id);
    if (id === 'chat') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', id);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    if (TABS.some((t) => t.id === tabParam) && tabParam !== tab) {
      setTab(tabParam);
    }
  }, [tabParam]); // eslint-disable-line

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-pospay sm:text-3xl">Chatbot</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola percakapan siswa, pertanyaan & jawaban, serta jam kerja layanan chatbot.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const IconC = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-pospay text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-pospay/30 hover:text-pospay'
              }`}
            >
              <IconC width={18} height={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'chat' && <ChatInboxTab onNavigateTab={selectTab} />}
      {tab === 'qa' && <QAManager />}
      {tab === 'hours' && <WorkingHours />}

      <Link
        to="/chatbot"
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-pospay px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pospay-700"
      >
        <Icon.Chat width={20} height={20} />
        <span className="hidden sm:inline">Butuh bantuan? Tanya lewat Chatbot</span>
      </Link>
    </div>
  );
}

function QAManager() {
  const toast = useToast();
  const [subTab, setSubTab] = useState('qa');
  const [items, setItems] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', keywords: '', category: '', isActive: true });
  const [docForm, setDocForm] = useState({ title: '', content: '', source: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [qaRes, docRes] = await Promise.all([
        api.get('/chatbot/qa'),
        api.get('/chatbot/documents'),
      ]);
      setItems(qaRes.data.data);
      setDocs(docRes.data.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const saveQa = async () => {
    setSaving(true);
    try {
      if (modal.mode === 'create') await api.post('/chatbot/qa', form);
      else await api.patch(`/chatbot/qa/${modal.data.id}`, form);
      toast.success('Tersimpan');
      setModal(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const saveDoc = async () => {
    setSaving(true);
    try {
      if (modal.mode === 'create-doc') await api.post('/chatbot/documents', docForm);
      else await api.patch(`/chatbot/documents/${modal.data.id}`, docForm);
      toast.success('Tersimpan');
      setModal(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setSaving(true);
    try {
      if (confirm.type === 'qa') await api.delete(`/chatbot/qa/${confirm.id}`);
      else await api.delete(`/chatbot/documents/${confirm.id}`);
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab('qa')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${subTab === 'qa' ? 'bg-pospay text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
        >
          Pertanyaan & Jawaban
        </button>
        <button
          type="button"
          onClick={() => setSubTab('docs')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${subTab === 'docs' ? 'bg-pospay text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
        >
          Dokumen RAG
        </button>
      </div>

      {subTab === 'qa' && (
        <div>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-pospay px-4 py-2 text-sm font-medium text-white hover:bg-pospay-700"
              onClick={() => { setForm({ question: '', answer: '', keywords: '', category: '', isActive: true }); setModal({ mode: 'create' }); }}
            >
              <Icon.Plus width={18} height={18} /> Tambah Q&A
            </button>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
            {loading ? (
              <div className="flex h-40 items-center justify-center"><Spinner size={32} /></div>
            ) : items.length === 0 ? (
              <EmptyState title="Belum ada Q&A" icon={Icon.Chat} />
            ) : (
              <div className="divide-y divide-slate-100">
                {items.map((q) => (
                  <div key={q.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{q.question}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{q.answer}</p>
                      {q.category && <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{q.category}</span>}
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { setForm({ ...q }); setModal({ mode: 'edit', data: q }); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><Icon.Edit width={16} height={16} /></button>
                      <button type="button" onClick={() => setConfirm({ type: 'qa', id: q.id })} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Icon.Trash width={16} height={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'docs' && (
        <div>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-pospay px-4 py-2 text-sm font-medium text-white hover:bg-pospay-700"
              onClick={() => { setDocForm({ title: '', content: '', source: '', isActive: true }); setModal({ mode: 'create-doc' }); }}
            >
              <Icon.Plus width={18} height={18} /> Tambah Dokumen
            </button>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
            {loading ? (
              <div className="flex h-40 items-center justify-center"><Spinner size={32} /></div>
            ) : docs.length === 0 ? (
              <EmptyState title="Belum ada dokumen RAG" icon={Icon.Report} />
            ) : (
              <div className="divide-y divide-slate-100">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{d.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{d.content}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { setDocForm({ ...d }); setModal({ mode: 'edit-doc', data: d }); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50"><Icon.Edit width={16} height={16} /></button>
                      <button type="button" onClick={() => setConfirm({ type: 'doc', id: d.id })} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Icon.Trash width={16} height={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={!!modal && (modal.mode === 'create' || modal.mode === 'edit')}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Tambah Q&A' : 'Edit Q&A'}
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button type="button" className="btn-primary" onClick={saveQa} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button>
          </>
        )}
      >
        <div className="space-y-3">
          <Field label="Pertanyaan" required><input className="input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
          <Field label="Jawaban" required><textarea className="input" rows={3} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></Field>
          <Field label="Kata Kunci"><input className="input" placeholder="spp, bayar, transfer" value={form.keywords || ''} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></Field>
          <Field label="Kategori"><input className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal
        open={!!modal && (modal.mode === 'create-doc' || modal.mode === 'edit-doc')}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create-doc' ? 'Tambah Dokumen' : 'Edit Dokumen'}
        size="lg"
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button type="button" className="btn-primary" onClick={saveDoc} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button>
          </>
        )}
      >
        <div className="space-y-3">
          <Field label="Judul" required><input className="input" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} /></Field>
          <Field label="Isi Dokumen" required><textarea className="input" rows={8} value={docForm.content} onChange={(e) => setDocForm({ ...docForm, content: e.target.value })} /></Field>
          <Field label="Sumber"><input className="input" value={docForm.source || ''} onChange={(e) => setDocForm({ ...docForm, source: e.target.value })} /></Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} message="Hapus data ini?" onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
    </div>
  );
}

function WorkingHours() {
  const toast = useToast();
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/chatbot/working-hours'),
      api.get('/chatbot/status'),
    ]).then(([wh, st]) => {
      const map = {};
      wh.data.data.forEach((h) => { map[h.dayOfWeek] = h; });
      const full = [1, 2, 3, 4, 5, 6, 0].map((d) => map[d] || { dayOfWeek: d, isOpen: false, openTime: '07:00', closeTime: '14:00' });
      setHours(full);
      setStatusInfo(st.data.data);
    }).catch((e) => toast.error(apiError(e))).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const update = (idx, patch) => setHours((h) => h.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/chatbot/working-hours', { hours });
      toast.success('Jam kerja disimpan');
      const { data } = await api.get('/chatbot/status');
      setStatusInfo(data.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner size={32} /></div>;

  const whSummary = statusInfo?.workingHours;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
        <h2 className="text-base font-semibold text-slate-900">Pengaturan Jam Kerja</h2>
        <p className="mt-1 text-sm text-slate-500">
          Atur jam ketersediaan bendahara untuk membalas chat siswa secara langsung.
        </p>
        <div className="mt-5 space-y-3">
          {hours.map((h, i) => (
            <div key={h.dayOfWeek} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
              <label className="flex w-28 items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={h.isOpen} onChange={(e) => update(i, { isOpen: e.target.checked })} className="rounded border-slate-300" />
                {DAYS[h.dayOfWeek]}
              </label>
              <input type="time" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" value={h.openTime} onChange={(e) => update(i, { openTime: e.target.value })} disabled={!h.isOpen} />
              <span className="text-slate-400">—</span>
              <input type="time" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" value={h.closeTime} onChange={(e) => update(i, { closeTime: e.target.value })} disabled={!h.isOpen} />
            </div>
          ))}
        </div>
        <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-pospay px-5 py-2.5 text-sm font-medium text-white hover:bg-pospay-700" onClick={save} disabled={saving}>
          {saving ? <Spinner size={16} className="text-white" /> : 'Simpan Jam Kerja'}
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Status Saat Ini</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-pospay">
              <Icon.Clock width={20} height={20} />
            </div>
            <div>
              <p className="font-medium text-slate-800">{whSummary?.label || '-'}</p>
              <p className="text-sm text-slate-500">{whSummary?.range || '-'}</p>
            </div>
            <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${whSummary?.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {whSummary?.isOpen ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Di luar jam kerja, chatbot akan dijawab oleh Assistant (AI) menggunakan Google Gemini 2.5 Flash dengan Function Calling + RAG.
          </p>
        </div>
      </div>
    </div>
  );
}
