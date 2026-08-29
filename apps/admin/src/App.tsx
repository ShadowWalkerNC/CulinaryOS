import React from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { CulinaryHeader } from '@culinaryos/ui';
import { MenuPage } from './pages/Menu';
import { StaffPage } from './pages/Staff';
import { PantryPage } from './pages/Pantry';
import { SettingsPage } from './pages/Settings';
import { IntegrationsPage } from './pages/Integrations';

export function App() {
  const adminNav = [
    { to: '/menu', label: 'Menu Editor', icon: 'restaurant_menu' },
    { to: '/staff', label: 'Staff & PINs', icon: 'badge' },
    { to: '/pantry', label: 'Pantry & Inventory', icon: 'inventory_2' },
    { to: '/integrations', label: 'Integrations & Hub', icon: 'hub' },
    { to: '/settings', label: 'Settings & Routing', icon: 'tune' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col antialiased">
      {/* Universal CulinaryOS Master Header */}
      <CulinaryHeader activeModule="admin" tenantName="CulinaryOS Back-Office Admin" />

      {/* Admin Sub-Navigation Bar */}
      <header className="bg-white border-b border-[#e5e7eb] px-6 py-2.5 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#0f172a]">admin_panel_settings</span>
            <span className="font-black text-xs tracking-wider text-[#0b1c30] uppercase">Back-Office Admin</span>
          </div>
          <span className="text-[#e5e7eb]">|</span>
          <nav className="flex items-center gap-1 bg-[#f8f9fa] border border-[#e5e7eb] p-1 rounded-xl">
            {adminNav.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-[#0f172a] shadow-xs border border-[#e5e7eb]'
                      : 'text-[#6b7280] hover:text-[#0b1c30] hover:bg-[#e5e7eb50]'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Workspace Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <Routes>
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/menu" replace />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
