'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SavingsCalculator() {
  const [monthlySales, setMonthlySales] = useState(65000);
  const [terminals, setTerminals] = useState(3);

  const legacyHardwareUpfront = terminals * 899;
  const legacyMonthlySoftware = terminals * 69;
  const legacyAnnualSoftware = legacyMonthlySoftware * 12;
  const legacyAnnualProcessingSpread = Math.round(monthlySales * 0.0055 * 12);
  const legacyAnnualAddons = 150 * 12;
  const totalLegacyFirstYear = legacyHardwareUpfront + legacyAnnualSoftware + legacyAnnualProcessingSpread + legacyAnnualAddons;

  const culinaryAnnualSoftware = 99 * 12;
  const totalCulinaryFirstYear = culinaryAnnualSoftware;

  const firstYearSavings = Math.max(0, totalLegacyFirstYear - totalCulinaryFirstYear);
  const ongoingAnnualSavings = Math.max(0, (legacyAnnualSoftware + legacyAnnualProcessingSpread + legacyAnnualAddons) - culinaryAnnualSoftware);

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <span className="inline-block px-3 py-1 rounded bg-[#181c24] border border-[#2a303c] text-[#ff6b35] text-xs font-mono font-bold uppercase tracking-widest mb-3">
            FINANCIAL BENCHMARK AUDIT
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Per-Terminal &amp; Processor Spread Calculator
          </h2>
        </div>
        <p className="text-slate-400 text-sm max-w-md">
          Compare Toast ($69/mo per screen + $899 hardware + card spread) against CulinaryOS flat-location licensing and direct Stripe Connect interchange.
        </p>
      </div>

      <div className="rounded-xl bg-[#12151b] border border-[#232832] p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-8">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label htmlFor="sales-range" className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                  Monthly Card Volume
                </label>
                <span className="font-mono text-lg font-bold text-white bg-[#0e1116] px-3 py-1 rounded border border-[#2a303c]">
                  ${monthlySales.toLocaleString()}
                </span>
              </div>
              <input
                id="sales-range"
                type="range"
                min="15000"
                max="250000"
                step="5000"
                value={monthlySales}
                onChange={(e) => setMonthlySales(Number(e.target.value))}
                className="w-full h-2.5 bg-[#1c2029] rounded-lg appearance-none cursor-pointer accent-[#ff6b35]"
                aria-label="Monthly Credit Card Volume"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                <span>$15,000/mo</span>
                <span>$100,000/mo</span>
                <span>$250,000+/mo</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label htmlFor="terminals-range" className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                  POS &amp; KDS Screens Deployed
                </label>
                <span className="font-mono text-lg font-bold text-white bg-[#0e1116] px-3 py-1 rounded border border-[#2a303c]">
                  {terminals} {terminals === 1 ? 'SCREEN' : 'SCREENS'}
                </span>
              </div>
              <input
                id="terminals-range"
                type="range"
                min="1"
                max="10"
                step="1"
                value={terminals}
                onChange={(e) => setTerminals(Number(e.target.value))}
                className="w-full h-2.5 bg-[#1c2029] rounded-lg appearance-none cursor-pointer accent-[#ff6b35]"
                aria-label="Number of Physical Terminals"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                <span>1 Screen</span>
                <span>3 Screens</span>
                <span>10 Screens</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#232832] space-y-2.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span>Proprietary hardware cap-ex avoided:</span>
                <span className="text-emerald-400 font-bold">+${legacyHardwareUpfront.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Direct Stripe Connect interchange savings:</span>
                <span className="text-emerald-400 font-bold">+${legacyAnnualProcessingSpread.toLocaleString()}/yr</span>
              </div>
              <div className="flex justify-between">
                <span>Per-terminal software multiplier eliminated:</span>
                <span className="text-emerald-400 font-bold">+${Math.max(0, legacyAnnualSoftware - culinaryAnnualSoftware).toLocaleString()}/yr</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-xl bg-[#0e1116] border border-[#2a303c] p-8">
              <span className="text-xs uppercase tracking-widest text-[#ff6b35] font-bold font-mono block mb-2">
                NET FIRST-YEAR COST REDUCTION
              </span>

              <div className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-2 font-mono">
                ${firstYearSavings.toLocaleString()}
              </div>

              <p className="text-xs font-mono text-slate-400 mb-6">
                RECURRING ANNUAL SAVINGS: <strong className="text-white">${ongoingAnnualSavings.toLocaleString()}/YR</strong>
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                <div className="bg-[#141820] border border-[#2a303c] rounded-lg p-3.5">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">LEGACY POS (YEAR 1)</span>
                  <span className="text-xl font-bold text-white font-mono">${totalLegacyFirstYear.toLocaleString()}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Locked hardware + spread</span>
                </div>
                <div className="bg-[#141820] border border-emerald-500/30 rounded-lg p-3.5">
                  <span className="text-[10px] text-emerald-400 uppercase font-mono tracking-wider block">CULINARYOS (YEAR 1)</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">${totalCulinaryFirstYear.toLocaleString()}</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Flat location + BYO Stripe</span>
                </div>
              </div>

              <Link
                href="/signup"
                className="w-full min-h-[52px] inline-flex items-center justify-center px-6 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
              >
                Provision Restaurant Workspace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
