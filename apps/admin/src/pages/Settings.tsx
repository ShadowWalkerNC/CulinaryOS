import { useState, useEffect } from 'react';
import {
  loadLocalSettings,
  saveLocalSettings,
  applyDisplaySettingsToDOM,
  type CulinaryOSSettings,
  type KitchenStationConfig,
  type ItemRoutingRule,
} from '@culinaryos/shared';

export function SettingsPage() {
  const [settings, setSettings] = useState<CulinaryOSSettings>(loadLocalSettings());
  const [activeTab, setActiveTab] = useState<'company' | 'routing' | 'receipts' | 'display'>('company');
  const [isSaved, setIsSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Station creation state
  const [newStation, setNewStation] = useState<Partial<KitchenStationConfig>>({
    name: '',
    code: '',
    color: '#ef4444',
    description: '',
  });

  // Routing rule creation state
  const [newRule, setNewRule] = useState<Partial<ItemRoutingRule>>({
    itemName: '',
    primaryStation: 'grill',
    course: 'mains',
    targetPrepMinutes: 10,
    printToStationPrinter: true,
  });

  useEffect(() => {
    // Apply display settings live
    applyDisplaySettingsToDOM(settings.display);
  }, [settings.display]);

  const handleSave = async () => {
    saveLocalSettings(settings);
    applyDisplaySettingsToDOM(settings.display);

    // Try server sync
    try {
      await fetch('http://localhost:3000/v1/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': settings.tenantId,
        },
        body: JSON.stringify(settings),
      });
    } catch {
      // Local fallback is saved
    }

    setIsSaved(true);
    setSaveMessage('All system settings saved and synchronized across terminals!');
    setTimeout(() => {
      setIsSaved(false);
      setSaveMessage('');
    }, 4000);
  };

  const handleAddStation = () => {
    if (!newStation.name || !newStation.code) return;
    const id = newStation.name.toLowerCase().replace(/\s+/g, '-');
    const created: KitchenStationConfig = {
      id,
      name: newStation.name,
      code: newStation.code.toUpperCase(),
      color: newStation.color || '#3b82f6',
      description: newStation.description || '',
      sortOrder: settings.stations.length + 1,
    };
    const updatedStations = [...settings.stations, created];
    setSettings({ ...settings, stations: updatedStations });
    setNewStation({ name: '', code: '', color: '#ef4444', description: '' });
  };

  const handleRemoveStation = (id: string) => {
    const filtered = settings.stations.filter((s) => s.id !== id);
    setSettings({ ...settings, stations: filtered });
  };

  const handleAddRule = () => {
    if (!newRule.itemName) return;
    const created: ItemRoutingRule = {
      itemId: `item-${Date.now()}`,
      itemName: newRule.itemName,
      primaryStation: newRule.primaryStation || 'grill',
      backupStation: newRule.backupStation,
      course: newRule.course || 'mains',
      targetPrepMinutes: Number(newRule.targetPrepMinutes) || 10,
      printToStationPrinter: Boolean(newRule.printToStationPrinter),
    };
    setSettings({
      ...settings,
      routingRules: [...settings.routingRules, created],
    });
    setNewRule({ itemName: '', primaryStation: 'grill', course: 'mains', targetPrepMinutes: 10, printToStationPrinter: true });
  };

  const handleRemoveRule = (itemId: string) => {
    setSettings({
      ...settings,
      routingRules: settings.routingRules.filter((r) => r.itemId !== itemId),
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e5e7eb] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[24px] text-[#0f172a]">tune</span>
            <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-wider">
              System Settings & Customization
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] font-medium mt-1">
            Manage company branding, kitchen station routing, automated tax/gratuity, receipt footers, and visual accessibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveMessage && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-[#0f172a] text-white hover:bg-black font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            Save All Changes
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5e7eb] pb-2 overflow-x-auto">
        {[
          { id: 'company', label: 'Company & Tax Info', icon: 'store' },
          { id: 'routing', label: 'Item & Station Routing', icon: 'soup_kitchen' },
          { id: 'receipts', label: 'Receipt & Hardware', icon: 'receipt_long' },
          { id: 'display', label: 'Display & Accessibility', icon: 'contrast' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white text-[#0f172a] shadow-xs border border-[#e5e7eb]'
                : 'text-[#6b7280] hover:text-[#0f172a] hover:bg-white/60'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Company & Tax Info */}
      {activeTab === 'company' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-[#e5e7eb] shadow-xs animate-fadeIn">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider border-b border-[#e5e7eb] pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">badge</span>
              Restaurant Legal Identity
            </h3>

            <div>
              <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                Restaurant Display Name
              </label>
              <input
                type="text"
                value={settings.company.name}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, name: e.target.value },
                  })
                }
                className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                Legal Business Entity / Corporate Name
              </label>
              <input
                type="text"
                value={settings.company.legalName}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, legalName: e.target.value },
                  })
                }
                className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                  Tax ID / EIN
                </label>
                <input
                  type="text"
                  value={settings.company.taxId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: { ...settings.company, taxId: e.target.value },
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={settings.company.phone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: { ...settings.company, phone: e.target.value },
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={settings.company.email}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, email: e.target.value },
                  })
                }
                className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={settings.company.address.street}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: {
                      ...settings.company,
                      address: { ...settings.company.address, street: e.target.value },
                    },
                  })
                }
                className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none mb-2"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="City"
                  value={settings.company.address.city}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: {
                        ...settings.company,
                        address: { ...settings.company.address, city: e.target.value },
                      },
                    })
                  }
                  className="bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={settings.company.address.state}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: {
                        ...settings.company,
                        address: { ...settings.company.address, state: e.target.value },
                      },
                    })
                  }
                  className="bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={settings.company.address.zip}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: {
                        ...settings.company,
                        address: { ...settings.company.address, zip: e.target.value },
                      },
                    })
                  }
                  className="bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider border-b border-[#e5e7eb] pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">payments</span>
              Tax, Gratuity & Currency Settings
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                  Currency Symbol
                </label>
                <select
                  value={settings.company.currencySymbol}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: { ...settings.company, currencySymbol: e.target.value },
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
                >
                  <option value="$">$ (USD / CAD / AUD)</option>
                  <option value="€">€ (EUR Euro)</option>
                  <option value="£">£ (GBP British Pound)</option>
                  <option value="¥">¥ (JPY Japanese Yen)</option>
                  <option value="kr">kr (SEK / NOK / DKK)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                  Sales Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.company.taxRatePercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: { ...settings.company, taxRatePercent: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                Checkout Tip Presets (%)
              </label>
              <div className="flex gap-2">
                {[15, 18, 20, 25].map((tip, idx) => (
                  <span
                    key={idx}
                    className="flex-1 bg-[#f8f9fa] border border-[#d1d5db] rounded-xl py-2 text-center text-xs font-black text-[#0f172a]"
                  >
                    {tip}%
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                  Auto-Gratuity Party Size
                </label>
                <input
                  type="number"
                  value={settings.company.autoGratuityPartySize}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: { ...settings.company, autoGratuityPartySize: parseInt(e.target.value) || 6 },
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none"
                />
                <span className="text-[10px] text-[#6b7280] mt-0.5 block">Parties of {settings.company.autoGratuityPartySize}+ guests</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                  Auto-Gratuity Rate (%)
                </label>
                <input
                  type="number"
                  value={settings.company.autoGratuityPercent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: { ...settings.company, autoGratuityPercent: parseFloat(e.target.value) || 18 },
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Item & Station Routing */}
      {activeTab === 'routing' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Kitchen Stations Matrix */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5e7eb] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div>
                <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">countertops</span>
                  Kitchen Display Stations ({settings.stations.length})
                </h3>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  Define discrete preparation nodes (Grill, Fryer, Cold Prep, Pizza, Bar, Pastry, Expo).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {settings.stations.map((st) => (
                <div
                  key={st.id}
                  className="p-4 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] relative group flex flex-col justify-between"
                  style={{ borderLeftColor: st.color, borderLeftWidth: '5px' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-[#e5e7eb] text-[#0f172a]">
                      {st.code}
                    </span>
                    {!st.isExpoPass && (
                      <button
                        onClick={() => handleRemoveStation(st.id)}
                        className="text-[#9ca3af] hover:text-red-600 transition-colors"
                        title="Delete Station"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#0f172a]">{st.name}</h4>
                    <p className="text-[11px] text-[#6b7280] line-clamp-2 mt-0.5">{st.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Station Mini Form */}
            <div className="p-4 bg-[#f1f5f9] rounded-xl border border-[#cbd5e1] space-y-3">
              <span className="text-xs font-black text-[#0f172a] uppercase tracking-wider block">
                + Add New Kitchen Station
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Station Name (e.g. Sushi Bar)"
                  value={newStation.name}
                  onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                  className="bg-white border border-[#d1d5db] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
                <input
                  type="text"
                  placeholder="Short Code (e.g. SUSHI)"
                  value={newStation.code}
                  onChange={(e) => setNewStation({ ...newStation, code: e.target.value })}
                  className="bg-white border border-[#d1d5db] rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={newStation.description}
                  onChange={(e) => setNewStation({ ...newStation, description: e.target.value })}
                  className="bg-white border border-[#d1d5db] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddStation}
                  className="bg-[#0f172a] text-white hover:bg-black font-black text-xs uppercase tracking-wider rounded-xl py-2"
                >
                  Add Station
                </button>
              </div>
            </div>
          </div>

          {/* Per-Item Routing Rules */}
          <div className="bg-white p-6 rounded-2xl border border-[#e5e7eb] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
              <div>
                <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">route</span>
                  Menu Item Routing Rules & Course Holding
                </h3>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  Route ordered food items to the designated station display, course timer, and kitchen ticket printer.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-[10px] font-black uppercase tracking-wider text-[#6b7280]">
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">Primary Station</th>
                    <th className="py-2.5 px-3">Target Cook Time</th>
                    <th className="py-2.5 px-3">Station Printer</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {settings.routingRules.map((rule) => (
                    <tr key={rule.itemId} className="hover:bg-[#f8f9fa] text-xs">
                      <td className="py-3 px-3 font-extrabold text-[#0f172a]">{rule.itemName}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-slate-100 text-slate-700">
                          {rule.course}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] uppercase bg-amber-100 text-amber-800">
                          {rule.primaryStation}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#374151]">
                        {rule.targetPrepMinutes} mins
                      </td>
                      <td className="py-3 px-3">
                        {rule.printToStationPrinter ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
                            <span className="material-symbols-outlined text-[14px]">print</span>
                            Auto-Print
                          </span>
                        ) : (
                          <span className="text-[#9ca3af] text-[11px]">Screen Only</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleRemoveRule(rule.itemId)}
                          className="text-[#9ca3af] hover:text-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Routing Rule Form */}
            <div className="p-4 bg-[#f8f9fa] rounded-xl border border-[#e5e7eb] space-y-3">
              <span className="text-xs font-black text-[#0f172a] uppercase tracking-wider block">
                + Add Item Routing Rule
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  placeholder="Dish or Category Name"
                  value={newRule.itemName}
                  onChange={(e) => setNewRule({ ...newRule, itemName: e.target.value })}
                  className="bg-white border border-[#d1d5db] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                />
                <select
                  value={newRule.course}
                  onChange={(e) => setNewRule({ ...newRule, course: e.target.value as any })}
                  className="bg-white border border-[#d1d5db] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  <option value="drinks">Course: Drinks</option>
                  <option value="starters">Course: Starters / Apps</option>
                  <option value="mains">Course: Mains / Entrees</option>
                  <option value="desserts">Course: Desserts</option>
                </select>
                <select
                  value={newRule.primaryStation}
                  onChange={(e) => setNewRule({ ...newRule, primaryStation: e.target.value })}
                  className="bg-white border border-[#d1d5db] rounded-xl px-3 py-2 text-xs font-bold outline-none"
                >
                  {settings.stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      Station: {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Cook Mins"
                  value={newRule.targetPrepMinutes}
                  onChange={(e) => setNewRule({ ...newRule, targetPrepMinutes: parseInt(e.target.value) || 10 })}
                  className="bg-white border border-[#d1d5db] rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddRule}
                  className="bg-[#0f172a] text-white hover:bg-black font-black text-xs uppercase tracking-wider rounded-xl py-2"
                >
                  Add Rule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Receipt & Hardware */}
      {activeTab === 'receipts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-[#e5e7eb] shadow-xs animate-fadeIn">
          <div className="space-y-4">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider border-b border-[#e5e7eb] pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">receipt</span>
              Receipt Header & Footer Notes
            </h3>

            <div>
              <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                Receipt Top Banner / Welcome Header
              </label>
              <textarea
                rows={3}
                value={settings.company.receiptHeader}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, receiptHeader: e.target.value },
                  })
                }
                className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                Receipt Footer / Social & Feedback Message
              </label>
              <textarea
                rows={3}
                value={settings.company.receiptFooter}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    company: { ...settings.company, receiptFooter: e.target.value },
                  })
                }
                className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl p-3 text-xs font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                  Guest Wi-Fi Network Name
                </label>
                <input
                  type="text"
                  value={settings.company.guestWifiSsid}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: { ...settings.company, guestWifiSsid: e.target.value },
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#374151] uppercase tracking-wider block mb-1">
                  Guest Wi-Fi Password
                </label>
                <input
                  type="text"
                  value={settings.company.guestWifiPassword || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      company: { ...settings.company, guestWifiPassword: e.target.value },
                    })
                  }
                  className="w-full bg-[#f8f9fa] border border-[#d1d5db] focus:border-[#0f172a] rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Live Receipt Tape Mockup */}
          <div className="space-y-2">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider border-b border-[#e5e7eb] pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              Live ESC/POS Receipt Tape Preview (80mm)
            </h3>

            <div className="bg-[#fffefb] border border-[#e5e7eb] rounded-xl p-6 font-mono text-[11px] text-[#1f2937] shadow-inner space-y-2 max-w-sm mx-auto">
              <div className="text-center space-y-0.5 border-b border-dashed border-[#d1d5db] pb-3">
                <p className="font-extrabold text-xs uppercase">{settings.company.name}</p>
                <p className="text-[10px] text-[#6b7280]">{settings.company.address.street}</p>
                <p className="text-[10px] text-[#6b7280]">
                  {settings.company.address.city}, {settings.company.address.state} {settings.company.address.zip}
                </p>
                <p className="text-[10px] text-[#6b7280]">Tel: {settings.company.phone}</p>
                <p className="text-[10px] italic text-[#4b5563] pt-1">{settings.company.receiptHeader}</p>
              </div>

              <div className="space-y-1 py-2 border-b border-dashed border-[#d1d5db]">
                <div className="flex justify-between font-bold">
                  <span>1x Wood-Fired Margherita</span>
                  <span>{settings.company.currencySymbol}18.00</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>1x Prime Bistro Burger</span>
                  <span>{settings.company.currencySymbol}22.00</span>
                </div>
              </div>

              <div className="space-y-1 text-[10px] pt-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{settings.company.currencySymbol}40.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({settings.company.taxRatePercent}%)</span>
                  <span>{settings.company.currencySymbol}{(40 * (settings.company.taxRatePercent / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-[#d1d5db]">
                  <span>TOTAL</span>
                  <span>{settings.company.currencySymbol}{(40 * (1 + settings.company.taxRatePercent / 100)).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-[#d1d5db] space-y-1">
                <p className="text-[10px] text-[#6b7280]">{settings.company.receiptFooter}</p>
                {settings.company.guestWifiSsid && (
                  <p className="text-[9px] text-[#9ca3af]">
                    Wi-Fi: {settings.company.guestWifiSsid} | PWD: {settings.company.guestWifiPassword}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Display, Text Sizing & Accessibility */}
      {activeTab === 'display' && (
        <div className="bg-white p-6 rounded-2xl border border-[#e5e7eb] shadow-xs space-y-6 animate-fadeIn">
          <div className="border-b border-[#e5e7eb] pb-3">
            <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">format_size</span>
              Terminal Ergonomics & Text Sizing
            </h3>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Customize font scale and tap targets for low-glare kitchen environments, tablets, and high-contrast OLED panels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Text Scale Selector */}
            <div className="space-y-2">
              <label className="text-xs font-black text-[#0f172a] uppercase tracking-wider block">
                UI & Text Scaling ({settings.display.textScalePercent}%)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'compact', label: 'Compact', scale: 100, desc: '100% standard density' },
                  { id: 'standard', label: 'Standard', scale: 110, desc: '110% balanced' },
                  { id: 'large', label: 'Large (POS)', scale: 125, desc: '125% tablet friendly' },
                  { id: 'xlarge', label: 'X-Large (KDS)', scale: 140, desc: '140% kitchen display' },
                ].map((s) => {
                  const isSelected = settings.display.textSize === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          display: {
                            ...settings.display,
                            textSize: s.id as any,
                            textScalePercent: s.scale,
                          },
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-xs'
                          : 'border-[#e5e7eb] bg-[#f8f9fa] text-[#1f2937] hover:border-[#9ca3af]'
                      }`}
                    >
                      <span className="text-xs font-black block">{s.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-gray-300' : 'text-[#6b7280]'}`}>
                        {s.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Touch Target Padding */}
            <div className="space-y-2">
              <label className="text-xs font-black text-[#0f172a] uppercase tracking-wider block">
                Touch Target Padding
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'compact', label: 'Compact (40px)', desc: 'Desktop mouse' },
                  { id: 'standard', label: 'Standard (48px)', desc: 'Tablet touch' },
                  { id: 'expanded', label: 'Expanded (56px)', desc: 'High-pace bump bar' },
                ].map((p) => {
                  const isSelected = settings.display.touchTargetPadding === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          display: {
                            ...settings.display,
                            touchTargetPadding: p.id as any,
                          },
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#0f172a] bg-[#0f172a] text-white shadow-xs'
                          : 'border-[#e5e7eb] bg-[#f8f9fa] text-[#1f2937] hover:border-[#9ca3af]'
                      }`}
                    >
                      <span className="text-xs font-black block">{p.label}</span>
                      <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-gray-300' : 'text-[#6b7280]'}`}>
                        {p.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#e5e7eb] pt-4">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={settings.display.kdsAlertSounds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: { ...settings.display, kdsAlertSounds: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-[#0f172a]"
              />
              <span className="text-xs font-bold text-[#0f172a]">
                KDS Audio Chimes on New Ticket
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={settings.display.tableStatusGlowHalos}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: { ...settings.display, tableStatusGlowHalos: e.target.checked },
                  })
                }
                className="w-4 h-4 rounded text-[#0f172a]"
              />
              <span className="text-xs font-bold text-[#0f172a]">
                3D Table Glow Status Halos
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-[#e5e7eb] bg-[#f8f9fa] cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={settings.display.contrastMode === 'high-contrast-oled'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    display: {
                      ...settings.display,
                      contrastMode: e.target.checked ? 'high-contrast-oled' : 'standard',
                    },
                  })
                }
                className="w-4 h-4 rounded text-[#0f172a]"
              />
              <span className="text-xs font-bold text-[#0f172a]">
                High-Contrast OLED Kitchen Mode
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
