import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Extension = {
  extension_id: string;
  name: string;
  description: string;
  category: string;
  author_name: string;
  pricing_model: string;
  price_cents: number;
  is_verified: boolean;
  install_count: number;
  avg_rating: number | null;
  permissions: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  ordering:     '🎤 Ordering',
  inventory:    '📦 Inventory',
  ai:           '🤖 AI',
  reporting:    '📊 Reporting',
  loyalty:      '🎁 Loyalty',
  integrations: '🔗 Integrations',
  staff:        '👥 Staff',
  other:        '⚙️ Other',
};

export default function Marketplace() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from('extension_registry')
      .select('*')
      .eq('is_published', true)
      .order('install_count', { ascending: false })
      .then(({ data }: { data: any }) => setExtensions(data ?? []));

    supabase.from('installed_extensions')
      .select('extension_id')
      .then(({ data }: { data: any }) =>
        setInstalled(new Set((data ?? []).map((r: any) => r.extension_id)))
      );
  }, []);

  async function install(extensionId: string) {
    await supabase.from('installed_extensions').insert({
      extension_id: extensionId,
      is_enabled: true,
      settings: {},
    });
    setInstalled(prev => new Set([...prev, extensionId]));
  }

  async function uninstall(extensionId: string) {
    await supabase.from('installed_extensions')
      .delete().eq('extension_id', extensionId);
    setInstalled(prev => { const s = new Set(prev); s.delete(extensionId); return s; });
  }

  const filtered = category === 'all'
    ? extensions
    : extensions.filter(e => e.category === category);

  return (
    <main className="max-w-5xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900">Extension Marketplace</h1>
      <p className="mt-2 text-gray-500">
        Add capabilities to CulinaryOS. Every extension runs sandboxed —
        a crash cannot affect your POS.
      </p>

      <div className="flex flex-wrap gap-2 mt-6">
        <button onClick={() => setCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium border ${
            category === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'
          }`}>All</button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => setCategory(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${
              category === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600'
            }`}>{label}</button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map(ext => (
          <div key={ext.extension_id}
            className="border rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-bold text-lg text-gray-900">{ext.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">by {ext.author_name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {ext.is_verified && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      ✓ Verified
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {CATEGORY_LABELS[ext.category]}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">{ext.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {ext.permissions.map(p => (
                  <span key={p}
                    className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900">
                  {ext.pricing_model === 'free'
                    ? 'Free'
                    : `$${(ext.price_cents / 100).toFixed(2)}/mo`}
                </span>
                {ext.avg_rating && (
                  <span className="text-xs text-yellow-600">
                    ⭐ {ext.avg_rating.toFixed(1)}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {ext.install_count.toLocaleString()} installs
                </span>
              </div>
              {installed.has(ext.extension_id) ? (
                <button onClick={() => uninstall(ext.extension_id)}
                  className="text-sm text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50">
                  Remove
                </button>
              ) : (
                <button onClick={() => install(ext.extension_id)}
                  className="text-sm bg-green-700 text-white px-4 py-1.5 rounded-lg hover:bg-green-800">
                  Install
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
