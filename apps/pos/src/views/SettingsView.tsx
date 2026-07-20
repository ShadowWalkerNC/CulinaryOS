import { useState } from 'react';
import { usePOSStore } from '../lib/store';

export function SettingsView() {
  const { setView } = usePOSStore();
  const [pairedReader, setPairedReader] = useState<string | null>('Counter WisePOS E');
  const [routingCold, setRoutingCold] = useState('cold-prep');
  const [routingHot, setRoutingHot] = useState('hot-grill');

  const READERS = ['Counter WisePOS E', 'Drive-Thru WisePOS E', 'Handheld BBPOS Chipper'];

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] animate-fadeIn p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e7eb]">
        <div>
          <h1 className="text-lg font-black text-[#1f2937] uppercase tracking-wider">Terminal Settings</h1>
          <p className="text-xs text-[#6b7280]">Configure card readers, KDS routing, and local network setups.</p>
        </div>
        <button onClick={() => setView('dashboard')}
          className="bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-black px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-colors shadow-sm">
          Exit Settings
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 overflow-y-auto">
        {/* Card Readers */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-4 shadow-sm h-fit">
          <div className="border-b border-[#e5e7eb] pb-3">
            <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">Stripe Card Readers</h2>
            <p className="text-[10px] text-[#6b7280] mt-0.5">Select a smart card reader to pair via local network.</p>
          </div>

          <div className="space-y-2">
            {READERS.map((r) => (
              <button key={r} onClick={() => setPairedReader(r)}
                className={`w-full text-left p-3.5 rounded-xl border flex justify-between items-center transition-colors ${
                  pairedReader === r
                    ? 'border-[#ff5f1f] bg-[#ff5f1f0a] text-[#ff5f1f] font-bold'
                    : 'border-[#e5e7eb] bg-white text-[#4b5563] hover:border-[#cbd5e1]'
                }`}>
                <span className="text-xs font-semibold">{r}</span>
                {pairedReader === r && <span className="text-[10px] font-black uppercase tracking-wider">[Paired]</span>}
              </button>
            ))}
          </div>
        </div>

        {/* KDS Routing */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-4 shadow-sm h-fit">
          <div className="border-b border-[#e5e7eb] pb-3">
            <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">KDS Item Routing</h2>
            <p className="text-[10px] text-[#6b7280] mt-0.5">Assign menu category items to specific kitchen screens.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] text-[#6b7280] font-black uppercase tracking-wider block">Starters & Cold Items</label>
              <select value={routingCold} onChange={(e) => setRoutingCold(e.target.value)}
                className="w-full bg-white border border-[#cbd5e1] rounded-xl p-2.5 text-xs text-[#1f2937] outline-none focus:border-[#ff5f1f]">
                <option value="cold-prep">Cold Prep Station (KDS 01)</option>
                <option value="fryer">Fryer Station (KDS 02)</option>
                <option value="main-pass">Main Pass (KDS 03)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-[#6b7280] font-black uppercase tracking-wider block">Mains & Hot Grill Items</label>
              <select value={routingHot} onChange={(e) => setRoutingHot(e.target.value)}
                className="w-full bg-white border border-[#cbd5e1] rounded-xl p-2.5 text-xs text-[#1f2937] outline-none focus:border-[#ff5f1f]">
                <option value="hot-grill">Grill Station (KDS 04)</option>
                <option value="pizza-oven">Pizza Oven (KDS 05)</option>
                <option value="main-pass">Main Pass (KDS 03)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
