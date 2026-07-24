import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Station } from './pages/Station';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Default station — station id from URL param */}
        <Route path="/station/:stationId" element={<Station />} />
        {/* Redirect root to expo station */}
        <Route path="/" element={<Navigate to="/station/expo" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
