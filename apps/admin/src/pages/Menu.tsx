import React, { useCallback, useEffect, useState } from 'react';
import { CulinaryCard, CulinaryButton, CulinaryBadge } from '@culinaryos/ui';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  status: string;
  station: string;
}

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/admin/menu/items`, { headers: apiHeaders() });
      const body = await res.json();
      if (body.ok) {
        setItems(body.data?.items ?? []);
      } else {
        setMsg({ text: body.error?.message ?? 'Failed to load menu items', type: 'error' });
      }
    } catch {
      setMsg({ text: 'Failed to connect to API server', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(item: MenuItem) {
    const next = item.status === 'available' ? '86' : 'available';
    try {
      const res = await fetch(`${API}/v1/admin/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ status: next }),
      });
      const body = await res.json();
      if (!body.ok) {
        setMsg({ text: body.error?.message ?? 'Update failed', type: 'error' });
        return;
      }
      setMsg({
        text: `Updated "${item.name}" availability to ${next === '86' ? "86'd (Unavailable)" : 'Available'}`,
        type: 'success',
      });
      void load();
    } catch {
      setMsg({ text: 'Network error updating item availability', type: 'error' });
    }
  }

  const stations = ['all', ...Array.from(new Set(items.map((i) => i.station).filter(Boolean)))];
  const availableCount = items.filter((i) => i.status === 'available').length;
  const eightySixCount = items.filter((i) => i.status === '86').length;

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(filterQuery.toLowerCase()));
    const matchesStation = selectedStation === 'all' || item.station === selectedStation;
    return matchesSearch && matchesStation;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0b1c30] uppercase tracking-wider">
            Menu Catalog & 86 Editor
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Manage station routing, catalog pricing, and live 86 availability across POS and Web ordering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CulinaryBadge variant="success">{availableCount} Available</CulinaryBadge>
          {eightySixCount > 0 && <CulinaryBadge variant="danger">{eightySixCount} 86'd</CulinaryBadge>}
          <CulinaryButton variant="outline" size="sm" onClick={() => void load()}>
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Refresh
          </CulinaryButton>
        </div>
      </div>

      {/* Feedback Toast */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            msg.type === 'success'
              ? 'bg-[#22c55e10] border-[#22c55e30] text-[#16a34a]'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">
              {msg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs font-bold hover:underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Menu Catalog Card */}
      <CulinaryCard
        title="Menu Items Catalog"
        subtitle={`Showing ${filteredItems.length} of ${items.length} items`}
        headerAction={
          <div className="flex items-center gap-3">
            {/* Station Filter */}
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              aria-label="Filter by station"
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[#e5e7eb] bg-white text-[#1f2937] font-semibold uppercase tracking-wider focus:outline-none focus:border-[#0f172a]"
            >
              {stations.map((st) => (
                <option key={st} value={st}>
                  {st === 'all' ? 'All Stations' : st.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search items..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#e5e7eb] bg-white text-[#1f2937] focus:outline-none focus:border-[#0f172a] w-48 transition-all"
              />
              <span className="material-symbols-outlined text-[16px] text-[#9ca3af] absolute left-2 top-2">
                search
              </span>
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="py-12 text-center text-xs text-[#6b7280] font-medium flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[24px] text-[#0f172a]">progress_activity</span>
            <span>Loading menu items from database…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[10px] font-black uppercase tracking-wider text-[#6b7280]">
                  <th className="pb-3 px-3">Item Details</th>
                  <th className="pb-3 px-3">Price</th>
                  <th className="pb-3 px-3">Station</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6] text-xs">
                {filteredItems.map((item) => {
                  const isAvailable = item.status === 'available';
                  return (
                    <tr key={item.id} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-[#0b1c30] text-sm">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-[#6b7280] mt-0.5 max-w-md line-clamp-2">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-[#0f172a]">
                        {dollars(item.price)}
                      </td>
                      <td className="py-3.5 px-3">
                        <CulinaryBadge variant="brand">
                          {item.station ? item.station.toUpperCase() : 'EXPO'}
                        </CulinaryBadge>
                      </td>
                      <td className="py-3.5 px-3">
                        <CulinaryBadge variant={isAvailable ? 'success' : 'danger'}>
                          {isAvailable ? 'AVAILABLE' : "86'D"}
                        </CulinaryBadge>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <CulinaryButton
                          type="button"
                          variant={isAvailable ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => void toggleStatus(item)}
                        >
                          {isAvailable ? "86 Item" : 'Make Available'}
                        </CulinaryButton>
                      </td>
                    </tr>
                  );
                })}
                {!filteredItems.length && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-[#6b7280]">
                      {items.length === 0 ? (
                        <div>
                          <p className="font-semibold text-[#1f2937] mb-1">No menu items found</p>
                          <p>
                            Seed demo menu items with <code className="font-mono bg-[#f3f4f6] px-1.5 py-0.5 rounded text-[#0f172a]">pnpm seed</code>.
                          </p>
                        </div>
                      ) : (
                        <p>No menu items matching your filter query.</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CulinaryCard>
    </div>
  );
}

export default MenuPage;
