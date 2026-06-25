import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Application = {
  id: string;
  business_name: string;
  business_type: string;
  current_pos: string;
  primary_pain: string;
  phone: string;
  email: string;
  location: string;
  status: 'pending' | 'admitted' | 'declined' | 'converted';
  founder_notes: string | null;
  applied_at: string;
  admitted_at: string | null;
  converted_at: string | null;
};

export default function BetaDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [filter, setFilter] = useState<string>('pending');

  useEffect(() => {
    supabase
      .from('beta_applications')
      .select('*')
      .order('applied_at', { ascending: false })
      .then(({ data }) => setApps(data ?? []));
  }, []);

  async function updateStatus(id: string, status: string, extra?: object) {
    await supabase.from('beta_applications').update({
      status,
      ...(status === 'admitted'  ? { admitted_at:  new Date().toISOString() } : {}),
      ...(status === 'converted' ? { converted_at: new Date().toISOString() } : {}),
      ...extra,
    }).eq('id', id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: status as Application['status'], ...extra } : a));
  }

  async function saveNotes(id: string, notes: string) {
    await supabase.from('beta_applications').update({ founder_notes: notes }).eq('id', id);
  }

  const filtered = apps.filter(a => filter === 'all' || a.status === filter);
  const counts = {
    pending:   apps.filter(a => a.status === 'pending').length,
    admitted:  apps.filter(a => a.status === 'admitted').length,
    converted: apps.filter(a => a.status === 'converted').length,
    declined:  apps.filter(a => a.status === 'declined').length,
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-gray-900">Beta Dashboard</h1>
      <p className="text-gray-500 mt-1">
        Founding customers needed: <strong>5</strong> — Converted so far:{' '}
        <strong className="text-green-700">{counts.converted}</strong>
      </p>

      <div className="grid grid-cols-4 gap-4 mt-6">
        {(['pending','admitted','converted','declined'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-lg p-4 text-center border-2 ${
              filter === s ? 'border-green-700 bg-green-50' : 'border-gray-200'
            }`}>
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div className="text-sm text-gray-500 capitalize">{s}</div>
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {filtered.map(app => (
          <div key={app.id} className="border rounded-xl p-5 bg-white shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-lg">{app.business_name}</h2>
                <p className="text-sm text-gray-500">
                  {app.business_type} · {app.location} · was on {app.current_pos}
                </p>
                <p className="text-sm text-gray-700 mt-2 italic">"{app.primary_pain}"</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                app.status === 'converted' ? 'bg-green-100 text-green-800' :
                app.status === 'admitted'  ? 'bg-blue-100 text-blue-800' :
                app.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                                             'bg-gray-100 text-gray-500'
              }`}>{app.status.toUpperCase()}</span>
            </div>

            <div className="mt-3 flex gap-3 items-center">
              <a href={`tel:${app.phone}`} className="text-sm font-medium text-blue-700 hover:underline">
                📞 {app.phone}
              </a>
              <a href={`mailto:${app.email}`} className="text-sm font-medium text-blue-700 hover:underline">
                ✉️ {app.email}
              </a>
            </div>

            <textarea
              className="mt-3 w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              placeholder="Founder notes..."
              defaultValue={app.founder_notes ?? ''}
              onBlur={e => saveNotes(app.id, e.target.value)}
            />

            <div className="mt-3 flex gap-2 flex-wrap">
              {app.status === 'pending' && (
                <>
                  <button onClick={() => updateStatus(app.id, 'admitted')}
                    className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
                    ✅ Admit
                  </button>
                  <button onClick={() => updateStatus(app.id, 'declined')}
                    className="bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-300">
                    Decline
                  </button>
                </>
              )}
              {app.status === 'admitted' && (
                <button onClick={() => updateStatus(app.id, 'converted')}
                  className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800">
                  🎉 Mark as Converted — Founding Customer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
