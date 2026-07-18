import React            from 'react';
import ReactDOM         from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { MenuPage } from './pages/MenuPage';
import { NotFoundPage } from './pages/NotFoundPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* :slug identifies the tenant — e.g. /menu/the-blue-fig */}
        <Route path="/menu/:slug"    element={<MenuPage />} />
        <Route path="/404"           element={<NotFoundPage />} />
        <Route path="/"              element={<Navigate to="/menu/demo" replace />} />
        <Route path="*"              element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
