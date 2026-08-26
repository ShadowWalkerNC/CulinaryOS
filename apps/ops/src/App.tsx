import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './hooks/useSession';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LaborPage from './pages/LaborPage';
import FoodCostPage from './pages/FoodCostPage';
import VendorPage from './pages/VendorPage';
import WastePage from './pages/WastePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  if (loading) return <div className="flex h-screen items-center justify-center text-zinc-400">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="labor" element={<LaborPage />} />
        <Route path="food-cost" element={<FoodCostPage />} />
        <Route path="vendor" element={<VendorPage />} />
        <Route path="waste" element={<WastePage />} />
      </Route>
    </Routes>
  );
}
