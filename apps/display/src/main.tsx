// ============================================================
// CulinaryOS — Display Platform Web & Android TV Entrypoint
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '@culinaryos/ui';

import { DisplayRouter } from './views/DisplayRouter';
import { PairingView } from './views/PairingView';
import { KitchenKdsView } from './views/KitchenKdsView';
import { ManagerWallboardView } from './views/ManagerWallboardView';
import { StaffView } from './views/StaffView';
import { DigitalMenuView } from './views/DigitalMenuView';
import { PickupStatusView } from './views/PickupStatusView';
import { MarketingPromoView } from './views/MarketingPromoView';

// Cheezies Gourmet Views
import { CheeziesOpsView } from './views/cheezies/CheeziesOpsView';
import { CheeziesOwnerView } from './views/cheezies/CheeziesOwnerView';
import { CheeziesMenuView } from './views/cheezies/CheeziesMenuView';
import { CheeziesPickupView } from './views/cheezies/CheeziesPickupView';
import { CheeziesPromoView } from './views/cheezies/CheeziesPromoView';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="CulinaryOS Display Recovery">
      <BrowserRouter>
        <Routes>
          {/* Root auto-router */}
          <Route path="/" element={<DisplayRouter />} />

          {/* Pairing View */}
          <Route path="/pair" element={<PairingView />} />

          {/* CulinaryOS Core Views */}
          <Route path="/kitchen" element={<KitchenKdsView />} />
          <Route path="/display/kitchen" element={<KitchenKdsView />} />

          <Route path="/manager" element={<ManagerWallboardView />} />
          <Route path="/display/manager" element={<ManagerWallboardView />} />

          <Route path="/staff" element={<StaffView />} />
          <Route path="/display/staff" element={<StaffView />} />

          <Route path="/menu" element={<DigitalMenuView />} />
          <Route path="/display/menu" element={<DigitalMenuView />} />

          <Route path="/pickup" element={<PickupStatusView />} />
          <Route path="/display/pickup" element={<PickupStatusView />} />

          <Route path="/promo" element={<MarketingPromoView />} />
          <Route path="/display/promo" element={<MarketingPromoView />} />

          {/* Cheezies Dedicated Food Truck Views */}
          <Route path="/cheezies/ops" element={<CheeziesOpsView />} />
          <Route path="/display/cheezies/ops" element={<CheeziesOpsView />} />

          <Route path="/cheezies/owner" element={<CheeziesOwnerView />} />
          <Route path="/display/cheezies/owner" element={<CheeziesOwnerView />} />

          <Route path="/cheezies/menu" element={<CheeziesMenuView />} />
          <Route path="/display/cheezies/menu" element={<CheeziesMenuView />} />

          <Route path="/cheezies/pickup" element={<CheeziesPickupView />} />
          <Route path="/display/cheezies/pickup" element={<CheeziesPickupView />} />

          <Route path="/cheezies/promo" element={<CheeziesPromoView />} />
          <Route path="/display/cheezies/promo" element={<CheeziesPromoView />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
