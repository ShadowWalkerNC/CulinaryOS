import { usePOSStore } from './lib/store';
import { TablesView }   from './views/TablesView';
import { OrderView }    from './views/OrderView';
import { MenuView }     from './views/MenuView';
import { CheckoutView } from './views/CheckoutView';
import { ConnectionStatus } from './components/ConnectionStatus';

export function App() {
  const view = usePOSStore((s) => s.view);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 bg-[#111111] border-b border-[#222222]">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg tracking-tight">POS</span>
          <span className="text-[#444444] text-sm">CulinaryOS</span>
        </div>
        <nav className="flex gap-1">
          {(['tables','order','menu','checkout'] as const).map((v) => (
            <button key={v} onClick={() => usePOSStore.getState().setView(v)}
              className={`px-3 py-1.5 rounded text-xs font-bold tracking-wide transition-colors ${
                view === v ? 'bg-green-600 text-white' : 'text-[#888888] hover:text-white'
              }`}>
              {v.toUpperCase()}
            </button>
          ))}
        </nav>
        <ConnectionStatus />
      </header>
      <main className="flex-1 overflow-auto">
        {view === 'tables'   && <TablesView />}
        {view === 'order'    && <OrderView />}
        {view === 'menu'     && <MenuView />}
        {view === 'checkout' && <CheckoutView />}
      </main>
    </div>
  );
}
