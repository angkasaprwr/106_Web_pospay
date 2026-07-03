import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icons';
import LaporanPembayaranTab from '../components/laporan/LaporanPembayaranTab';
import LaporanTunggakanTab from '../components/laporan/LaporanTunggakanTab';

const TABS = [
  { id: 'pembayaran', label: 'Laporan Pembayaran', icon: Icon.Bills },
  { id: 'tunggakan', label: 'Laporan Tunggakan & Dispensasi', icon: Icon.Report },
];

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = TABS.some((t) => t.id === tabParam) ? tabParam : 'pembayaran';
  const [tab, setTab] = useState(initialTab);

  const selectTab = (id) => {
    setTab(id);
    if (id === 'pembayaran') {
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

  const pageTitle = tab === 'tunggakan' ? 'Laporan Tunggakan & Dispensasi' : 'Laporan';
  const pageDesc = tab === 'tunggakan'
    ? 'Kelola dan cetak laporan tunggakan pembayaran siswa serta laporan dispensasi.'
    : 'Kelola dan cetak laporan keuangan sekolah dengan mudah.';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-pospay sm:text-3xl">{pageTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">{pageDesc}</p>
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

      {tab === 'pembayaran' && <LaporanPembayaranTab />}
      {tab === 'tunggakan' && <LaporanTunggakanTab />}

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
