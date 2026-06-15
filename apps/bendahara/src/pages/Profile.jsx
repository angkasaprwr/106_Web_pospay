import { useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, Spinner, Field } from '../components/ui';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: user?.fullName || '', email: user?.email || '', phone: user?.phone || '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/auth/me', form);
      updateUser(data.data);
      toast.success('Profil diperbarui');
    } catch (e) { toast.error(apiError(e)); } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwd.newPassword !== pwd.confirm) return toast.error('Konfirmasi password tidak cocok');
    setChanging(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      toast.success('Password diubah, silakan login kembali');
      setTimeout(logout, 1200);
    } catch (e) { toast.error(apiError(e)); } finally { setChanging(false); }
  };

  return (
    <div>
      <PageHeader title="Profil Saya" subtitle="Kelola informasi akun" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-semibold">Informasi Profil</h3>
          <div className="space-y-3">
            <Field label="Nama Lengkap"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="No. HP"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving ? <Spinner size={16} className="text-white" /> : 'Simpan'}</button>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="mb-4 font-semibold">Ubah Password</h3>
          <div className="space-y-3">
            <Field label="Password Lama"><input type="password" className="input" value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} /></Field>
            <Field label="Password Baru"><input type="password" className="input" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} /></Field>
            <Field label="Konfirmasi Password"><input type="password" className="input" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Field>
            <button className="btn-primary" onClick={changePassword} disabled={changing}>{changing ? <Spinner size={16} className="text-white" /> : 'Ubah Password'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
