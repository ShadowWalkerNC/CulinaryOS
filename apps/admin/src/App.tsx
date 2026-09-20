import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DeviceProvider } from './context/DeviceContext';
import { DevicePreviewBar } from './components/DevicePreviewBar';
import { ResponsiveShell } from './components/layout/ResponsiveShell';
import { GuidedOnboardingWizard } from './components/onboarding/GuidedOnboardingWizard';

import { DashboardPage } from './pages/DashboardPage';
import { ReportingPage } from './pages/ReportingPage';
import { RolesManagementPage } from './pages/RolesManagementPage';
import { SchedulingPage } from './pages/SchedulingPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { MobileOperationsPage } from './pages/MobileOperationsPage';
import { SystemHealthPage } from './pages/SystemHealthPage';

import { MenuPage } from './pages/Menu';
import { StaffPage } from './pages/Staff';
import { PantryPage } from './pages/Pantry';
import { PurchasingPage } from './pages/Purchasing';
import { ToolsPage } from './pages/Tools';
import { SettingsPage } from './pages/Settings';
import { IntegrationsPage } from './pages/Integrations';

export function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  return (
    <DeviceProvider>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans flex flex-col antialiased">
        {/* Device Viewport Preview Engine (Auto / Desktop / Tablet / Mobile) */}
        <DevicePreviewBar />

        {/* Tailored Responsive Shell */}
        <ResponsiveShell onOpenOnboarding={() => setShowOnboarding(true)}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reports" element={<ReportingPage />} />
            <Route path="/roles" element={<RolesManagementPage />} />
            <Route path="/scheduling" element={<SchedulingPage />} />
            <Route path="/data" element={<DataManagementPage />} />
            <Route path="/operations" element={<MobileOperationsPage />} />
            <Route path="/health" element={<SystemHealthPage />} />

            <Route path="/menu" element={<MenuPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/purchasing" element={<PurchasingPage />} />
            <Route path="/pantry" element={<PantryPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route path="/" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ResponsiveShell>

        {/* Guided First-Run Onboarding Wizard */}
        <GuidedOnboardingWizard
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
        />
      </div>
    </DeviceProvider>
  );
}

export default App;
