import React            from 'react';
import ReactDOM         from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@culinaryos/ui';
import './index.css';
import { LandingPage } from './pages/LandingPage';
import { MenuPage } from './pages/MenuPage';
import { TablesidePage } from './pages/TablesidePage';
import { OrderStatusPage } from './pages/OrderStatusPage';
import { JobsPage } from './pages/JobsPage';
import { NotFoundPage } from './pages/NotFoundPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="CulinaryOS Platform Recovery">
      <BrowserRouter>
        <Routes>
          {/* Landing / Marketing Page for CulinaryOS Platform */}
          <Route path="/"                                 element={<LandingPage />} />
          <Route path="/demo"                             element={<Navigate to="/menu/demo" replace />} />
          {/* Public CulinaryJobs Restaurant Career Board */}
          <Route path="/jobs"                             element={<JobsPage />} />
          {/* :slug identifies the restaurant storefront — e.g. /menu/demo */}
          <Route path="/menu/:slug"                       element={<MenuPage />} />
          {/* Dedicated Tableside QR Route for View-Only, Pay-at-Table & Self-Ordering */}
          <Route path="/table/:slug/:tableNumber"         element={<TablesidePage />} />
          <Route path="/order-status/:orderId"            element={<OrderStatusPage />} />
          <Route path="/404"                              element={<NotFoundPage />} />
          <Route path="*"                                 element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
