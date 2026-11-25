import React from 'react';

export interface MarketingHeaderProps {
  currentPath?: string;
  onOpenQuickstart?: () => void;
}

const links = [
  { href: '/demo', label: 'Demo menu' },
  { href: '/studio', label: 'Storefront studio' },
  { href: '/team', label: 'About' },
];

export function MarketingHeader({ currentPath = '/', onOpenQuickstart }: MarketingHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white text-slate-950">
      <nav aria-label="Storefront navigation" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 px-4 py-2 sm:px-6">
        <a href="/" className="inline-flex min-h-12 items-center font-bold">CulinaryOS</a>
        <div className="flex flex-wrap gap-x-4 text-sm font-medium">
          {links.map(({ href, label }) => (
            <a key={href} href={href} aria-current={currentPath === href ? 'page' : undefined} className="inline-flex min-h-12 items-center hover:underline">
              {label}
            </a>
          ))}
          {onOpenQuickstart && <button type="button" onClick={onOpenQuickstart} className="min-h-12 hover:underline">Quick start</button>}
        </div>
      </nav>
    </header>
  );
}
