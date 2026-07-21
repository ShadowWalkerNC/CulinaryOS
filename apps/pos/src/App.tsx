import { usePOSStore } from './lib/store';
import { TablesView }   from './views/TablesView';
import { OrderView }    from './views/OrderView';
import { MenuView }     from './views/MenuView';
import { CheckoutView } from './views/CheckoutView';
import { DashboardView } from './views/DashboardView';
import { StaffView }     from './views/StaffView';
import { RecallView }    from './views/RecallView';
import { SettingsView }  from './views/SettingsView';
import { TabsView }      from './views/TabsView';
import { ReportsView }   from './views/ReportsView';
import { ConnectionStatus } from './components/ConnectionStatus';

export function App() {
  const { view, setView, activeOrderId, setActiveOrder, employee, setEmployee } = usePOSStore();

  // 1. Force Lock Screen if no employee session is active
  if (!employee) {
    return <StaffView />;
  }

  return (
    <div className="h-screen w-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col overflow-hidden animate-fadeIn">
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-[#e5e7eb] shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 hover:opacity-85 text-left">
            <span className="font-black text-sm tracking-tight text-[#1f2937] uppercase">SquareOS Terminal</span>
          </button>
          <span className="text-[#6b7280] text-[10px] font-bold px-2 py-0.5 bg-[#f3f4f6] rounded uppercase">
            Server: {employee.name} ({employee.role})
          </span>
        </div>

        {/* Quick Nav Header Controls */}
        <div className="flex gap-1.5">
          <button onClick={() => setView('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              view === 'dashboard' ? 'bg-[#ff5f1f] text-white font-black' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
            }`}>
            HOME
          </button>
          <button onClick={() => { setView('tables'); setActiveOrder(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              view === 'tables' && !activeOrderId ? 'bg-[#ff5f1f] text-white font-black' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
            }`}>
            FLOOR MAP
          </button>
          {activeOrderId && (
            <>
              <button onClick={() => setView('menu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  view === 'menu' ? 'bg-[#ff5f1f] text-white font-black' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                }`}>
                TICKET MENU
              </button>
              <button onClick={() => setView('checkout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  view === 'checkout' ? 'bg-[#ff5f1f] text-white font-black' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                }`}>
                PAY
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <ConnectionStatus />
          <button onClick={() => setEmployee(null)}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1 rounded text-[10px] uppercase">
            LOCK
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Persistent Receipt Panel (Only visible in Ticket Views: Menu, Checkout, Floor Map with Active Order) */}
        {activeOrderId && (view === 'menu' || view === 'checkout') && (
          <div className="w-80 border-r border-[#e5e7eb] bg-white flex flex-col h-full shrink-0">
            <OrderView />
          </div>
        )}

        {/* Right Side: Active Workspace panel */}
        <div className="flex-1 h-full overflow-hidden bg-[#f8f9fa]">
          {view === 'dashboard' && <DashboardView />}
          {view === 'tables' && <TablesView />}
          {view === 'menu' && <MenuView />}
          {view === 'checkout' && <CheckoutView />}
          {view === 'tabs' && <TabsView />}
          {view === 'recall' && <RecallView />}
          {view === 'settings' && <SettingsView />}
          {view === 'reports' && <ReportsView />}
        </div>
      </div>
    </div>
  );
}
export default App;
