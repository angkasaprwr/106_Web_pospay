import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, EmptyState, ConfirmDialog } from '../ui';
import { Icon } from '../Icons';
import { TagihanPagination } from '../tagihan/shared';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatMessageTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(date) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `Hari ini, ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;
  messages.forEach((m) => {
    const dateKey = new Date(m.createdAt).toDateString();
    if (dateKey !== currentDate) {
      currentDate = dateKey;
      groups.push({ type: 'separator', date: m.createdAt, key: `sep-${dateKey}` });
    }
    groups.push({ type: 'message', data: m, key: m.id });
  });
  return groups;
}

function sessionStatusBadge(status) {
  if (status === 'CLOSED') return { label: 'Selesai', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' };
  if (status === 'WAITING_HUMAN') return { label: 'Menunggu', cls: 'bg-amber-50 text-amber-700' };
  if (status === 'HUMAN') return { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700' };
  return { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700' };
}

export default function ChatInboxTab({ onNavigateTab }) {
  const toast = useToast();
  const endRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [counts, setCounts] = useState({ all: 0, unreplied: 0, done: 0 });
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [statusInfo, setStatusInfo] = useState(null);

  const loadStatus = useCallback(async () => {
    try {
      const [{ data: st }] = await Promise.all([
        api.get('/chatbot/status'),
        api.get('/chatbot/working-hours'),
      ]);
      setStatusInfo(st.data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filter !== 'all') params.set('filter', filter);
      if (search.trim()) params.set('search', search.trim());
      const { data } = await api.get(`/chatbot/sessions?${params}`);
      setSessions(data.data.rows || []);
      setMeta(data.data.meta);
      setCounts(data.data.meta?.counts || { all: 0, unreplied: 0, done: 0 });
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filter, search, page, limit]); // eslint-disable-line

  const loadDetail = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const [{ data: det }, { data: msgs }] = await Promise.all([
        api.get(`/chatbot/sessions/${sessionId}`),
        api.get(`/chatbot/sessions/${sessionId}/messages`),
      ]);
      setDetail(det.data);
      setMessages(msgs.data || []);
    } catch (e) {
      toast.error(apiError(e));
    }
  }, []); // eslint-disable-line

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => {
    const t = setInterval(() => {
      loadSessions();
      if (activeId) loadDetail(activeId);
    }, 12000);
    return () => clearInterval(t);
  }, [activeId, loadSessions, loadDetail]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectSession = (id) => {
    setActiveId(id);
    loadDetail(id);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !activeId) return;
    setSending(true);
    try {
      await api.post(`/chatbot/sessions/${activeId}/reply`, { message: reply });
      setReply('');
      await loadDetail(activeId);
      await loadSessions();
      toast.success('Pesan terkirim');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSending(false);
    }
  };

  const closeSession = async () => {
    if (!activeId) return;
    setClosing(true);
    try {
      await api.post(`/chatbot/sessions/${activeId}/close`);
      setConfirmClose(false);
      await loadDetail(activeId);
      await loadSessions();
      toast.success('Percakapan diakhiri');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setClosing(false);
    }
  };

  const whSummary = statusInfo?.workingHours;
  const grouped = groupMessagesByDate(messages);
  const stBadge = detail ? sessionStatusBadge(detail.status) : null;

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
      {/* Panel 1: Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60 xl:flex">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Chatbot</p>
          <nav className="mt-3 space-y-1">
            <button type="button" className="flex w-full items-center gap-2 rounded-lg bg-pospay/10 px-3 py-2 text-sm font-medium text-pospay">
              <Icon.Chat width={16} height={16} /> Chat
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('qa')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white"
            >
              <Icon.Info width={16} height={16} /> Kelola Pertanyaan & Jawaban
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('hours')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white"
            >
              <Icon.Clock width={16} height={16} /> Pengaturan Jam Kerja
            </button>
          </nav>
        </div>

        <div className="p-4">
          <div className="rounded-xl border border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-700">Status Jam Kerja</p>
            <div className="mt-2 flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-pospay">
                <Icon.Clock width={16} height={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800">{whSummary?.label || 'Jam Kerja'}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${whSummary?.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {whSummary?.isOpen ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{whSummary?.range || '-'}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              {whSummary?.isOpen
                ? 'Percakapan saat jam kerja akan dijawab oleh Bendahara langsung.'
                : 'Percakapan di luar jam kerja dijawab otomatis oleh Assistant (AI) secara tergenerate.'}
            </p>
          </div>
        </div>
      </aside>

      {/* Panel 2: Conversation list */}
      <section className="flex w-full shrink-0 flex-col border-r border-slate-100 dark:border-slate-800 sm:w-72 lg:w-80">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-white dark:text-white">Percakapan</h2>
            <button type="button" onClick={loadSessions} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-600" title="Muat ulang">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
            </button>
          </div>
          <div className="relative mt-3">
            <Icon.Search width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 py-2 dark:bg-slate-800 dark:text-slate-100 pl-9 pr-3 text-sm outline-none focus:border-pospay"
              placeholder="Cari nama siswa atau pesan..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {[
              { key: 'all', label: `Semua (${counts.all || 0})` },
              { key: 'unreplied', label: `Belum Dibalas (${counts.unreplied || 0})` },
              { key: 'done', label: 'Selesai' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => { setFilter(f.key); setPage(1); }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${filter === f.key ? 'bg-pospay text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Spinner size={28} /></div>
          ) : sessions.length === 0 ? (
            <EmptyState title="Belum ada percakapan" description="Percakapan siswa akan muncul di sini." icon={Icon.Chat} />
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSession(s.id)}
                className={`flex w-full items-start gap-3 border-b border-slate-50 dark:border-slate-800 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${activeId === s.id ? 'bg-pospay/5' : ''}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(s.studentName)}`}>
                  {s.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white dark:text-white">{s.studentName}</span>
                    <span className="shrink-0 text-[10px] text-slate-400">{formatMessageTime(s.lastMessageAt)}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {s.lastMessage}
                  </p>
                </div>
                {s.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pospay px-1.5 text-[10px] font-bold text-white">
                    {s.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {meta && sessions.length > 0 && (
          <div className="border-t border-slate-100 px-3 py-2">
            <TagihanPagination
              meta={{ page: meta.page, total: meta.total, totalPages: meta.totalPages }}
              limit={limit}
              onPage={setPage}
            />
          </div>
        )}
      </section>

      {/* Panel 3: Chat window */}
      <section className="flex min-w-0 flex-1 flex-col">
        {!activeId || !detail ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState title="Pilih percakapan" description="Pilih siswa dari daftar percakapan untuk mulai membalas." icon={Icon.Chat} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(detail.studentName)}`}>
                  {detail.initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white dark:text-white">{detail.studentName}</p>
                  <p className="text-xs text-slate-500">
                    Siswa Kelas {detail.className} • NIS {detail.nis}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {detail.studentId && (
                  <Link
                    to="/siswa"
                    className="hidden rounded-lg border border-pospay/30 px-3 py-1.5 text-xs font-medium text-pospay hover:bg-pospay/5 sm:inline-flex"
                  >
                    Detail Siswa
                  </Link>
                )}
                <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/40 p-4">
              {grouped.map((item) => {
                if (item.type === 'separator') {
                  return (
                    <div key={item.key} className="flex justify-center py-2">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 shadow-sm">
                        {formatDateSeparator(item.date)}
                      </span>
                    </div>
                  );
                }
                const m = item.data;
                const isStudent = m.role === 'USER';
                const isHuman = m.role === 'HUMAN';
                return (
                  <div key={item.key} className={`flex ${isStudent ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isStudent ? 'rounded-tl-sm bg-white text-slate-800' : isHuman ? 'rounded-tr-sm bg-emerald-100 text-slate-800' : 'rounded-tr-sm bg-emerald-50 text-slate-800'}`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <div className={`mt-1 flex items-center gap-1 text-[10px] text-slate-400 ${isStudent ? '' : 'justify-end'}`}>
                        <span>{formatMessageTime(m.createdAt)}</span>
                        {!isStudent && isHuman && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />

              {detail.status !== 'CLOSED' && (
                <div className="mx-auto mt-4 max-w-lg rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-2.5 text-center text-xs text-blue-800">
                  Percakapan ini ditangani oleh: <strong>{statusInfo?.answerSource || detail.handlerLabel}</strong>
                  {whSummary?.range && <> | Jam kerja aktif: {whSummary.range}</>}
                </div>
              )}
            </div>

            {detail.status !== 'CLOSED' ? (
              <form onSubmit={sendReply} className="border-t border-slate-100 bg-white p-3">
                <div className="mb-2 flex items-center gap-2 text-slate-400">
                  <button type="button" className="rounded p-1 hover:bg-slate-50">😊</button>
                  <button type="button" className="rounded p-1 hover:bg-slate-50"><Icon.Upload width={16} height={16} /></button>
                  <button type="button" className="rounded p-1 hover:bg-slate-50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
                  </button>
                  <button type="button" className="rounded p-1 hover:bg-slate-50"><Icon.Bills width={16} height={16} /></button>
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-pospay"
                    placeholder="Ketik pesan..."
                    rows={1}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendReply(e);
                      }
                    }}
                  />
                  <div className="hidden items-center gap-2 sm:flex">
                    <span className="whitespace-nowrap rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600">
                      Balas sebagai Bendahara
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !reply.trim()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-pospay text-white hover:bg-pospay-700 disabled:opacity-50"
                  >
                    {sending ? <Spinner size={16} className="text-white" /> : <Icon.Send width={18} height={18} />}
                  </button>
                </div>
              </form>
            ) : (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                Percakapan ini telah diakhiri.
              </div>
            )}
          </>
        )}
      </section>

      {/* Panel 4: Details */}
      <aside className="hidden w-72 shrink-0 flex-col border-l border-slate-100 bg-slate-50/40 lg:flex">
        {!detail ? (
          <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-slate-400">
            Detail percakapan akan tampil di sini
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 dark:border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white">Detail Percakapan</h3>
                {stBadge && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stBadge.cls}`}>{stBadge.label}</span>
                )}
              </div>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div><dt className="text-xs text-slate-400">Nama Siswa</dt><dd className="font-medium text-slate-800">{detail.studentName}</dd></div>
                <div><dt className="text-xs text-slate-400">Kelas</dt><dd className="font-medium text-slate-800">{detail.className}</dd></div>
                <div><dt className="text-xs text-slate-400">NIS</dt><dd className="font-medium text-slate-800">{detail.nis}</dd></div>
                <div><dt className="text-xs text-slate-400">Waktu Mulai</dt><dd className="font-medium text-slate-800">{detail.startedAtFormatted}</dd></div>
                <div><dt className="text-xs text-slate-400">Status</dt><dd className="font-medium text-slate-800">{detail.replyStatus}</dd></div>
                <div><dt className="text-xs text-slate-400">Sumber Jawaban Terakhir</dt><dd className="font-medium text-slate-800">{detail.lastAnswerSource}</dd></div>
              </dl>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white dark:text-white">Riwayat Percakapan</h4>
              <div className="mt-3 space-y-3">
                {(detail.timeline || []).slice(-8).reverse().map((t) => (
                  <div key={t.id} className="rounded-lg border border-slate-100 bg-white p-2.5 text-xs">
                    <p className="font-medium text-slate-700">{t.actor}</p>
                    <p className="text-slate-500">{t.action}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{t.atFormatted}</p>
                  </div>
                ))}
              </div>
            </div>

            {detail.status !== 'CLOSED' && (
              <div className="border-t border-slate-100 p-4">
                <button
                  type="button"
                  onClick={() => setConfirmClose(true)}
                  className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Akhiri Percakapan
                </button>
              </div>
            )}
          </>
        )}
      </aside>

      <ConfirmDialog
        open={confirmClose}
        message="Akhiri percakapan dengan siswa ini?"
        onConfirm={closeSession}
        onClose={() => setConfirmClose(false)}
        loading={closing}
      />
    </div>
  );
}
