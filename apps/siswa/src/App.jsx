import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PageLoader } from './components/ui';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bills from './pages/Bills';
import BillDetail from './pages/BillDetail';
import PaymentSuccess from './pages/PaymentSuccess';
import History from './pages/History';
import Help from './pages/Help';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="tagihan" element={<Bills />} />
        <Route path="tagihan/:id" element={<BillDetail />} />
        <Route path="pembayaran-berhasil" element={<PaymentSuccess />} />
        <Route path="riwayat" element={<History />} />
        <Route path="bantuan" element={<Help />} />
        <Route path="profil" element={<Profile />} />
        <Route path="pengaturan" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
