import { useState } from 'react';
import { usePOSStore } from '../lib/store';
import { useCreateOrder, useOpenOrders } from '../lib/queries';

export function DashboardView() {
  const { employee, setEmployee, setView, setActiveOrder, drawerBalance, setDrawerBalance } = usePOSStore();
  const { mutate: createOrder } = useCreateOrder();
  const { data: openOrders = [] } = useOpenOrders();

  // Cash Declaration Modal States
  const [showDeclare, setShowDeclare] = useState(false);
  const [bills1, setBills1] = useState(0);
  const [bills5, setBills5] = useState(0);
  const [bills10, setBills10] = useState(0);
  const [bills20, setBills20] = useState(0);

  function startQuickOrder() {
    createOrder(
      { table_number: undefined, cover_count: 1, server_name: employee?.name ?? 'Server' },
      { onSuccess: (o: any) => { setActiveOrder(o.id); setView('menu'); } }
    );
  }

  // Calculate Declared Cash
  const declaredTotal = (bills1 * 1) + (bills5 * 5) + (bills10 * 10) + (bills20 * 20);
  const expectedTotal = drawerBalance / 100; // in dollars
  const discrepancy = declaredTotal - expectedTotal;

  function handleSaveDeclaration() {
    setDrawerBalance(declaredTotal * 100); // sync back in cents
    setShowDeclare(false);
    alert(`Declaration saved. Drawer is currently $${Math.abs(discrepancy).toFixed(2)} ${discrepancy >= 0 ? 'OVER' : 'SHORT'}.`);
  }

  return (
    <div className="flex h-full bg-[#f8f9fa] p-6 gap-6 animate-fadeIn relative">
      {/* Left Sidebar: Session Info */}
      <div className="w-80 bg-white border border-[#e5e7eb] rounded-2xl p-5 flex flex-col justify-between shadow-sm shrink-0">
        <div className="space-y-4">
          <div className="border-b border-[#e5e7eb] pb-4">
            <span className="text-[10px] text-[#6b7280] font-black uppercase tracking-wider block">Logged In Staff</span>
            <h2 className="text-base font-black text-[#1f2937] mt-1">{employee?.name}</h2>
            <p className="text-xs text-[#ff5f1f] font-bold mt-0.5">{employee?.role}</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#6b7280]">Clock In Time</span>
              <span className="font-mono text-[#1f2937] font-semibold">{employee?.clockedInAt}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#6b7280]">Expected Cash Drawer</span>
              <span className="font-mono text-[#1f2937] font-semibold">${expectedTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-6 border-t border-[#e5e7eb]">
          <button onClick={() => setShowDeclare(true)}
            className="w-full bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-bold py-2.5 rounded-xl text-xs uppercase transition-colors border border-[#e5e7eb]">
            Declare Cash Drawer
          </button>
          <button onClick={() => setEmployee(null)}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-xs uppercase transition-colors">
            Lock Screen
          </button>
        </div>
      </div>

      {/* Right Area: Mode Selection Grid */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-4 flex-1">
          {/* Quick Order */}
          <button onClick={startQuickOrder}
            className="bg-white hover:border-[#ff5f1f] border border-[#e5e7eb] rounded-2xl p-6 text-left flex flex-col justify-between transition-all shadow-sm active:scale-98">
            <div className="space-y-2">
              <span className="text-xs font-black text-[#ff5f1f] uppercase tracking-wider">Quick Service</span>
              <h3 className="text-lg font-black text-[#1f2937]">Quick Order</h3>
              <p className="text-xs text-[#6b7280] leading-relaxed">Start an instant counter ticket or takeaway check without table assignments.</p>
            </div>
            <span className="text-xs font-extrabold text-[#ff5f1f] uppercase tracking-wider mt-4">Start Quick Order →</span>
          </button>

          {/* Table Service */}
          <button onClick={() => setView('tables')}
            className="bg-white hover:border-[#ff5f1f] border border-[#e5e7eb] rounded-2xl p-6 text-left flex flex-col justify-between transition-all shadow-sm active:scale-98">
            <div className="space-y-2">
              <span className="text-xs font-black text-[#ff5f1f] uppercase tracking-wider">FOH / Dining</span>
              <h3 className="text-lg font-black text-[#1f2937]">Table Service</h3>
              <p className="text-xs text-[#6b7280] leading-relaxed">Manage restaurant dining tables, active covers, and courses via dining floor grid map.</p>
            </div>
            <span className="text-xs font-extrabold text-[#ff5f1f] uppercase tracking-wider mt-4">Open Floor Map →</span>
          </button>

          {/* Bar Tabs */}
          <button onClick={() => setView('tabs')}
            className="bg-white hover:border-[#ff5f1f] border border-[#e5e7eb] rounded-2xl p-6 text-left flex flex-col justify-between transition-all shadow-sm active:scale-98">
            <div className="space-y-2">
              <span className="text-xs font-black text-[#ff5f1f] uppercase tracking-wider">Pub / Lounge</span>
              <h3 className="text-lg font-black text-[#1f2937]">Bar Tabs</h3>
              <p className="text-xs text-[#6b7280] leading-relaxed">List active bar cards, pre-authorize checkout limits, and manage bar tabs.</p>
            </div>
            <span className="text-xs font-extrabold text-[#ff5f1f] uppercase tracking-wider mt-4">Manage Tabs →</span>
          </button>

          {/* Recall Checks */}
          <button onClick={() => setView('recall')}
            className="bg-white hover:border-[#ff5f1f] border border-[#e5e7eb] rounded-2xl p-6 text-left flex flex-col justify-between transition-all shadow-sm active:scale-98">
            <div className="space-y-2">
              <span className="text-xs font-black text-[#ff5f1f] uppercase tracking-wider">Audit / History</span>
              <h3 className="text-lg font-black text-[#1f2937]">Recall Checks</h3>
              <p className="text-xs text-[#6b7280] leading-relaxed">Retrieve previously completed checks, handle partial refunds, or reprint guest receipts.</p>
            </div>
            <span className="text-xs font-extrabold text-[#ff5f1f] uppercase tracking-wider mt-4">Search History →</span>
          </button>
        </div>

        {/* Bottom Panel */}
        <div className="mt-4 flex gap-4">
          <button onClick={() => setView('settings')}
            className="flex-1 bg-white border border-[#e5e7eb] rounded-xl py-4 text-xs font-bold text-[#1f2937] hover:border-[#ff5f1f] text-center transition-colors shadow-sm">
            Device Setup (Stripe Readers / Printers)
          </button>
        </div>
      </div>

      {/* Cash Drawer Declaration Modal Overlay */}
      {showDeclare && (
        <div className="absolute inset-0 bg-[#00000040] backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-6">
            <div>
              <span className="text-[10px] text-[#ff5f1f] font-black tracking-wider uppercase block">Auditing & Declaration</span>
              <h3 className="text-base font-black text-[#1f2937] mt-0.5 uppercase">Declare Cash Drawer</h3>
              <p className="text-[10px] text-[#6b7280] mt-1">Input counts of physical bills inside the terminal register.</p>
            </div>

            {/* Bill Inputs list */}
            <div className="space-y-3.5 border-t border-b border-[#e5e7eb] py-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#4b5563]">$1.00 Bills</span>
                <input type="number" min="0" value={bills1} onChange={(e) => setBills1(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-20 bg-[#f9fafb] border border-[#cbd5e1] rounded-lg p-1.5 text-center font-mono font-bold text-xs" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#4b5563]">$5.00 Bills</span>
                <input type="number" min="0" value={bills5} onChange={(e) => setBills5(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-20 bg-[#f9fafb] border border-[#cbd5e1] rounded-lg p-1.5 text-center font-mono font-bold text-xs" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#4b5563]">$10.00 Bills</span>
                <input type="number" min="0" value={bills10} onChange={(e) => setBills10(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-20 bg-[#f9fafb] border border-[#cbd5e1] rounded-lg p-1.5 text-center font-mono font-bold text-xs" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#4b5563]">$20.00 Bills</span>
                <input type="number" min="0" value={bills20} onChange={(e) => setBills20(Math.max(0, parseInt(e.target.value || '0', 10)))}
                  className="w-20 bg-[#f9fafb] border border-[#cbd5e1] rounded-lg p-1.5 text-center font-mono font-bold text-xs" />
              </div>
            </div>

            {/* Reconciliation summary */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#6b7280]">
                <span>Declared Cash Total</span>
                <span className="font-mono text-[#1f2937] font-extrabold">${declaredTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#6b7280]">
                <span>Expected Drawer Total</span>
                <span className="font-mono text-[#1f2937] font-semibold">${expectedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-[#e5e7eb] pt-2">
                <span className="font-black text-[#1f2937] uppercase">Drawer Discrepancy</span>
                <span className={`font-mono font-extrabold ${discrepancy === 0 ? 'text-[#22c55e]' : discrepancy > 0 ? 'text-[#ff5f1f]' : 'text-red-500'}`}>
                  {discrepancy === 0 ? 'Balanced' : `${discrepancy > 0 ? 'Over' : 'Short'} $${Math.abs(discrepancy).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => setShowDeclare(false)}
                className="flex-1 bg-[#f3f4f6] text-[#6b7280] rounded-xl py-2.5 text-xs font-black uppercase">Cancel</button>
              <button onClick={handleSaveDeclaration}
                className="flex-1 bg-[#ff5f1f] text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider shadow-sm">Save Audit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DashboardView;
