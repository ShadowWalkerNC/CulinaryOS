import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const NAV = [
  { href: '/vault',  label: 'Vault',   icon: '🗂️' },
  { href: '/pantry', label: 'Pantry',  icon: '🥫' },
  { href: '/prep',   label: 'Prep',    icon: '📋' },
  { href: '/scale',  label: 'Scale',   icon: '⚖️' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return <>{children}</>;
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/auth/login');
  } catch {
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-100 flex flex-col py-6 px-4">
        <div className="flex items-center gap-2 px-2 mb-8">
          <span className="text-2xl">🍽️</span>
          <span className="font-bold text-lg tracking-tight">RecipeOS</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="text-base">↩️</span>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
