import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import RequireAuth from '@/components/auth/RequireAuth';
import Layout from '@/components/layout/Layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import LoginPage from '@/pages/LoginPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import DashboardPage from '@/pages/DashboardPage';
import RecipesPage from '@/pages/RecipesPage';
import RecipeDetailPage from '@/pages/RecipeDetailPage';
import PrepPlannerPage from '@/pages/PrepPlannerPage';
import ParLevelsPage from '@/pages/ParLevelsPage';
import PrepHistoryPage from '@/pages/PrepHistoryPage';
import VendorsPage from '@/pages/VendorsPage';
import ShelfLifePage from '@/pages/ShelfLifePage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <ErrorBoundary>
                <Layout />
              </ErrorBoundary>
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="recipes"      element={<RecipesPage />} />
          <Route path="recipes/:id"  element={<RecipeDetailPage />} />
          <Route path="prep"         element={<PrepPlannerPage />} />
          <Route path="par-levels"   element={<ParLevelsPage />} />
          <Route path="prep/history" element={<PrepHistoryPage />} />
          <Route path="vendors"      element={<VendorsPage />} />
          <Route path="shelf-life"   element={<ShelfLifePage />} />
          <Route path="*"            element={<NotFoundPage />} />
        </Route>

        {/* Public catch-all (unauthenticated unknown routes → login) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
