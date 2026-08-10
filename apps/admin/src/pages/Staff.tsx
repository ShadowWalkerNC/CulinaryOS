import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

interface StaffRow {
  user_id?: string;
  display_name: string;
  role: string;
  active?: boolean;
  has_pin?: boolean;
}

export function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    role: 'server',
    pin: '',
  });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/v1/admin/staff`, { headers: apiHeaders() });
    const body = await res.json();
    if (body.ok) setStaff(body.data?.staff ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch(`${API}/v1/admin/staff`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(form),
    });
    const body = await res.json();
    if (!body.ok) {
      setMsg(body.error?.message ?? 'Create failed');
      return;
    }
    setMsg(`Created ${body.data.display_name}`);
    setForm({ email: '', display_name: '', role: 'server', pin: '' });
    void load();
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <nav style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 14, fontWeight: 700 }}>
        <Link to="/menu">Menu</Link>
        <Link to="/staff">Staff</Link>
        <Link to="/pantry">Pantry</Link>
      </nav>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Staff</h1>
      <p style={{ color: '#64748b', marginBottom: 16 }}>
        PIN-enabled staff map to Supabase Auth + <code>tenant_users</code> + <code>staff_pins</code>.
      </p>
      {msg && <p style={{ fontWeight: 600 }}>{msg}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: 32 }}>
          {staff.map((s, i) => (
            <li
              key={s.user_id ?? i}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                <strong>{s.display_name}</strong> · {s.role}
              </span>
              <span style={{ color: '#64748b', fontSize: 13 }}>
                {s.has_pin === false ? 'no PIN' : s.active === false ? 'inactive' : 'active'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: 18 }}>Add staff</h2>
      <form onSubmit={onCreate} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        <input
          placeholder="Display name"
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          required
          style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
        >
          <option value="server">server</option>
          <option value="chef">chef</option>
          <option value="manager">manager</option>
          <option value="owner">owner</option>
          <option value="viewer">viewer</option>
        </select>
        <input
          placeholder="PIN (4–8 digits)"
          value={form.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value })}
          required
          pattern="\d{4,8}"
          style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        <button
          type="submit"
          style={{
            padding: 12,
            borderRadius: 8,
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Create staff
        </button>
      </form>
    </div>
  );
}
