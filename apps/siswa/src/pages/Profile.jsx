import { useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, PageLoader, Field } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatDate } from '../lib/format';

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => setProfile(data.data)).catch((e) => toast.error(apiError(e))).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <PageLoader />;
  const s = profile?.student;

  return (
    <div>
      <PageHeader title="Profil Saya" />
      <div className="card overflow-hidden">
        <div className="flex flex-col items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">{(profile?.fullName || 'S')[0]}</div>
          <h2 className="text-lg font-bold">{profile?.fullName}</h2>
          <p className="text-sm text-brand-100">NIS {profile?.username}</p>
        </div>
        <div className="space-y-3 p-5 text-sm">
          <Info icon={Icon.User} label="Nama Lengkap" value={profile?.fullName} />
          <Info icon={Icon.Bills} label="Kelas" value={s?.schoolClass?.name || '-'} />
          <Info icon={Icon.Bills} label="Tahun Ajaran" value={s?.schoolClass?.academicYear?.name || '-'} />
          <Info icon={Icon.User} label="Jenis Kelamin" value={s?.gender === 'L' ? 'Laki-laki' : s?.gender === 'P' ? 'Perempuan' : '-'} />
          <Info icon={Icon.User} label="Nama Orang Tua" value={s?.parentName || '-'} />
          <Info icon={Icon.User} label="No. HP Orang Tua" value={s?.parentPhone || '-'} />
          <Info icon={Icon.Clock} label="Terdaftar" value={formatDate(s?.enrolledAt)} />
        </div>
      </div>
    </div>
  );
}

function Info({ icon: IconC, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"><IconC width={16} height={16} /></div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
