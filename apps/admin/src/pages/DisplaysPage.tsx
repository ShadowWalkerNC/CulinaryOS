// ============================================================
// CulinaryOS Admin — Displays Hub & TV Remote Management
// Pair TVs with 6-digit code, monitor online health, switch views remotely
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tv,
  Plus,
  RefreshCw,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Radio,
  Sliders,
  Trash2,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import {
  apiHeaders,
  getApiBase,
  getTenantId,
  type DisplayDevice,
  type DisplayMode,
} from '@culinaryos/shared';

const API = getApiBase();
const TENANT_ID = getTenantId();

export function DisplaysPage() {
  const [displays, setDisplays] = useState<DisplayDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [assignedMode, setAssignedMode] = useState<DisplayMode>('kitchen');
  const [assignedView, setAssignedView] = useState<string>('all');
  const [brandChoice, setBrandChoice] = useState<'culinaryos' | 'cheezies'>('culinaryos');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);

  const fetchDisplays = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/v1/displays`, {
        headers: apiHeaders(TENANT_ID),
      });
      if (res.ok) {
        const json = await res.json();
        setDisplays(json.data || []);
      }
    } catch {
      // non-fatal fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisplays();
    const interval = setInterval(fetchDisplays, 10000);
    return () => clearInterval(interval);
  }, [fetchDisplays]);

  function notify(msg: string) {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  }

  // Pair new TV
  async function handlePairSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPairingError(null);

    const cleanCode = pairingCode.replace(/\s+/g, '');
    if (cleanCode.length < 6) {
      setPairingError('Please enter a valid 6-digit pairing code shown on the TV.');
      return;
    }

    try {
      const res = await fetch(`${API}/v1/displays/pair`, {
        method: 'POST',
        headers: apiHeaders(TENANT_ID),
        body: JSON.stringify({
          pairingCode: cleanCode,
          name: displayName || 'Kitchen Android TV',
          assignedMode,
          assignedView,
          configuration: {
            brand: brandChoice,
            stationId: assignedView,
            theme: brandChoice === 'cheezies' ? 'cheezies-gold' : 'kitchen-oled',
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setPairingError(json.error?.message || 'Pairing failed. Check code and retry.');
        return;
      }

      notify(`Display "${displayName || 'Android TV'}" successfully paired!`);
      setShowPairModal(false);
      setPairingCode('');
      setDisplayName('');
      fetchDisplays();
    } catch (err: any) {
      setPairingError(err.message || 'Network error during pairing');
    }
  }

  // Remotely switch view
  async function handleRemoteSwitch(id: string, newMode: DisplayMode, newView: string) {
    try {
      const res = await fetch(`${API}/v1/displays/${id}`, {
        method: 'PATCH',
        headers: apiHeaders(TENANT_ID),
        body: JSON.stringify({
          assignedMode: newMode,
          assignedView: newView,
          remoteCommand: {
            type: 'navigate',
            mode: newMode,
            view: newView,
          },
        }),
      });

      if (res.ok) {
        notify(`Remotely switched view to ${newMode.toUpperCase()} (${newView})`);
        fetchDisplays();
      }
    } catch {
      notify('Failed to send remote switch command');
    }
  }

  // Trigger remote refresh
  async function handleRemoteRefresh(id: string) {
    try {
      const res = await fetch(`${API}/v1/displays/${id}`, {
        method: 'PATCH',
        headers: apiHeaders(TENANT_ID),
        body: JSON.stringify({
          remoteCommand: {
            type: 'refresh',
          },
        }),
      });

      if (res.ok) {
        notify('Triggered remote display reload');
      }
    } catch {
      notify('Failed to send refresh signal');
    }
  }

  // Delete / unpair display
  async function handleUnpair(id: string) {
    if (!confirm('Unpair this display? It will return to the pairing screen.')) return;
    try {
      const res = await fetch(`${API}/v1/displays/${id}`, {
        method: 'DELETE',
        headers: apiHeaders(TENANT_ID),
      });
      if (res.ok) {
        notify('Display unpaired successfully');
        fetchDisplays();
      }
    } catch {
      notify('Failed to unpair display');
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Displays & Android TV Hub
              </h1>
              <p className="text-sm text-slate-500">
                Manage Walmart onn. 4K boxes, kitchen KDS screens, menu boards & wallboards
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:5178"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl flex items-center gap-2 transition"
          >
            <ExternalLink className="w-4 h-4" />
            Launch Display App
          </a>

          <button
            onClick={() => setShowPairModal(true)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Pair New Display
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Displays Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{displays.length}</div>
            <div className="text-xs uppercase font-bold text-slate-400">Total Displays</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">
              {displays.filter((d) => d.online).length}
            </div>
            <div className="text-xs uppercase font-bold text-slate-400">Online & Live</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {displays.filter((d) => d.assignedMode === 'kitchen').length}
            </div>
            <div className="text-xs uppercase font-bold text-slate-400">Active Kitchen KDS</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">100%</div>
            <div className="text-xs uppercase font-bold text-slate-400">Remote Controlled</div>
          </div>
        </div>
      </div>

      {/* Displays Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Paired Television Devices</h2>

        {loading && displays.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading displays...</div>
        ) : displays.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
            <Tv className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No Displays Paired Yet</p>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Power on your Walmart onn. 4K box or open the Display App on any screen to get a 6-digit pairing code.
            </p>
            <button
              onClick={() => setShowPairModal(true)}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl"
            >
              Enter Pairing Code
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displays.map((display) => {
              const isCheezies = display.configuration?.brand === 'cheezies' || display.assignedView?.includes('cheezies');
              return (
                <div
                  key={display.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Name & Online Status */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{display.name}</h3>
                          {isCheezies && (
                            <span className="text-[10px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.5 rounded">
                              CHEEZIES
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {display.platform} • v{display.appVersion}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          display.online
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            display.online ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                          }`}
                        />
                        {display.online ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    {/* Mode & Station Badges */}
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Assigned Mode:</span>
                        <span className="font-bold text-slate-900 uppercase">
                          {display.assignedMode}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Active View / Station:</span>
                        <span className="font-bold text-amber-600 uppercase font-mono">
                          {display.assignedView}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Last Ping:</span>
                        <span className="font-medium text-slate-700">
                          {display.lastSeenAt ? new Date(display.lastSeenAt).toLocaleTimeString() : 'Never'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remote Controls */}
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Remote View Control
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRemoteSwitch(display.id, 'kitchen', 'all')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                      >
                        All Orders
                      </button>
                      <button
                        onClick={() => handleRemoteSwitch(display.id, 'kitchen', 'expo')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                      >
                        Expo Pass
                      </button>
                      <button
                        onClick={() => handleRemoteSwitch(display.id, 'manager', 'live')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                      >
                        Manager Wall
                      </button>
                      <button
                        onClick={() => handleRemoteSwitch(display.id, 'guest', 'menu')}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                      >
                        Menu Board
                      </button>
                    </div>

                    {isCheezies && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <button
                          onClick={() => handleRemoteSwitch(display.id, 'kitchen', 'cheezies_truck_ops')}
                          className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition"
                        >
                          Truck Ops
                        </button>
                        <button
                          onClick={() => handleRemoteSwitch(display.id, 'guest', 'cheezies_menu')}
                          className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition"
                        >
                          Cheezies Menu
                        </button>
                      </div>
                    )}

                    {/* Secondary Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => handleRemoteRefresh(display.id)}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1"
                        title="Reload display browser"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reload
                      </button>

                      <button
                        onClick={() => handleUnpair(display.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Unpair
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pairing Modal */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200">
            <h3 className="text-xl font-black text-slate-900">Pair New Display</h3>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Enter the 6-digit code shown on your Android TV screen.
            </p>

            {pairingError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{pairingError}</span>
              </div>
            )}

            <form onSubmit={handlePairSubmit} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Pairing Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 726 419"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value)}
                  className="w-full text-center text-3xl font-mono font-black tracking-widest px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen Line KDS"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Brand Theme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBrandChoice('culinaryos')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      brandChoice === 'culinaryos'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    CulinaryOS
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrandChoice('cheezies')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      brandChoice === 'cheezies'
                        ? 'bg-amber-400 text-amber-950 border-amber-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Cheezies Gourmet
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Assigned Mode
                </label>
                <select
                  value={assignedMode}
                  onChange={(e) => setAssignedMode(e.target.value as DisplayMode)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="kitchen">Kitchen KDS Screen</option>
                  <option value="manager">Manager Operational Wallboard</option>
                  <option value="staff">Staff Shift Board</option>
                  <option value="guest">Digital Menu Board</option>
                  <option value="pickup">Customer Pickup Status</option>
                  <option value="marketing">Marketing & Promo Playlist</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  Station / Subview
                </label>
                <select
                  value={assignedView}
                  onChange={(e) => setAssignedView(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Stations</option>
                  <option value="hot">Hot Line</option>
                  <option value="grill">Grill Station</option>
                  <option value="fry">Fryer</option>
                  <option value="cold">Cold Prep</option>
                  <option value="expo">Expo Pass</option>
                  <option value="truck_ops">Cheezies Truck Ops</option>
                  <option value="customer_menu">Cheezies Customer Menu</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPairModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-sm"
                >
                  Confirm & Pair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
