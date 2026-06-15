import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { formatIDR, formatDate, BILL_STATUS, PAYMENT_STATUS } from '../lib/format';
import { PageLoader, Badge, Modal, Field, Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function BillDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [bill, setBill] = useState(null);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [dispOpen, setDispOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pay, setPay] = useState({ amount: '', paymentMethodId: '', channel: 'TRANSFER', note: '', proof: null });
  const [disp, setDisp] = useState({ type: 'POSTPONE', reason: '', attachment: null });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/portal/bills/${id}`);
      setBill(data.data);
      const remaining = Math.max(0, Number(data.data.amount) - Number(data.data.discount) - Number(data.data.paidAmount));
      setPay((p) => ({ ...p, amount: remaining }));
    } catch (e) { toast.error(apiError(e)); navigate('/tagihan'); } finally { setLoading(false); }
  };
  useEffect(() => { load(); api.get('/portal/payment-methods').then(({ data }) => setMethods(data.data)).catch(() => {}); }, [id]); // eslint-disable-line

  const submitPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('billId', id);
      fd.append('amount', pay.amount);
      fd.append('channel', pay.channel);
      if (pay.paymentMethodId) fd.append('paymentMethodId', pay.paymentMethodId);
      if (pay.note) fd.append('note', pay.note);
      if (pay.proof) fd.append('proof', pay.proof);
      await api.post('/portal/payments', fd);
      setPayOpen(false);
      navigate('/pembayaran-berhasil');
    } catch (err) { toast.error(apiError(err)); } finally { setSubmitting(false); }
  };

  const submitDispensation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('billId', id);
      fd.append('type', disp.type);
      fd.append('reason', disp.reason);
      if (disp.attachment) fd.append('attachment', disp.attachment);
      await api.post('/portal/dispensations', fd);
      toast.success('Pengajuan dispensasi terkirim');
      setDispOpen(false);
      load();
    } catch (err) { toast.error(apiError(err)); } finally { setSubmitting(false); }
  };

  if (loading) return <PageLoader />;
  if (!bill) return null;

  const remaining = Math.max(0, Number(bill.amount) - Number(bill.discount) - Number(bill.paidAmount));
  const canPay = !['PAID', 'WAIVED'].includes(bill.status);
  const hasPending = bill.payments?.some((p) => p.status === 'PENDING');

  return (
    <div>
      <button onClick={() => navigate('/tagihan')} className="mb-4 flex items-center gap-1 text-sm text-slate-500"><Icon.ChevronRight width={16} height={16} className="rotate-180" /> Kembali</button>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold">{bill.feeType?.name}</h1>
              <p className="text-xs text-slate-400">{bill.invoiceNo}{bill.period ? ` · ${bill.period}` : ''}</p>
            </div>
            <Badge status={bill.status} map={BILL_STATUS} />
          </div>
        </div>
        <div className="space-y-2 p-5 text-sm">
          <Row label="Nominal" value={formatIDR(bill.amount)} />
          {Number(bill.discount) > 0 && <Row label="Potongan/Dispensasi" value={`- ${formatIDR(bill.discount)}`} />}
          <Row label="Sudah Dibayar" value={formatIDR(bill.paidAmount)} />
          <div className="my-2 border-t border-dashed border-slate-200 dark:border-slate-700" />
          <Row label="Sisa Tagihan" value={formatIDR(remaining)} bold />
          <Row label="Jatuh Tempo" value={formatDate(bill.dueDate)} />
        </div>
        {canPay && (
          <div className="flex flex-col gap-2 border-t border-slate-200 p-5 dark:border-slate-800 sm:flex-row">
            <button className="btn-primary flex-1" disabled={hasPending} onClick={() => setPayOpen(true)}>
              <Icon.Money width={18} height={18} /> {hasPending ? 'Menunggu Verifikasi' : 'Konfirmasi Pembayaran'}
            </button>
            <button className="btn-secondary flex-1" onClick={() => setDispOpen(true)}><Icon.Dispensation width={18} height={18} /> Ajukan Dispensasi</button>
          </div>
        )}
      </div>

      {bill.payments?.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 font-semibold">Riwayat Pembayaran</h2>
          <div className="space-y-2">
            {bill.payments.map((p) => (
              <div key={p.id} className="card flex items-center justify-between p-3 text-sm">
                <div>
                  <p className="font-medium">{formatIDR(p.amount)}</p>
                  <p className="text-xs text-slate-400">{formatDate(p.paidAt)} · {p.paymentMethod?.name || p.channel}</p>
                  {p.rejectionReason && <p className="text-xs text-red-500">Ditolak: {p.rejectionReason}</p>}
                </div>
                <Badge status={p.status} map={PAYMENT_STATUS} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Konfirmasi Pembayaran"
        footer={<><button className="btn-secondary" onClick={() => setPayOpen(false)}>Batal</button><button className="btn-primary" onClick={submitPayment} disabled={submitting}>{submitting ? <Spinner size={16} className="text-white" /> : 'Kirim'}</button></>}>
        <form onSubmit={submitPayment} className="space-y-3">
          <Field label="Nominal" required><input type="number" className="input" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} required /></Field>
          <Field label="Metode Pembayaran">
            <select className="input" value={pay.paymentMethodId} onChange={(e) => { const m = methods.find((x) => x.id === e.target.value); setPay({ ...pay, paymentMethodId: e.target.value, channel: m?.channel || 'TRANSFER' }); }}>
              <option value="">Pilih metode</option>
              {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          {pay.paymentMethodId && (() => { const m = methods.find((x) => x.id === pay.paymentMethodId); return m && (m.accountNo || m.instruction) ? (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {m.accountName && <p>a.n. {m.accountName}</p>}
              {m.accountNo && <p className="font-mono">{m.accountNo}</p>}
              {m.instruction && <p className="mt-1">{m.instruction}</p>}
            </div>
          ) : null; })()}
          <Field label="Upload Bukti Pembayaran">
            <input type="file" className="input" accept="image/*,application/pdf" onChange={(e) => setPay({ ...pay, proof: e.target.files[0] })} />
          </Field>
          <Field label="Catatan"><textarea className="input" rows={2} value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></Field>
        </form>
      </Modal>

      {/* Dispensation modal */}
      <Modal open={dispOpen} onClose={() => setDispOpen(false)} title="Pengajuan Dispensasi"
        footer={<><button className="btn-secondary" onClick={() => setDispOpen(false)}>Batal</button><button className="btn-primary" onClick={submitDispensation} disabled={submitting}>{submitting ? <Spinner size={16} className="text-white" /> : 'Ajukan'}</button></>}>
        <form onSubmit={submitDispensation} className="space-y-3">
          <Field label="Jenis Dispensasi" required>
            <select className="input" value={disp.type} onChange={(e) => setDisp({ ...disp, type: e.target.value })}>
              <option value="POSTPONE">Penundaan Pembayaran</option>
              <option value="DISCOUNT">Potongan/Keringanan</option>
              <option value="WAIVER">Pembebasan</option>
            </select>
          </Field>
          <Field label="Alasan" required><textarea className="input" rows={3} value={disp.reason} onChange={(e) => setDisp({ ...disp, reason: e.target.value })} placeholder="Jelaskan alasan pengajuan..." required /></Field>
          <Field label="Lampiran (opsional)"><input type="file" className="input" accept="image/*,application/pdf" onChange={(e) => setDisp({ ...disp, attachment: e.target.files[0] })} /></Field>
        </form>
      </Modal>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={bold ? 'font-bold text-brand-600' : 'font-medium'}>{value}</span>
    </div>
  );
}
