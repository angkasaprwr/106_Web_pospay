import { useEffect, useRef, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Spinner, Modal, Field, EmptyState, ConfirmDialog } from '../components/ui';
import { Icon } from '../components/Icons';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function Chatbot() {
  const [tab, setTab] = useState('chat');
  const TABS = [
    { key: 'chat', label: 'Chat' },
    { key: 'sessions', label: 'Sesi Live' },
    { key: 'qa', label: 'Kelola Q&A' },
    { key: 'docs', label: 'Dokumen' },
    { key: 'hours', label: 'Jam Kerja' },
  ];
  return (
    <div>
      <PageHeader title="Chatbot" subtitle="Asisten AI keuangan, Q&A, dokumen RAG, dan jam kerja" />
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'chat' && <ChatTester />}
      {tab === 'sessions' && <Sessions />}
      {tab === 'qa' && <QAManager />}
      {tab === 'docs' && <DocsManager />}
      {tab === 'hours' && <WorkingHours />}
    </div>
  );
}

function ChatTester() {
  const [messages, setMessages] = useState([{ role: 'ASSISTANT', content: 'Halo! Saya asisten keuangan sekolah. Ada yang bisa dibantu?' }]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const endRef = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setMessages((m) => [...m, { role: 'USER', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/chatbot/message', { message: text, sessionId });
      setSessionId(data.data.sessionId);
      setMessages((m) => [...m, { role: 'ASSISTANT', content: data.data.message.content }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'ASSISTANT', content: apiError(err) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex h-[60vh] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === 'USER' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'}`}>{m.content}</div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2 dark:bg-slate-800"><Spinner size={16} /></div></div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <input className="input flex-1" placeholder="Ketik pesan..." value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn-primary" disabled={loading}><Icon.Send width={18} height={18} /></button>
      </form>
    </div>
  );
}

function Sessions() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await api.get('/chatbot/sessions');
      setSessions(data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []); // eslint-disable-line

  const open = async (s) => {
    setActive(s);
    const { data } = await api.get(`/chatbot/sessions/${s.id}/messages`);
    setMessages(data.data);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    try {
      await api.post(`/chatbot/sessions/${active.id}/reply`, { message: reply });
      setReply('');
      open(active);
    } catch (e) { toast.error(apiError(e)); }
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="card overflow-hidden lg:col-span-1">
        <div className="border-b border-slate-200 px-4 py-3 font-semibold dark:border-slate-800">Sesi Chat</div>
        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin">
          {sessions.length === 0 ? <EmptyState title="Belum ada sesi" icon={Icon.Chat} /> : sessions.map((s) => (
            <button key={s.id} onClick={() => open(s)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left dark:border-slate-800 ${active?.id === s.id ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{s.user?.fullName || 'Tamu'}</span>
                <span className={`badge ${s.status === 'WAITING_HUMAN' ? 'bg-amber-100 text-amber-700' : s.status === 'HUMAN' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{s.status}</span>
              </div>
              <p className="truncate text-xs text-slate-400">{s.messages?.[0]?.content}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="card flex flex-col lg:col-span-2">
        {!active ? <EmptyState title="Pilih sesi untuk membalas" icon={Icon.Chat} /> : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4" style={{ maxHeight: '50vh' }}>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'USER' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === 'USER' ? 'bg-slate-100 dark:bg-slate-800' : m.role === 'HUMAN' ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white'}`}>
                    <p className="mb-0.5 text-[10px] opacity-70">{m.role === 'USER' ? 'Siswa' : m.role === 'HUMAN' ? 'Bendahara' : 'Bot'}</p>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
              <input className="input flex-1" placeholder="Balas sebagai bendahara..." value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className="btn-primary"><Icon.Send width={18} height={18} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function QAManager() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', keywords: '', category: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => { try { const { data } = await api.get('/chatbot/qa'); setItems(data.data); } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const openCreate = () => { setForm({ question: '', answer: '', keywords: '', category: '', isActive: true }); setModal({ mode: 'create' }); };
  const openEdit = (q) => { setForm({ ...q }); setModal({ mode: 'edit', data: q }); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal.mode === 'create') await api.post('/chatbot/qa', form);
      else await api.patch(`/chatbot/qa/${modal.data.id}`, form);
      toast.success('Tersimpan'); setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };
  const del = async () => { setSaving(true); try { await api.delete(`/chatbot/qa/${confirm.id}`); setConfirm(null); load(); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); } };

  return (
    <div>
      <div className="mb-3 flex justify-end"><button className="btn-primary" onClick={openCreate}><Icon.Plus width={18} height={18} /> Tambah Q&A</button></div>
      <div className="card overflow-hidden">
        {loading ? <div className="flex h-40 items-center justify-center"><Spinner size={32} /></div> : items.length === 0 ? <EmptyState title="Belum ada Q&A" icon={Icon.Chat} /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((q) => (
              <div key={q.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{q.question}</p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{q.answer}</p>
                  {q.category && <span className="badge mt-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{q.category}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(q)} className="btn-ghost rounded p-1.5"><Icon.Edit width={16} height={16} /></button>
                  <button onClick={() => setConfirm(q)} className="btn-ghost rounded p-1.5 text-red-500"><Icon.Trash width={16} height={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Tambah Q&A' : 'Edit Q&A'} footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button></>}>
        <div className="space-y-3">
          <Field label="Pertanyaan" required><input className="input" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} /></Field>
          <Field label="Jawaban" required><textarea className="input" rows={3} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} /></Field>
          <Field label="Kata Kunci"><input className="input" placeholder="spp, bayar, transfer" value={form.keywords || ''} onChange={(e) => setForm({ ...form, keywords: e.target.value })} /></Field>
          <Field label="Kategori"><input className="input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} message="Hapus Q&A ini?" onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
    </div>
  );
}

function DocsManager() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', source: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = async () => { try { const { data } = await api.get('/chatbot/documents'); setItems(data.data); } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const openCreate = () => { setForm({ title: '', content: '', source: '', isActive: true }); setModal({ mode: 'create' }); };
  const openEdit = (d) => { setForm({ ...d }); setModal({ mode: 'edit', data: d }); };
  const save = async () => {
    setSaving(true);
    try {
      if (modal.mode === 'create') await api.post('/chatbot/documents', form);
      else await api.patch(`/chatbot/documents/${modal.data.id}`, form);
      toast.success('Tersimpan'); setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };
  const del = async () => { setSaving(true); try { await api.delete(`/chatbot/documents/${confirm.id}`); setConfirm(null); load(); } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); } };

  return (
    <div>
      <div className="mb-3 flex justify-end"><button className="btn-primary" onClick={openCreate}><Icon.Plus width={18} height={18} /> Tambah Dokumen</button></div>
      <div className="card overflow-hidden">
        {loading ? <div className="flex h-40 items-center justify-center"><Spinner size={32} /></div> : items.length === 0 ? <EmptyState title="Belum ada dokumen RAG" icon={Icon.Report} /> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((d) => (
              <div key={d.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{d.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{d.content}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(d)} className="btn-ghost rounded p-1.5"><Icon.Edit width={16} height={16} /></button>
                  <button onClick={() => setConfirm(d)} className="btn-ghost rounded p-1.5 text-red-500"><Icon.Trash width={16} height={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Tambah Dokumen' : 'Edit Dokumen'} size="lg" footer={<><button className="btn-secondary" onClick={() => setModal(null)}>Batal</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button></>}>
        <div className="space-y-3">
          <Field label="Judul" required><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Isi Dokumen" required><textarea className="input" rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></Field>
          <Field label="Sumber"><input className="input" value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })} /></Field>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirm} message="Hapus dokumen ini?" onConfirm={del} onClose={() => setConfirm(null)} loading={saving} />
    </div>
  );
}

function WorkingHours() {
  const toast = useToast();
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/chatbot/working-hours').then(({ data }) => {
      const map = {};
      data.data.forEach((h) => { map[h.dayOfWeek] = h; });
      const full = [1, 2, 3, 4, 5, 6, 0].map((d) => map[d] || { dayOfWeek: d, isOpen: false, openTime: '08:00', closeTime: '15:00' });
      setHours(full);
    }).catch((e) => toast.error(apiError(e))).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const update = (idx, patch) => setHours((h) => h.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/chatbot/working-hours', { hours });
      toast.success('Jam kerja disimpan');
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Spinner size={32} /></div>;

  return (
    <div className="card max-w-2xl p-5">
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Atur jam ketersediaan bendahara untuk fitur <em>human handover</em> chatbot.</p>
      <div className="space-y-2">
        {hours.map((h, i) => (
          <div key={h.dayOfWeek} className="flex items-center gap-3">
            <label className="flex w-28 items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={h.isOpen} onChange={(e) => update(i, { isOpen: e.target.checked })} />
              {DAYS[h.dayOfWeek]}
            </label>
            <input type="time" className="input w-auto" value={h.openTime} onChange={(e) => update(i, { openTime: e.target.value })} disabled={!h.isOpen} />
            <span className="text-slate-400">—</span>
            <input type="time" className="input w-auto" value={h.closeTime} onChange={(e) => update(i, { closeTime: e.target.value })} disabled={!h.isOpen} />
          </div>
        ))}
      </div>
      <button className="btn-primary mt-5" onClick={save} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan Jam Kerja'}</button>
    </div>
  );
}
