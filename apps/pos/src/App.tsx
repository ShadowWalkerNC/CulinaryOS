import { usePOSStore } from './lib/store';
import { TablesView }   from './views/TablesView';
import { OrderView }    from './views/OrderView';
import { MenuView }     from './views/MenuView';
import { CheckoutView } from './views/CheckoutView';
import { ConnectionStatus } from './components/ConnectionStatus';

export function App() {
  const { view, setView, activeOrderId, setActiveOrder } = usePOSStore();

  return (
    <div className="h-screen w-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-[#e5e7eb] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-tight text-[#1f2937] uppercase">SquareOS Terminal</span>
          </div>
          <span className="text-[#6b7280] text-[10px] font-bold px-2 py-0.5 bg-[#f3f4f6] rounded uppercase">Terminal 01</span>
        </div>

        {/* Quick Nav Options */}
        <div className="flex gap-1.5">
          <button onClick={() => { setView('tables'); setActiveOrder(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              view === 'tables' && !activeOrderId ? 'bg-[#ff5f1f] text-white' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#1f2937]'
            }`}>
            TABLES
          </button>
          {activeOrderId && (
            <>
              <button onClick={() => setView('menu')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  view === 'menu' ? 'bg-[#ff5f1f] text-white' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#1f2937]'
                }`}>
                MENU
              </button>
              <button onClick={() => setView('checkout')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  view === 'checkout' ? 'bg-[#ff5f1f] text-white' : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb] hover:text-[#1f2937]'
                }`}>
                CHECKOUT
              </button>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <ConnectionStatus />
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Persistent Receipt/Ticket Panel */}
        {activeOrderId && (
          <div className="w-80 border-r border-[#e5e7eb] bg-white flex flex-col h-full shrink-0">
            <OrderView />
          </div>
        )}

        {/* Right Side: Interactive Action Area */}
        <div className="flex-1 h-full overflow-hidden bg-[#f8f9fa]">
          {activeOrderId ? (
            <>
              {view === 'menu' && <MenuView />}
              {view === 'checkout' && <CheckoutView />}
              {view === 'tables' && <TablesView />}
            </>
          ) : (
            <TablesView />
          )}
        </div>
      </div>
    </div>
  );
}
