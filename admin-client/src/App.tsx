import { useState } from 'react';
import { OverviewPage }    from './pages/OverviewPage';
import { PantryPage }      from './pages/PantryPage';
import { EventLogPage }    from './pages/EventLogPage';
import { OrderHistoryPage }from './pages/OrderHistoryPage';
import { AlertToasts }     from './components/AlertToasts';
import { useLiveAlerts }   from './lib/realtime';

type Page = 'overview' | 'pantry' | 'events' | 'orders';

const NAV: { key: Page; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview',      icon: '📊' },
  { key: 'pantry',   label: 'Pantry',        icon: '🧄' },
  { key: 'events',   label: 'Event Log',     icon: '📜' },
  { key: 'orders',   label: 'Order History', icon: '🯓' },
];

export function App() {
  const [page, setPage] = useState<Page>('overview');
  const { alerts, dismiss } = useLiveAlerts();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0f0f0f] border-r border-[#1a1a1a] flex flex-col">
        <div className="px-5 py-5 border-b border-[#1a1a1a]">
          <p className="text-white font-bold text-base">CulinaryOS</p>
          <p className="text-[#555555] text-xs mt-0.5">Admin</p>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map((n) => (
            <button key={n.key} onClick={() => setPage(n.key)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                page === n.key
                  ? 'bg-[#1a1a1a] text-white font-semibold'
                  : 'text-[#666666] hover:text-white hover:bg-[#161616]'
              }`}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
              {n.key === 'pantry' && alerts.filter((a) => a.type !== 'event_error').length > 0 && (
                <span className="ml-auto text-xs bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                  {alerts.filter((a) => a.type !== 'event_error').length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-[#1a1a1a]">
          <p className="text-[#333333] text-xs">v1.0.0</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {page === 'overview' && <OverviewPage />}
        {page === 'pantry'   && <PantryPage />}
        {page === 'events'   && <EventLogPage />}
        {page === 'orders'   && <OrderHistoryPage />}
      </main>

      {/* Live alert toasts */}
      <AlertToasts alerts={alerts} dismiss={dismiss} />
    </div>
  );
}
