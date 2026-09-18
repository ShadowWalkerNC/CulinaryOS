import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { MenuPage } from './pages/Menu';
import { StaffPage } from './pages/Staff';
import { PantryPage } from './pages/Pantry';
import { ToolsPage } from './pages/Tools';
import { SettingsPage } from './pages/Settings';
import { IntegrationsPage } from './pages/Integrations';
import { CompactNavigation, CulinaryAppLauncher, type CompactNavigationItem } from '@culinaryos/ui';

export function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const adminNav = [
    { to: '/menu', label: 'Menu Editor', icon: 'restaurant_menu' },
    { to: '/staff', label: 'Staff & Hiring', icon: 'badge' },
    { to: '/pantry', label: 'Pantry & Inventory', icon: 'inventory_2' },
    { to: '/tools', label: 'Tools & Addons', icon: 'extension' },
    { to: '/integrations', label: 'Integrations & Hub', icon: 'hub' },
    { to: '/settings', label: 'Settings & Routing', icon: 'tune' },
  ];

  const adminNavigation: CompactNavigationItem[] = adminNav.map((tab, index) => ({
    id: tab.to,
    label: tab.label,
    primary: index < 3,
    icon: <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>,
  }));
  const activeAdminPath = adminNav.find((tab) => tab.to === location.pathname)?.to ?? '/menu';

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col antialiased select-none">
      {/* Single Unified Admin Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-6 min-h-16 py-2 flex items-center justify-between shrink-0 shadow-xs gap-2 sticky top-0 z-30">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined filled text-[18px]">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm tracking-tight text-slate-950 uppercase">
                CulinaryOS Admin
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 hidden sm:inline">
                Back Office
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden md:block">The Golden Fork</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 flex justify-center">
          <CompactNavigation
            items={adminNavigation}
            activeId={activeAdminPath}
            onSelect={navigate}
            label="Admin sections"
          />
        </div>

        {/* Right: App Switcher & Server Status */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <CulinaryAppLauncher activeApp="admin" />

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Connected</span>
          </div>
        </div>
      </header>
      {/* Main Workspace Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        <Routes>
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/tools" element={<ToolsPage />} />
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
