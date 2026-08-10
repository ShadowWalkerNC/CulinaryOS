import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  status: string;
  station: string;
}

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${API}/v1/admin/menu/items`, { headers: apiHeaders() });
    const body = await res.json();
    if (body.ok) setItems(body.data?.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(item: MenuItem) {
    const next = item.status === 'available' ? '86' : 'available';
    const res = await fetch(`${API}/v1/admin/menu/items/${item.id}`, {
      method: 'PATCH',
      headers: apiHeaders(),
      body: JSON.stringify({ status: next }),
    });
    const body = await res.json();
    if (!body.ok) {
      setMsg(body.error?.message ?? 'Update failed');
      return;
    }
    setMsg(`${item.name} → ${next}`);
    void load();
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <nav style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 14, fontWeight: 700 }}>
        <Link to="/menu">Menu</Link>
        <Link to="/staff">Staff</Link>
        <Link to="/pantry">Pantry</Link>
      </nav>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Menu editor</h1>
      <p style={{ color: '#64748b', marginBottom: 16 }}>
        Thin admin — toggle availability (86) without SQL. Full editor expands later.
      </p>
      {msg && <p style={{ color: '#0f172a', fontWeight: 600 }}>{msg}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th>Price</th>
              <th>Station</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: 8 }}>
                  <strong>{item.name}</strong>
                  {item.description && (
                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.description}</div>
                  )}
                </td>
                <td>{dollars(item.price)}</td>
                <td>{item.station}</td>
                <td>{item.status}</td>
                <td>
                  <button
                    type="button"
                    onClick={() => void toggleStatus(item)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: item.status === 'available' ? '#0f172a' : '#f8fafc',
                      color: item.status === 'available' ? '#fff' : '#0f172a',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {item.status === 'available' ? '86 item' : 'Make available'}
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} style={{ padding: 16, color: '#64748b' }}>
                  No menu items — run <code>pnpm seed</code> against Supabase.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
