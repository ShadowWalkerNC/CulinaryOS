'use client';

import Link from 'next/link';
import { useState } from 'react';

const nav = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'RecipeOS', href: '/recipeos' },
  { label: 'Blog', href: '/blog' },
  { label: 'Docs', href: 'https://docs.culinaryos.io', external: true },
  { label: 'GitHub', href: 'https://github.com/ShadowWalkerNC/CulinaryOS', external: true },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0c0c0c]/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Logo with Live Pulse */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center font-bold text-white shadow-md shadow-brand-orange/20 transition-transform group-hover:scale-105">
              <span>🍽️</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-brand-orange transition-colors">
                Culinary<span className="text-brand-orange">OS</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                v1.2
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            {nav.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span>{item.label}</span>
                  <span className="text-[10px] text-white/40">↗</span>
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* Desktop Right CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/#demo"
              className="px-4 py-2 rounded-full text-xs font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-all"
            >
              Watch Demo ▶
            </Link>
            <Link
              href="/signup"
              className="group min-h-[42px] inline-flex items-center gap-2 px-5 py-2 rounded-full gradient-bg text-white text-xs font-bold hover:opacity-95 active:scale-[0.97] transition-all shadow-md shadow-brand-orange/20"
            >
              <span>Start Free Trial</span>
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {/* Mobile Hamburger Button (48px Physical Touch Target) */}
          <button
            type="button"
            className="md:hidden min-w-[48px] min-h-[48px] flex flex-col items-center justify-center text-white/70 hover:text-white rounded-xl active:bg-white/10 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            <div className={`w-5 h-0.5 bg-current transition-all duration-200 ${open ? 'rotate-45 translate-y-1.5' : 'mb-1.5'}`} />
            <div className={`w-5 h-0.5 bg-current transition-all duration-200 ${open ? 'opacity-0' : 'mb-1.5'}`} />
            <div className={`w-5 h-0.5 bg-current transition-all duration-200 ${open ? '-rotate-45 -translate-y-1.5' : ''}`} />
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {open && (
          <div className="md:hidden py-5 border-t border-white/10 space-y-3">
            {nav.map((item) =>
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] flex items-center px-2 text-sm font-medium text-white/80 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {item.label} ↗
                </a>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="min-h-[44px] flex items-center px-2 text-sm font-medium text-white/80 hover:text-white"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <Link
                href="/signup"
                className="w-full min-h-[48px] flex items-center justify-center px-6 py-3 rounded-xl gradient-bg text-white text-sm font-bold active:scale-[0.97] transition-all shadow-lg shadow-brand-orange/20"
                onClick={() => setOpen(false)}
              >
                Start 14-Day Free Trial →
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
