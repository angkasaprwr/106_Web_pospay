import { useEffect, useRef, useState } from 'react';
import { api, apiError } from '../lib/api';
import { PageHeader, Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Help() {
  const [messages, setMessages] = useState([{ role: 'ASSISTANT', content: 'Halo! Saya asisten keuangan sekolah. Tanyakan apa saja seputar tagihan, pembayaran, atau dispensasi. Ketik "hubungi bendahara" untuk berbicara dengan petugas.' }]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const endRef = useRef();

  useEffect(() => { api.get('/chatbot/status').then(({ data }) => setStatus(data.data)).catch(() => {}); }, []);
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
    <div>
      <PageHeader title="Bantuan" subtitle="Chatbot asisten keuangan" />
      {status && (
        <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${status.workingHoursOpen ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
          <Icon.Clock width={14} height={14} />
          {status.workingHoursOpen ? 'Bendahara sedang dalam jam kerja' : 'Di luar jam kerja — bot tetap siap membantu'}
        </div>
      )}
      <div className="card flex h-[65vh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === 'USER' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'}`}>{m.content}</div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><div className="rounded-2xl bg-slate-100 px-4 py-2 dark:bg-slate-800"><Spinner size={16} /></div></div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <input className="input flex-1" placeholder="Ketik pertanyaan..." value={input} onChange={(e) => setInput(e.target.value)} />
          <button className="btn-primary" disabled={loading}><Icon.Send width={18} height={18} /></button>
        </form>
      </div>
    </div>
  );
}
