import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import {
  SlidersHorizontal,
  CheckCircle2,
  Download,
  Upload,
  Search,
  Filter,
  Trash2,
  DollarSign,
  Package,
  QrCode,
  Sparkles,
} from '@culinaryos/ui';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  menuPrice: number;
  margin: string;
  stockPar: number;
  selected?: boolean;
}

export function DataManagementPage() {
  const { effectiveDevice } = useDevice();
  const [items, setItems] = useState<CatalogItem[]>([
    { id: '1', name: 'Filet Mignon 8oz', category: 'Steaks', costPrice: 14.5, menuPrice: 46.0, margin: '68.5%', stockPar: 35 },
    { id: '2', name: 'Prime New York Strip 14oz', category: 'Steaks', costPrice: 16.0, menuPrice: 52.0, margin: '69.2%', stockPar: 40 },
    { id: '3', name: 'Wild King Salmon', category: 'Seafood', costPrice: 11.2, menuPrice: 38.0, margin: '70.5%', stockPar: 25 },
    { id: '4', name: 'Pan-Roasted Chicken', category: 'Poultry', costPrice: 6.8, menuPrice: 28.0, margin: '75.7%', stockPar: 30 },
    { id: '5', name: 'Craft IPA Pint', category: 'Beverage', costPrice: 1.8, menuPrice: 8.5, margin: '78.8%', stockPar: 120 },
  ]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const applyBatchPriceChange = (pct: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (!selectedIds.has(i.id)) return i;
        const newPrice = Math.round(i.menuPrice * (1 + pct / 100) * 100) / 100;
        return {
          ...i,
          menuPrice: newPrice,
          margin: `${Math.round(((newPrice - i.costPrice) / newPrice) * 1000) / 10}%`,
        };
      })
    );
    setBulkNotice(`Updated prices by +${pct}% across ${selectedIds.size} selected items.`);
    setTimeout(() => setBulkNotice(null), 3500);
  };

  // Mobile View: Quick Barcode Count & Fast Item Search
  if (effectiveDevice === 'mobile') {
    return (
      <div className="space-y-4">
        {/* Mobile Barcode Scanner Simulation */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">Mobile Scanner & Rapid Count</h2>
              <p className="text-[10px] text-slate-500">Scan shelf QR tag to adjust inventory</p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 text-white rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-xs font-bold">Ready to Scan Pantry Barcode</p>
            <p className="text-[10px] text-slate-400">Aim camera at shelf UPC or QR tag</p>
            <button
              type="button"
              onClick={() => {
                setBulkNotice('Simulated Scan: Prime Filet Mignon 8oz (Par: 35)');
                setTimeout(() => setBulkNotice(null), 3000);
              }}
              className="mt-2 px-4 py-2 bg-purple-600 rounded-xl text-xs font-bold active:scale-[0.97]"
            >
              Simulate Scan
            </button>
          </div>
        </div>

        {/* Quick Item List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Inventory Par Levels</h3>
          {items.map((item) => (
            <div key={item.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900">{item.name}</p>
                <p className="text-[10px] text-slate-500">{item.category} · Menu: ${item.menuPrice.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-slate-900 text-sm">{item.stockPar} par</span>
                <span className="text-[10px] text-slate-400 block">{item.margin} margin</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Tablet View: Card-Based Touch Selection Mode
  if (effectiveDevice === 'tablet') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-950">Bulk Data Management</h1>
            <p className="text-xs text-slate-500">Touch multi-selection and batch pricing updates</p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyBatchPriceChange(5)}
                className="min-h-[48px] px-3.5 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-xs active:scale-[0.97]"
              >
                +5% Price ({selectedIds.size})
              </button>
            </div>
          )}
        </div>

        {bulkNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{bulkNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-300'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                      isSelected ? 'bg-orange-600 border-orange-600 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Price: <strong className="text-slate-900">${item.menuPrice.toFixed(2)}</strong></span>
                  <span>Cost: ${item.costPrice.toFixed(2)}</span>
                  <span className="text-emerald-600 font-bold">{item.margin} margin</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop View: Multi-Select Table with Comprehensive Bulk Actions Bar
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Bulk Data Management & Catalog Operations</h1>
          <p className="text-xs text-slate-500 font-medium">
            Multi-select table workflows, batch price indexing, recipe margin recalculations, and broadline catalog CSV sync
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 hover:bg-slate-50"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV Catalog</span>
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Catalog</span>
          </button>
        </div>
      </div>

      {bulkNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{bulkNotice}</span>
        </div>
      )}

      {/* Bulk Action Sticky Toolbar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-950 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-orange-600 font-bold text-[11px]">
              {selectedIds.size} Selected
            </span>
            <span className="text-slate-300">Choose batch operation to apply to selected items:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyBatchPriceChange(5)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all"
            >
              Increase Price +5%
            </button>
            <button
              type="button"
              onClick={() => applyBatchPriceChange(10)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all"
            >
              Increase Price +10%
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-400"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Master Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Catalog Item Master Registry</h3>
            <p className="text-xs text-slate-500">Select rows to batch update prices, par levels, or category tags</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">5 active items loaded</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === items.length && items.length > 0}
                    onChange={selectAll}
                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-400"
                  />
                </th>
                <th className="p-3">Item Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Cost Price</th>
                <th className="p-3 text-right">Menu Price</th>
                <th className="p-3 text-right">Gross Margin</th>
                <th className="p-3 text-right">Target Par Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${isSelected ? 'bg-orange-50/40' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-400"
                      />
                    </td>
                    <td className="p-3 font-bold text-slate-900">{item.name}</td>
                    <td className="p-3 text-slate-500">{item.category}</td>
                    <td className="p-3 text-right font-mono text-slate-600">${item.costPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">${item.menuPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">{item.margin}</td>
                    <td className="p-3 text-right font-mono text-slate-700">{item.stockPar} units</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
