'use client';

import Link from 'next/link';
import { useState } from 'react';

const nav = [
  { label: 'Desktop Workstation', href: '/download' },
  { label: 'Platform Capabilities', href: '/features' },
  { label: 'Pricing & Cloud Bridge', href: '/pricing' },
  { label: 'RecipeOS', href: '/recipeos' },
  { label: 'Campaign Studio', href: '/studio' },
  { label: 'Dispatches', href: '/blog' },
  { label: 'Source Repo', href: 'https://github.com/ShadowWalkerNC/CulinaryOS', external: true },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0b0d10]/95 backdrop-blur-md border-b border-[#232832]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-[#ff6b35] flex items-center justify-center text-white shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold tracking-tight text-white">
                CULINARY<span className="text-[#ff6b35]">OS</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#181c24] border border-[#2a303c] text-slate-300">
                RUST v1.3
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-6">
            {nav.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="hidden md:flex items-center gap-2.5">
            <Link
              href="/download"
              className="min-h-[48px] inline-flex items-center justify-center px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-200 hover:text-white bg-[#141820] hover:bg-[#1c222d] border border-[#2a303c] active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Download Workstation
            </Link>
            <Link
              href="/signup"
              className="min-h-[48px] inline-flex items-center justify-center px-5 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
            >
              Connect Cloud Bridge
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden min-w-[48px] min-h-[48px] flex flex-col items-center justify-center text-slate-300 hover:text-white rounded-lg border border-[#2a303c] bg-[#141820] active:scale-[0.97] transition-all duration-75 ease-out"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <div className={`w-5 h-0.5 bg-current transition-all duration-200 ${open ? 'rotate-45 translate-y-1.5' : 'mb-1.5'}`} />
            <div className={`w-5 h-0.5 bg-current transition-all duration-200 ${open ? 'opacity-0' : 'mb-1.5'}`} />
            <div className={`w-5 h-0.5 bg-current transition-all duration-200 ${open ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>

        {open && (
          <div className="md:hidden py-4 border-t border-[#232832] space-y-2">
            {nav.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[48px] flex items-center px-3 text-sm font-semibold text-slate-200 hover:text-white rounded-lg hover:bg-[#141820]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="min-h-[48px] flex items-center px-3 text-sm font-semibold text-slate-200 hover:text-white rounded-lg hover:bg-[#141820]"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}
            <div className="pt-3 border-t border-[#232832] grid grid-cols-1 gap-2">
              <Link
                href="/download"
                className="w-full min-h-[48px] flex items-center justify-center px-5 rounded-lg bg-[#141820] border border-[#2a303c] text-white text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
                onClick={() => setOpen(false)}
              >
                Download Workstation
              </Link>
              <Link
                href="/signup"
                className="w-full min-h-[48px] flex items-center justify-center px-5 rounded-lg bg-[#ff6b35] text-white text-xs font-bold uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
                onClick={() => setOpen(false)}
              >
                Connect Cloud Bridge
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
