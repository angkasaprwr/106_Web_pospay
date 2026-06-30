import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PageLoader } from './components/ui';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import VerifyRegister from './pages/VerifyRegister';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Bills from './pages/Bills';
import Payments from './pages/Payments';
import Dispensations from './pages/Dispensations';
import Reports from './pages/Reports';
import Chatbot from './pages/Chatbot';
import Settings from './pages/Settings';
import About from './pages/About';
import Profile from './pages/Profile';

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
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/register/verify" element={<PublicOnly><VerifyRegister /></PublicOnly>} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="siswa" element={<Students />} />
        <Route path="tagihan" element={<Bills />} />
        <Route path="pembayaran" element={<Payments />} />
        <Route path="dispensasi" element={<Dispensations />} />
        <Route path="laporan" element={<Reports />} />
        <Route path="chatbot" element={<Chatbot />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="pengaturan/tentang" element={<About />} />
        <Route path="profil" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
