'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SavingsCalculator() {
  const [monthlySales, setMonthlySales] = useState(65000);
  const [terminals, setTerminals] = useState(3);

  // Fee calculation logic based on industry averages (Toast: $899 hardware, $69/mo/terminal, +0.55% card spread, $150/mo add-ons)
  const legacyHardwareUpfront = terminals * 899;
  const legacyMonthlySoftware = terminals * 69;
  const legacyAnnualSoftware = legacyMonthlySoftware * 12;
  const legacyAnnualProcessingSpread = Math.round(monthlySales * 0.0055 * 12);
  const legacyAnnualAddons = 150 * 12; // Online ordering commissions & support fees
  const totalLegacyFirstYear = legacyHardwareUpfront + legacyAnnualSoftware + legacyAnnualProcessingSpread + legacyAnnualAddons;

  // CulinaryOS: $0 hardware (BYOD), flat $99/mo ($1,188/yr), $0 payment markup (Bring-your-own-Stripe)
  const culinaryAnnualSoftware = 99 * 12;
  const totalCulinaryFirstYear = culinaryAnnualSoftware;

  const firstYearSavings = Math.max(0, totalLegacyFirstYear - totalCulinaryFirstYear);
  const ongoingAnnualSavings = Math.max(0, (legacyAnnualSoftware + legacyAnnualProcessingSpread + legacyAnnualAddons) - culinaryAnnualSoftware);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-orange/10 border border-brand-orange/20 text-xs font-semibold text-brand-orange uppercase tracking-wider mb-4">
          <span>Interactive Margin Audit</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">
          Calculate Your <span className="gradient-text">&ldquo;Toast Tax&rdquo;</span>
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Legacy POS vendors lock you into proprietary screens, per-terminal software fees, and marked-up payment processing. See how much stays in your bank account with CulinaryOS.
        </p>
      </div>

      {/* Double-Bezel Card Container */}
      <div className="rounded-[2.5rem] bg-white/[0.04] p-2 ring-1 ring-white/10 shadow-2xl backdrop-blur-xl">
        <div className="rounded-[calc(2.5rem-0.5rem)] bg-[#121212]/90 border border-white/10 p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Input Controls (Left Column) */}
            <div className="lg:col-span-6 space-y-8">
              {/* Slider 1: Monthly Card Sales */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label htmlFor="sales-range" className="text-sm font-semibold text-white/80">
                    Monthly Credit Card Volume
                  </label>
                  <span className="font-mono text-lg font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10">
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
                  className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  aria-label="Monthly Credit Card Volume"
                />
                <div className="flex justify-between text-xs text-white/40 mt-2 font-mono">
                  <span>$15,000/mo</span>
                  <span>$100,000/mo</span>
                  <span>$250,000+/mo</span>
                </div>
              </div>

              {/* Slider 2: Number of Terminals */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label htmlFor="terminals-range" className="text-sm font-semibold text-white/80">
                    Physical Terminals & Handhelds
                  </label>
                  <span className="font-mono text-lg font-bold text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                    {terminals} {terminals === 1 ? 'terminal' : 'terminals'}
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
                  className="w-full h-2.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                  aria-label="Number of Physical Terminals"
                />
                <div className="flex justify-between text-xs text-white/40 mt-2 font-mono">
                  <span>1 Screen (Food Truck)</span>
                  <span>3 Screens (Standard)</span>
                  <span>10 Screens (Multi-Room)</span>
                </div>
              </div>

              {/* Breakdown list */}
              <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs text-white/60">
                <div className="flex justify-between">
                  <span>Legacy hardware markup avoided:</span>
                  <span className="font-mono text-green-400 font-semibold">+${legacyHardwareUpfront.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated payment processing markup saved:</span>
                  <span className="font-mono text-green-400 font-semibold">+${legacyAnnualProcessingSpread.toLocaleString()}/yr</span>
                </div>
                <div className="flex justify-between">
                  <span>Per-terminal software fee savings:</span>
                  <span className="font-mono text-green-400 font-semibold">+${Math.max(0, legacyAnnualSoftware - culinaryAnnualSoftware).toLocaleString()}/yr</span>
                </div>
              </div>
            </div>

            {/* Live Result Scoreboard (Right Column) */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="rounded-3xl bg-gradient-to-br from-brand-orange/15 via-black/40 to-white/[0.02] border border-brand-orange/30 p-8 text-center relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-36 h-36 rounded-full bg-brand-orange/20 blur-3xl pointer-events-none" />
                
                <span className="text-xs uppercase tracking-widest text-brand-orange font-bold font-mono block mb-2">
                  First-Year Bottom-Line Savings
                </span>
                
                <div className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight mb-2 font-mono">
                  ${firstYearSavings.toLocaleString()}
                </div>
                
                <p className="text-sm text-white/60 mb-6">
                  Then <strong className="text-white font-mono">${ongoingAnnualSavings.toLocaleString()}/year</strong> saved every year after.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <span className="text-[10px] text-red-400 uppercase font-mono tracking-wider block">Legacy Toast/Square</span>
                    <span className="text-lg font-bold text-white font-mono">${totalLegacyFirstYear.toLocaleString()}</span>
                    <span className="text-[11px] text-white/40 block">Hardware + per-screen SaaS + spread</span>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                    <span className="text-[10px] text-green-400 uppercase font-mono tracking-wider block">CulinaryOS Platform</span>
                    <span className="text-lg font-bold text-green-400 font-mono">${totalCulinaryFirstYear.toLocaleString()}</span>
                    <span className="text-[11px] text-white/40 block">Flat SaaS • BYOD hardware • 0% spread</span>
                  </div>
                </div>

                {/* Primary Action Button with Nested Icon (High-End Visual Standard) */}
                <Link
                  href="/signup"
                  className="group w-full min-h-[52px] inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-full gradient-bg text-white font-bold text-base hover:opacity-95 active:scale-[0.97] transition-all duration-150 shadow-lg shadow-brand-orange/25"
                >
                  <span>Stop Overpaying — Start Free Trial</span>
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-[1px]">
                    <span className="text-xs">→</span>
                  </div>
                </Link>

                <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-white/50 font-mono">
                  <span>✓ 14-day zero-risk trial</span>
                  <span>•</span>
                  <span>✓ No credit card</span>
                  <span>•</span>
                  <span>✓ Keep your tablets</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
