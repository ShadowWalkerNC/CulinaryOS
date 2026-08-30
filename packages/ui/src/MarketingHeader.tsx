import React, { useState } from 'react';
import {
  ShoppingBag,
  Terminal,
  Menu,
  X,
  ExternalLink,
  ChevronDown,
  Smartphone,
  Tablet,
  Tv,
  Laptop,
  ChefHat,
  Briefcase,
  Layers,
  Sparkles,
  Printer,
  Code2,
} from 'lucide-react';

export interface MarketingHeaderProps {
  currentPath?: string;
  onOpenQuickstart?: () => void;
}

export const MarketingHeader: React.FC<MarketingHeaderProps> = ({
  currentPath = '/',
  onOpenQuickstart,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);

  const productLinks = [
    { name: 'Mobile Handheld POS', port: ':5172', desc: 'Tableside seat ordering & mobile checkout', icon: Smartphone, color: 'text-sky-600 bg-sky-50' },
    { name: 'Counter Terminal & Floor Map', port: ':5172', desc: '2D/3D spatial floor layout & printing', icon: Tablet, color: 'text-indigo-600 bg-indigo-50' },
    { name: 'Kitchen Display System (KDS)', port: ':5173', desc: 'Station routing with 1-sec aging timers', icon: Tv, color: 'text-amber-600 bg-amber-50' },
    { name: 'Back-Office Admin & Pantry', port: ':5174', desc: 'Menu editor, staff PINs & auto-PO par levels', icon: Laptop, color: 'text-emerald-600 bg-emerald-50' },
    { name: 'KitchenKit Prep Planner', port: ':5175', desc: 'Shift prep lists & recipe scaling engine', icon: ChefHat, color: 'text-orange-600 bg-orange-50' },
    { name: 'Online Guest Storefront', port: ':5176', desc: 'Mobile-first ordering & live order tracker', icon: ShoppingBag, color: 'text-teal-600 bg-teal-50' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Wordmark */}
        <a href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-xs group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
            <span className="material-symbols-outlined filled text-[20px]">skillet</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-slate-950 tracking-tight group-hover:text-amber-600 transition-colors">
                CulinaryOS
              </span>
              <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                Restaurant OS
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden md:block leading-none">
              POS · KDS · Inventory · Staff · Storefront
            </p>
          </div>
        </a>

        {/* Desktop Navigation Links — Symbol & Icon Forward */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {/* Products Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProductsOpen(!productsOpen)}
              onBlur={() => setTimeout(() => setProductsOpen(false), 200)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Platform & Products</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
            </button>

            {productsOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-84 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 grid grid-cols-1 gap-1 animate-fadeIn">
                {productLinks.map((prod, i) => {
                  const Icon = prod.icon;
                  return (
                    <a
                      key={i}
                      href="/#demo"
                      onClick={() => setProductsOpen(false)}
                      className="p-2.5 rounded-xl hover:bg-slate-50 flex items-start gap-3 transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-lg ${prod.color} flex items-center justify-center shrink-0 shadow-2xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-slate-950 truncate">
                            {prod.name}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{prod.desc}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <a
            href="/#demo"
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Interactive Demo</span>
          </a>

          <a
            href="/#hardware"
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Hardware & Displays</span>
          </a>

          <a
            href="/jobs"
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentPath === '/jobs'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-4 h-4 text-emerald-500" />
            <span>Careers</span>
          </a>

          <a
            href="https://github.com/ShadowWalkerNC/CulinaryOS"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <Code2 className="w-4 h-4 text-slate-500" />
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/menu/demo"
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Order Online</span>
          </a>

          {onOpenQuickstart ? (
            <button
              type="button"
              onClick={onOpenQuickstart}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Quickstart</span>
            </button>
          ) : (
            <a
              href="/#demo"
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
            >
              <span>Try Demo</span>
            </a>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 animate-fadeIn">
          <div className="space-y-1">
            <a
              href="/#demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-100"
            >
              Platform & Interactive Demo
            </a>
            <a
              href="/#hardware"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-100"
            >
              Hardware & Printers
            </a>
            <a
              href="/jobs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-100"
            >
              Restaurant Careers Board
            </a>
            <a
              href="https://github.com/ShadowWalkerNC/CulinaryOS"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 rounded-lg text-sm font-bold text-slate-800 hover:bg-slate-100"
            >
              GitHub Monorepo
            </a>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <a
              href="/menu/demo"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Launch Online Storefront</span>
            </a>
            {onOpenQuickstart && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenQuickstart();
                }}
                className="w-full py-2.5 rounded-xl bg-[#0f172a] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Terminal className="w-4 h-4" />
                <span>Quickstart Guide</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
