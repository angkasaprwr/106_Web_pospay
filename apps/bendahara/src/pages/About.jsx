import { PageHeader } from '../components/ui';
import { Icon } from '../components/Icons';

export default function About({ embedded = false }) {
  const content = (
    <div className="card p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-white"><Icon.School width={28} height={28} /></div>
        <div>
          <h2 className="text-xl font-bold">POSPAY</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sistem Informasi Keuangan Sekolah</p>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-slate-400">Versi</dt><dd className="font-medium">1.0.0</dd></div>
        <div><dt className="text-slate-400">Studi Kasus</dt><dd className="font-medium">SMP Pusponegoro Brebes</dd></div>
        <div><dt className="text-slate-400">Teknologi</dt><dd className="font-medium">React, Express, Prisma, PostgreSQL</dd></div>
        <div><dt className="text-slate-400">AI Chatbot</dt><dd className="font-medium">Gemini 2.5 Flash (Function Calling + RAG)</dd></div>
      </dl>
      <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <p className="mb-2 font-semibold">Bantuan</p>
        <p>Aplikasi ini membantu bendahara mengelola tagihan, pembayaran, dispensasi, laporan keuangan, serta layanan chatbot. Untuk bantuan lebih lanjut, hubungi administrator sekolah.</p>
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} SMP Pusponegoro Brebes. Seluruh hak cipta dilindungi.</p>
    </div>
  );
  if (embedded) return content;
  return (
    <div>
      <PageHeader title="Tentang Aplikasi" subtitle="Informasi & bantuan" />
      <div className="max-w-2xl">{content}</div>
    </div>
  );
}
