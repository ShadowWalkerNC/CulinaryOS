import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import {
  TrendingUp,
  Download,
  Filter,
  DollarSign,
  PieChart,
  Calendar,
  ChevronDown,
  ArrowRight,
  FileText,
} from '@culinaryos/ui';

export function ReportingPage() {
  const { effectiveDevice } = useDevice();
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const pmixData = [
    { name: 'Prime Bone-In Ribeye 16oz', category: 'Steaks', sold: 48, revenue: '$3,120', costPct: '29.4%', margin: '$2,202' },
    { name: 'Pan-Seared Chilean Sea Bass', category: 'Seafood', sold: 34, revenue: '$1,598', costPct: '27.1%', margin: '$1,165' },
    { name: 'Truffle Tagliatelle', category: 'Pasta', sold: 42, revenue: '$1,176', costPct: '19.8%', margin: '$943' },
    { name: 'Smoked Old Fashioned', category: 'Bar', sold: 86, revenue: '$1,548', costPct: '14.2%', margin: '$1,328' },
    { name: 'Artisan Burrata Salad', category: 'Appetizers', sold: 38, revenue: '$722', costPct: '21.5%', margin: '$566' },
  ];

  // Mobile View
  if (effectiveDevice === 'mobile') {
    return (
      <div className="space-y-4">
        {/* Mobile Filter & Date Selector */}
        <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Financial Reports</span>
            <p className="text-sm font-black text-slate-900">Saturday Summary</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setDateRange('today')}
              className={`px-2.5 py-1 rounded-lg ${dateRange === 'today' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateRange('week')}
              className={`px-2.5 py-1 rounded-lg ${dateRange === 'week' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'}`}
            >
              Week
            </button>
          </div>
        </div>

        {/* Essential P&L Card Stack */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Snapshot</h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="text-slate-500 font-medium">Gross Sales</span>
              <span className="font-mono font-bold text-slate-900">$15,940.00</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="text-slate-500 font-medium">Comps & Voids</span>
              <span className="font-mono font-bold text-red-600">-$280.00</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="text-slate-500 font-medium">Net Sales</span>
              <span className="font-mono font-extrabold text-slate-950">$15,660.00</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
              <span className="text-slate-500 font-medium">Credit Card Tips (FLSA Pool)</span>
              <span className="font-mono font-bold text-slate-900">$2,942.50</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-emerald-900 font-bold">Estimated Prime Cost</span>
              <span className="font-mono font-extrabold text-emerald-700">54.6%</span>
            </div>
          </div>
        </div>

        {/* Top Product Mix by Revenue */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Sellers Tonight</h3>
          <div className="space-y-2">
            {pmixData.map((item) => (
              <div key={item.name} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-500">{item.sold} sold · {item.costPct} food cost</p>
                </div>
                <div className="text-right">
                  <p className="font-bold font-mono text-slate-900">{item.revenue}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">+{item.margin} margin</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Tablet View
  if (effectiveDevice === 'tablet') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-950">Reporting & Financial Intelligence</h1>
            <p className="text-xs text-slate-500">Sales velocity, product mix, and prime cost analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              {(['today', 'week', 'month'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDateRange(r)}
                  className={`min-h-[44px] px-3.5 rounded-lg capitalize ${
                    dateRange === r ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-3 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Net Revenue</span>
            <p className="text-2xl font-black text-slate-950 mt-1">$15,660</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">+14.2% vs target</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">COGS Food Cost %</span>
            <p className="text-2xl font-black text-slate-950 mt-1">28.2%</p>
            <p className="text-xs text-slate-500 font-medium mt-1">1.8% below 30% par</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Labor Cost %</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">26.4%</p>
            <p className="text-xs text-slate-500 font-medium mt-1">Target: &le; 28%</p>
          </div>
        </div>

        {/* Product Mix Touch Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="font-bold text-sm text-slate-900">Product Mix & Margin Ranking</h3>
          <div className="space-y-2">
            {pmixData.map((item) => (
              <div key={item.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                  <p className="text-[11px] text-slate-500">Category: {item.category} · {item.sold} units ordered</p>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Revenue</span>
                    <span className="font-mono font-bold text-slate-900">{item.revenue}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Food Cost %</span>
                    <span className="font-mono font-bold text-slate-700">{item.costPct}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Margin</span>
                    <span className="font-mono font-bold text-emerald-600">{item.margin}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Desktop View: Enterprise P&L, Granular Product Mix & CSV Export
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Financial Intelligence & P&L Reporting</h1>
          <p className="text-xs text-slate-500 font-medium">
            Full audited financial statements, menu engineering matrices, and tip distribution compliance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {(['today', 'week', 'month'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 rounded-lg capitalize ${
                  dateRange === r ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {r === 'today' ? 'Today (Shift)' : r === 'week' ? 'Last 7 Days' : 'Month to Date'}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* P&L Statement Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Period Profit & Loss Statement (Operating View)</h3>
            <p className="text-xs text-slate-500">Includes all POS sales, voids, labor hours, and theoretical food cost</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            AUDIT TRAIL: V17 CONNECTED
          </span>
        </div>

        <div className="p-5 grid grid-cols-4 gap-4 divide-x divide-slate-100 text-xs">
          <div className="space-y-1.5 pr-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Top-Line Revenue</span>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Gross POS Sales</span>
              <span className="font-mono font-bold">$15,940.00</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Comps & Voids</span>
              <span className="font-mono font-bold text-red-600">-$280.00</span>
            </div>
            <div className="flex justify-between py-1 text-slate-950 font-extrabold">
              <span>Net Revenue</span>
              <span className="font-mono">$15,660.00</span>
            </div>
          </div>

          <div className="space-y-1.5 px-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Cost of Goods Sold</span>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Food Cost (Theoretical)</span>
              <span className="font-mono font-bold">$3,562.00</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Beverage / Bar Cost</span>
              <span className="font-mono font-bold">$854.00</span>
            </div>
            <div className="flex justify-between py-1 text-slate-950 font-extrabold">
              <span>Total COGS</span>
              <span className="font-mono text-emerald-700">28.2%</span>
            </div>
          </div>

          <div className="space-y-1.5 px-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Labor & Staffing</span>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Hourly Staff Wages</span>
              <span className="font-mono font-bold">$3,120.00</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Overtime Premium</span>
              <span className="font-mono font-bold text-amber-600">$180.00</span>
            </div>
            <div className="flex justify-between py-1 text-slate-950 font-extrabold">
              <span>Labor %</span>
              <span className="font-mono text-emerald-700">26.4%</span>
            </div>
          </div>

          <div className="space-y-1.5 pl-4">
            <span className="text-[10px] uppercase font-bold text-slate-400">Prime Cost & Profit</span>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Prime Cost (COGS+Labor)</span>
              <span className="font-mono font-bold text-emerald-600">54.6%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Industry Benchmark</span>
              <span className="font-mono text-slate-400">&le; 60.0%</span>
            </div>
            <div className="flex justify-between py-1 text-emerald-700 font-extrabold">
              <span>Gross Margin</span>
              <span className="font-mono text-emerald-700">$7,108.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Mix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Product Mix & Menu Engineering Matrix</h3>
            <p className="text-xs text-slate-500">Sales velocity, recipe theoretical margin, and popularity ranking</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white font-medium"
            >
              <option value="all">All Categories</option>
              <option value="steaks">Steaks</option>
              <option value="seafood">Seafood</option>
              <option value="bar">Bar & Cocktails</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3">Item Description</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Units Sold</th>
                <th className="p-3 text-right">Gross Sales</th>
                <th className="p-3 text-right">Food Cost %</th>
                <th className="p-3 text-right">Contribution Margin</th>
                <th className="p-3 text-center">Velocity Rank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pmixData.map((item, idx) => (
                <tr key={item.name} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-900">{item.name}</td>
                  <td className="p-3 text-slate-500">{item.category}</td>
                  <td className="p-3 text-right font-mono font-medium text-slate-800">{item.sold}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{item.revenue}</td>
                  <td className="p-3 text-right font-mono font-medium text-slate-600">{item.costPct}</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-600">{item.margin}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-[10px] text-slate-700">
                      #{idx + 1}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
