import { usePOSStore } from './lib/store';
import { TablesView }   from './views/TablesView';
import { OrderView }    from './views/OrderView';
import { MenuView }     from './views/MenuView';
import { CheckoutView } from './views/CheckoutView';
import { ConnectionStatus } from './components/ConnectionStatus';

export function App() {
  const { view, setView, activeOrderId, setActiveOrder } = usePOSStore();

  return (
    <div className="h-screen w-screen bg-[#121214] text-[#e8eaf0] font-sans flex flex-col overflow-hidden">
      {/* Toast-style Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#1a1a1e] border-b border-[#28282e] shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#ff5f1f] text-lg">🍊</span>
            <span className="font-black text-sm tracking-tight text-white uppercase">ToastOS Terminal</span>
          </div>
          <span className="text-[#88888b] text-[10px] font-bold px-2 py-0.5 bg-[#28282e] rounded uppercase">Terminal 01</span>
        </div>

        {/* Quick Nav Options */}
        <div className="flex gap-1.5">
          <button onClick={() => { setView('tables'); setActiveOrder(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              view === 'tables' && !activeOrderId ? 'bg-[#ff5f1f] text-white' : 'bg-[#222226] text-[#88888b] hover:text-white'
            }`}>
            TABLES
          </button>
          {activeOrderId && (
            <>
              <button onClick={() => setView('menu')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  view === 'menu' ? 'bg-[#ff5f1f] text-white' : 'bg-[#222226] text-[#88888b] hover:text-white'
                }`}>
                MENU
              </button>
              <button onClick={() => setView('checkout')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  view === 'checkout' ? 'bg-[#ff5f1f] text-white' : 'bg-[#222226] text-[#88888b] hover:text-white'
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
          <div className="w-80 border-r border-[#28282e] bg-[#1a1a1e] flex flex-col h-full shrink-0">
            <OrderView />
          </div>
        )}

        {/* Right Side: Interactive Action Area */}
        <div className="flex-1 h-full overflow-hidden bg-[#121214]">
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
