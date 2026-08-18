import React, { useCallback, useEffect, useState } from 'react';
import { CulinaryCard, CulinaryButton, CulinaryBadge } from '@culinaryos/ui';
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
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    role: 'server',
    pin: '',
  });
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/admin/staff`, { headers: apiHeaders() });
      const body = await res.json();
      if (body.ok) {
        setStaff(body.data?.staff ?? []);
      } else {
        setMsg({ text: body.error?.message ?? 'Failed to load staff list', type: 'error' });
      }
    } catch {
      setMsg({ text: 'Failed to connect to API server', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/v1/admin/staff`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!body.ok) {
        setMsg({ text: body.error?.message ?? 'Staff creation failed', type: 'error' });
        return;
      }
      setMsg({
        text: `Successfully provisioned staff member: ${body.data?.display_name ?? form.display_name}`,
        type: 'success',
      });
      setForm({ email: '', display_name: '', role: 'server', pin: '' });
      void load();
    } catch {
      setMsg({ text: 'Network error while creating staff member', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  const activeStaffCount = staff.filter((s) => s.active !== false).length;
  const pinConfiguredCount = staff.filter((s) => s.has_pin !== false).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0b1c30] uppercase tracking-wider">
            Staff & Access Control
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Manage restaurant personnel, role authorizations, and terminal PIN credentials (<code>staff_pins</code>).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CulinaryBadge variant="brand">{staff.length} Total Staff</CulinaryBadge>
          <CulinaryBadge variant="success">{pinConfiguredCount} PIN Active</CulinaryBadge>
          <CulinaryButton variant="outline" size="sm" onClick={() => void load()}>
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Refresh
          </CulinaryButton>
        </div>
      </div>

      {/* Feedback Toast */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            msg.type === 'success'
              ? 'bg-[#22c55e10] border-[#22c55e30] text-[#16a34a]'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">
              {msg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs font-bold hover:underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Staff Directory (2 cols) */}
        <div className="lg:col-span-2">
          <CulinaryCard
            title="Team Members Directory"
            subtitle="Personnel with POS and KDS terminal authorizations"
            headerAction={
              <span className="text-[11px] font-bold text-[#6b7280]">
                {activeStaffCount} Active Accounts
              </span>
            }
          >
            {loading ? (
              <div className="py-12 text-center text-xs text-[#6b7280] font-medium flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin text-[24px] text-[#0f172a]">progress_activity</span>
                <span>Loading staff records…</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#e5e7eb] text-[10px] font-black uppercase tracking-wider text-[#6b7280]">
                      <th className="pb-3 px-3">Name & ID</th>
                      <th className="pb-3 px-3">Role Level</th>
                      <th className="pb-3 px-3">Terminal PIN</th>
                      <th className="pb-3 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6] text-xs">
                    {staff.map((s, i) => (
                      <tr key={s.user_id ?? i} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-[#0b1c30] text-sm">{s.display_name}</div>
                          {s.user_id && (
                            <div className="text-[10px] font-mono text-[#9ca3af] mt-0.5">
                              {s.user_id}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <CulinaryBadge variant="brand">
                            {s.role.toUpperCase()}
                          </CulinaryBadge>
                        </td>
                        <td className="py-3.5 px-3">
                          <CulinaryBadge variant={s.has_pin !== false ? 'success' : 'warning'}>
                            {s.has_pin !== false ? 'PIN ACTIVE' : 'NO PIN'}
                          </CulinaryBadge>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <CulinaryBadge variant={s.active !== false ? 'neutral' : 'danger'}>
                            {s.active !== false ? 'ACTIVE' : 'INACTIVE'}
                          </CulinaryBadge>
                        </td>
                      </tr>
                    ))}
                    {!staff.length && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-[#6b7280]">
                          No staff found. Use the provision form to add team members.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CulinaryCard>
        </div>

        {/* Right Column: Add Staff Form (1 col) */}
        <div>
          <CulinaryCard
            title="Add Staff Member"
            subtitle="Provision email, role, and terminal PIN"
          >
            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#6b7280] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="employee@restaurant.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#6b7280] mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Server"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#6b7280] mb-1">
                  Assigned Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all bg-white font-medium capitalize"
                >
                  <option value="server">Server (POS Terminal)</option>
                  <option value="chef">Chef (Kitchen KDS)</option>
                  <option value="manager">Manager (Admin & Voids)</option>
                  <option value="owner">Owner (Full Permissions)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#6b7280] mb-1">
                  Terminal PIN (4–8 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  pattern="\d{4,8}"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  required
                  className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a] focus:outline-none transition-all bg-white"
                />
                <p className="text-[10px] text-[#9ca3af] mt-1 font-medium">Used for quick POS/KDS lock screen authentication.</p>
              </div>

              <CulinaryButton
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                disabled={submitting}
              >
                {submitting ? 'Provisioning…' : 'Create Staff Member'}
              </CulinaryButton>
            </form>
          </CulinaryCard>
        </div>
      </div>
    </div>
  );
}

export default StaffPage;
