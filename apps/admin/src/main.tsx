import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { PantryPage } from './pages/Pantry';
import { MenuPage } from './pages/Menu';
import { StaffPage } from './pages/Staff';

function PantryWithNav() {
  return (
    <div>
      <nav
        style={{
          display: 'flex',
          gap: 16,
          padding: '16px 24px',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Link to="/menu">Menu</Link>
        <Link to="/staff">Staff</Link>
        <Link to="/pantry">Pantry</Link>
      </nav>
      <PantryPage />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/pantry" element={<PantryWithNav />} />
        <Route path="/" element={<Navigate to="/menu" replace />} />
        <Route path="*" element={<Navigate to="/menu" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
