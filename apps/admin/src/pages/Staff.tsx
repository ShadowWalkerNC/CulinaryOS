import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
  Label,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Users,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
} from '@culinaryos/ui';
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
          <h1 className="text-xl font-black text-foreground uppercase tracking-wider">
            Staff & Access Control
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Manage restaurant personnel, role authorizations, and terminal PIN credentials (<code>staff_pins</code>).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="brand" className="px-2.5 py-1">
            {staff.length} Total Staff
          </Badge>
          <Badge variant="success" className="px-2.5 py-1">
            {pinConfiguredCount} PIN Active
          </Badge>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Toast */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fadeIn ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
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
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div>
                <CardTitle>Team Members Directory</CardTitle>
                <CardDescription>Personnel with POS and KDS terminal authorizations</CardDescription>
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">
                {activeStaffCount} Active Accounts
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground font-medium flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                <span>Loading staff records…</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name & ID</TableHead>
                    <TableHead>Role Level</TableHead>
                    <TableHead>Terminal PIN</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((s, i) => (
                    <TableRow key={s.user_id ?? i}>
                      <TableCell>
                        <div className="font-bold text-foreground text-sm">{s.display_name}</div>
                        {s.user_id && (
                          <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                            {s.user_id}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="brand">{s.role.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.has_pin !== false ? 'success' : 'warning'}>
                          {s.has_pin !== false ? 'PIN ACTIVE' : 'NO PIN'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={s.active !== false ? 'secondary' : 'destructive'}>
                          {s.active !== false ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!staff.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-xs text-muted-foreground">
                        No staff found. Use the provision form to add team members.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>

        {/* Right Column: Add Staff Form (1 col) */}
        <div>
          <Card className="p-5">
            <CardHeader className="p-0 pb-4 border-b border-border mb-4">
              <CardTitle>Add Staff Member</CardTitle>
              <CardDescription>Provision email, role, and terminal PIN</CardDescription>
            </CardHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="employee@restaurant.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="e.g. Alex Server"
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Assigned Role</Label>
                <select
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground font-bold capitalize"
                >
                  <option value="server">Server (POS Terminal)</option>
                  <option value="chef">Chef (Kitchen KDS)</option>
                  <option value="manager">Manager (Admin & Voids)</option>
                  <option value="owner">Owner (Full Permissions)</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pin">Terminal PIN (4–8 digits)</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  pattern="\d{4,8}"
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  required
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                  Used for quick POS/KDS lock screen authentication.
                </p>
              </div>

              <Button
                type="submit"
                variant="brand"
                size="touch"
                className="w-full mt-2"
                disabled={submitting}
              >
                <Lock className="w-4 h-4 mr-2" />
                {submitting ? 'Provisioning…' : 'Create Staff Member'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default StaffPage;
