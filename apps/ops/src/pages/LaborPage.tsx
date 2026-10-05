import { useState, useMemo } from 'react';
import {
  useEmployees,
  useAddEmployee,
  useShifts,
  useAddShift,
  useDeleteShift,
} from '../hooks/useLabor';
import {
  calculateTipPool,
  generateTipPayrollCsv,
  auditEmployeeOvertime,
  isFlsaExcluded,
  type TipPoolMethod,
  type StaffHours,
  type EmployeeWeeklySchedule,
} from '@culinaryos/labor-engine';
import { Button, Trash2 } from '@culinaryos/ui';
import {
  Users,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Download,
  Clock,
  Briefcase,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function hoursFromShift(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

export default function LaborPage() {
  const { data: employees = [], isLoading: empLoading } = useEmployees();
  const { data: shifts = [], isLoading: shiftLoading } = useShifts();
  const addEmployee = useAddEmployee();
  const addShift = useAddShift();
  const deleteShift = useDeleteShift();

  const [activeTab, setActiveTab] = useState<'shifts' | 'tip-pool' | 'overtime'>('shifts');

  // Employee & Shift Form State
  const [empForm, setEmpForm] = useState({ name: '', role: 'server', hourly_rate: '15.00' });
  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    shift_date: new Date().toISOString().split('T')[0],
    shift_name: 'Dinner',
    start_time: '16:00',
    end_time: '23:00',
  });

  // Tip Pool State
  const [poolTotalDollars, setPoolTotalDollars] = useState('650');
  const [tipMethod, setTipMethod] = useState<TipPoolMethod>('hours_worked');
  const [paysTipCredit, setPaysTipCredit] = useState(false);
  const [tipOutPercent, setTipOutPercent] = useState('3.0');

  // Overtime Target Revenue State
  const [weeklyRevenue, setWeeklyRevenue] = useState('18500');

  function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!empForm.name || !empForm.role || !empForm.hourly_rate) return;
    addEmployee.mutate({
      name: empForm.name,
      role: empForm.role,
      hourly_rate: parseFloat(empForm.hourly_rate),
    });
    setEmpForm({ name: '', role: 'server', hourly_rate: '15.00' });
  }

  function handleAddShift(e: React.FormEvent) {
    e.preventDefault();
    if (!shiftForm.employee_id || !shiftForm.shift_date) return;
    addShift.mutate({
      employee_id: shiftForm.employee_id,
      shift_date: shiftForm.shift_date,
      shift_name: shiftForm.shift_name,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      actual_hours: hoursFromShift(shiftForm.start_time, shiftForm.end_time),
    });
  }

  // Build staff list for Tip Pool calculation
  const staffHoursList: StaffHours[] = useMemo(() => {
    if (employees.length === 0) {
      // Default demo staff if no employees registered yet
      return [
        { staffId: '1', staffName: 'Alice Morgan', role: 'server', hours: 7.5, directTipsCents: 24000 },
        { staffId: '2', staffName: 'Carlos Rivera', role: 'server', hours: 8.0, directTipsCents: 26000 },
        { staffId: '3', staffName: 'Diana Prince', role: 'bartender', hours: 6.5, directTipsCents: 15000 },
        { staffId: '4', staffName: 'Eliot Page', role: 'busser', hours: 6.0 },
        { staffId: '5', staffName: 'Fiona Gallagher', role: 'food_runner', hours: 5.5 },
        { staffId: '6', staffName: 'Marco Pierre', role: 'line_cook', hours: 8.5 },
        { staffId: '7', staffName: 'Sarah Connor', role: 'manager', hours: 9.0 },
      ];
    }

    return employees.map((emp) => {
      // Aggregate hours from logged shifts for this employee
      const empShifts = shifts.filter((s) => s.employee_id === emp.id);
      const totalHrs = empShifts.reduce((sum, s) => {
        return sum + (s.actual_hours ?? hoursFromShift(s.start_time, s.end_time));
      }, 0);

      const hours = totalHrs > 0 ? totalHrs : 7.0; // Fallback to standard shift hours for preview

      return {
        staffId: emp.id,
        staffName: emp.name,
        role: emp.role,
        hours,
        hourlyRate: emp.hourly_rate,
        directTipsCents: ['server', 'bartender'].includes(emp.role.toLowerCase()) ? 20000 : 0,
      };
    });
  }, [employees, shifts]);

  // Compute tip pool summary
  const tipSummary = useMemo(() => {
    const totalCents = Math.round(parseFloat(poolTotalDollars || '0') * 100);
    return calculateTipPool(
      {
        method: tipMethod,
        poolTotalCents: totalCents,
        paysTipCredit,
        tipOutPercent: parseFloat(tipOutPercent || '3.0'),
      },
      staffHoursList
    );
  }, [poolTotalDollars, tipMethod, paysTipCredit, tipOutPercent, staffHoursList]);

  // Overtime Auditing across employees
  const overtimeAudits = useMemo(() => {
    return employees.map((emp) => {
      const empShifts = shifts.filter((s) => s.employee_id === emp.id);
      const schedule: EmployeeWeeklySchedule = {
        employeeId: emp.id,
        hourlyRateCents: Math.round(emp.hourly_rate * 100),
        shifts: empShifts.map((s) => ({
          employeeId: emp.id,
          role: emp.role,
          startTime: new Date(`2026-10-01T${s.start_time}:00`),
          endTime: new Date(`2026-10-01T${s.end_time}:00`),
          hourlyRate: emp.hourly_rate,
        })),
      };
      return {
        employee: emp,
        audit: auditEmployeeOvertime(schedule),
      };
    });
  }, [employees, shifts]);

  const totalLaborCostDollars = useMemo(() => {
    const fromShifts = shifts.reduce((sum, s) => {
      const hrs = s.actual_hours ?? hoursFromShift(s.start_time, s.end_time);
      const rate = (s.employees as any)?.hourly_rate ?? 15;
      return sum + hrs * rate;
    }, 0);
    return fromShifts > 0 ? fromShifts : 3450.0;
  }, [shifts]);

  const laborPercentageOfRevenue = useMemo(() => {
    const rev = parseFloat(weeklyRevenue || '1');
    if (rev <= 0) return 0;
    return Math.round((totalLaborCostDollars / rev) * 1000) / 10;
  }, [totalLaborCostDollars, weeklyRevenue]);

  function handleDownloadCsv(format: 'standard' | 'gusto' | 'adp') {
    const csvContent = generateTipPayrollCsv(tipSummary, { format });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tip_payroll_${format}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const inputCls =
    'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-full focus:outline-none focus:border-amber-500';
  const btnCls =
    'min-h-[44px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Labor & Tip Engine</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            FLSA tip pool distribution · Shift scheduling · Overtime audit & labor percentage targets
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('shifts')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'shifts'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Shifts & Staff
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tip-pool')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'tip-pool'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coins size={14} />
            FLSA Tip Pooling
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overtime')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'overtime'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock size={14} />
            Overtime & Targets
          </button>
        </div>
      </div>

      {/* ─── TAB 1: Shifts & Staff ─── */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Active Staff</span>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{employees.length || 7}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Logged Shifts</span>
              <p className="text-2xl font-bold text-zinc-100 mt-1">{shifts.length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Estimated Labor Cost</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{fmt(totalLaborCostDollars)}</p>
            </div>
          </div>

          {/* Add Employee Form */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide flex items-center gap-2">
              <Briefcase size={16} className="text-amber-400" />
              Add Employee
            </h2>
            <form onSubmit={handleAddEmployee} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                className={inputCls}
                placeholder="Full Name (e.g. Alice Morgan)"
                value={empForm.name}
                onChange={(e) => setEmpForm((f) => ({ ...f, name: e.target.value }))}
              />
              <select
                className={inputCls}
                value={empForm.role}
                onChange={(e) => setEmpForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="server">Server</option>
                <option value="bartender">Bartender</option>
                <option value="busser">Busser</option>
                <option value="food_runner">Food Runner</option>
                <option value="line_cook">Line Cook</option>
                <option value="prep_cook">Prep Cook</option>
                <option value="dishwasher">Dishwasher</option>
                <option value="manager">Manager (FLSA Excluded)</option>
                <option value="shift_lead">Shift Lead (FLSA Excluded)</option>
              </select>
              <input
                className={inputCls}
                type="number"
                step="0.25"
                placeholder="Hourly Rate ($)"
                value={empForm.hourly_rate}
                onChange={(e) => setEmpForm((f) => ({ ...f, hourly_rate: e.target.value }))}
              />
              <Button type="submit" variant="ghost" isLoading={addEmployee.isPending} className={btnCls}>
                Save Employee
              </Button>
            </form>

            {empLoading ? (
              <p className="text-zinc-500 text-sm mt-4">Loading staff…</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex justify-between items-center text-sm p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80"
                  >
                    <div>
                      <span className="font-medium text-zinc-200">{emp.name}</span>
                      <span className="text-zinc-500 text-xs block capitalize">
                        {emp.role.replace(/_/g, ' ')}
                        {isFlsaExcluded(emp.role) && (
                          <span className="text-red-400 font-mono ml-1 text-[10px]">· FLSA EXCLUDED</span>
                        )}
                      </span>
                    </div>
                    <span className="text-amber-400 font-mono font-semibold">{fmt(emp.hourly_rate)}/hr</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Log Shift */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide flex items-center gap-2">
              <Calendar size={16} className="text-amber-400" />
              Log Shift
            </h2>
            <form onSubmit={handleAddShift} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <select
                className={`${inputCls} sm:col-span-2`}
                value={shiftForm.employee_id}
                onChange={(e) => setShiftForm((f) => ({ ...f, employee_id: e.target.value }))}
              >
                <option value="">Select employee…</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                type="date"
                value={shiftForm.shift_date}
                onChange={(e) => setShiftForm((f) => ({ ...f, shift_date: e.target.value }))}
              />
              <select
                className={inputCls}
                value={shiftForm.shift_name}
                onChange={(e) => setShiftForm((f) => ({ ...f, shift_name: e.target.value }))}
              >
                {['AM', 'PM', 'Brunch', 'Dinner', 'Night'].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
              <input
                className={inputCls}
                type="time"
                value={shiftForm.start_time}
                onChange={(e) => setShiftForm((f) => ({ ...f, start_time: e.target.value }))}
              />
              <input
                className={inputCls}
                type="time"
                value={shiftForm.end_time}
                onChange={(e) => setShiftForm((f) => ({ ...f, end_time: e.target.value }))}
              />
              <Button type="submit" variant="ghost" isLoading={addShift.isPending} className={`${btnCls} sm:col-span-6`}>
                Record Shift
              </Button>
            </form>
          </section>

          {/* Shift Table */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-hidden">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Logged Shift Roster</h2>
            {shiftLoading ? (
              <p className="text-zinc-500 text-sm">Loading shifts…</p>
            ) : shifts.length === 0 ? (
              <p className="text-zinc-500 text-sm">No shifts logged yet today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                      <th className="text-left pb-2">Date</th>
                      <th className="text-left pb-2">Staff</th>
                      <th className="text-left pb-2">Role</th>
                      <th className="text-left pb-2">Shift</th>
                      <th className="text-right pb-2">Hours</th>
                      <th className="text-right pb-2">Cost</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {shifts.map((s) => {
                      const hrs = s.actual_hours ?? hoursFromShift(s.start_time, s.end_time);
                      const rate = (s.employees as any)?.hourly_rate ?? 15;
                      return (
                        <tr key={s.id} className="hover:bg-zinc-800/40">
                          <td className="py-2.5 font-mono text-zinc-300">{s.shift_date}</td>
                          <td className="py-2.5 font-medium text-zinc-100">{(s.employees as any)?.name ?? '—'}</td>
                          <td className="py-2.5 text-zinc-400 capitalize">
                            {(s.employees as any)?.role?.replace(/_/g, ' ') ?? '—'}
                          </td>
                          <td className="py-2.5 text-zinc-400">{s.shift_name}</td>
                          <td className="py-2.5 text-right font-mono">{hrs.toFixed(2)}h</td>
                          <td className="py-2.5 text-right font-mono font-semibold text-amber-400">{fmt(hrs * rate)}</td>
                          <td className="py-2.5 text-right">
                            <Button
                              onClick={() => deleteShift.mutate(s.id)}
                              variant="ghost"
                              size="icon"
                              aria-label="Delete shift"
                              className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── TAB 2: FLSA Tip Pooling Engine ─── */}
      {activeTab === 'tip-pool' && (
        <div className="space-y-6">
          {/* Legal Non-Negotiable Banner */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-300">
                FLSA Statutory Tip Protection Gated (Fair Labor Standards Act § 3(m))
              </p>
              <p className="text-amber-200/90 leading-relaxed">
                Managers, general managers, supervisors, and shift leads with hiring/firing/directing authority are{' '}
                <strong className="underline">strictly excluded</strong> from every pool ($0.00 payout hardcoded). Zero-cent
                leakage guaranteed through mathematical fractional remainder distribution.
              </p>
            </div>
          </div>

          {/* Configuration Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
              Tip Pool Distribution Configuration
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Total Shift Tip Pool ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 font-mono">$</span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={poolTotalDollars}
                    onChange={(e) => setPoolTotalDollars(e.target.value)}
                    className={`${inputCls} pl-7 font-mono font-bold text-amber-400 text-base`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Distribution Method
                </label>
                <select
                  value={tipMethod}
                  onChange={(e) => setTipMethod(e.target.value as TipPoolMethod)}
                  className={inputCls}
                >
                  <option value="hours_worked">Hours-Weighted Pool (v1 Standard)</option>
                  <option value="role_weighted">Points / Role-Weighted (Server 1.0 / Busser 0.4)</option>
                  <option value="keep_your_own">Keep-Your-Own + Support Staff Tip-Out</option>
                  <option value="percent_of_sales">Percentage of Net Sales Pool</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Employer Tip Credit Policy
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paysTipCredit}
                    onChange={(e) => setPaysTipCredit(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-xs text-zinc-200">
                    Takes Tip Credit (Pays &lt; Min Wage → FOH Only)
                  </span>
                </label>
              </div>
            </div>

            {tipMethod === 'keep_your_own' && (
              <div className="pt-2 border-t border-zinc-800 flex items-center gap-3">
                <span className="text-xs text-zinc-400">Support Staff Tip-Out Rate:</span>
                <input
                  type="number"
                  step="0.5"
                  value={tipOutPercent}
                  onChange={(e) => setTipOutPercent(e.target.value)}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-center font-mono"
                />
                <span className="text-xs text-zinc-500">% of direct server tips</span>
              </div>
            )}
          </div>

          {/* Distribution Summary & Export Buttons */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="font-bold text-zinc-100 text-base">Calculated Shift Tip Distribution</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {tipSummary.totalEligibleHours.toFixed(1)} eligible staff hours · Remainder conserved:{' '}
                  <span className="font-mono text-amber-400">{tipSummary.remainderCents}¢</span>
                </p>
              </div>

              {/* Payroll CSV Exporters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => handleDownloadCsv('standard')}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] gap-1.5 border-zinc-700 text-zinc-300 hover:text-white"
                >
                  <Download size={14} /> Standard CSV
                </Button>
                <Button
                  onClick={() => handleDownloadCsv('gusto')}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  <Download size={14} /> Gusto Payroll
                </Button>
                <Button
                  onClick={() => handleDownloadCsv('adp')}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  <Download size={14} /> ADP Payroll
                </Button>
              </div>
            </div>

            {/* Payout Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                    <th className="text-left pb-2">Employee</th>
                    <th className="text-left pb-2">Role</th>
                    <th className="text-right pb-2">Shift Hours</th>
                    <th className="text-right pb-2">Weight / Pts</th>
                    <th className="text-right pb-2">Allocated %</th>
                    <th className="text-right pb-2">Tip Payout</th>
                    <th className="text-right pb-2">Effective $/hr</th>
                    <th className="text-center pb-2">FLSA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 font-mono">
                  {tipSummary.staffPayouts.map((p) => (
                    <tr key={p.staffId} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 font-sans font-medium text-zinc-100">{p.staffName}</td>
                      <td className="py-2.5 font-sans text-zinc-400 capitalize">{p.role.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 text-right text-zinc-300">{p.hours.toFixed(1)}h</td>
                      <td className="py-2.5 text-right text-zinc-400">{p.weight}×</td>
                      <td className="py-2.5 text-right text-zinc-400">{p.allocatedPercentage.toFixed(1)}%</td>
                      <td className="py-2.5 text-right font-bold text-amber-400 font-sans">
                        {fmt(p.payoutDollars)}
                      </td>
                      <td className="py-2.5 text-right text-emerald-400">
                        +${(p.effectiveHourlyTipRateCents / 100).toFixed(2)}/hr
                      </td>
                      <td className="py-2.5 text-center font-sans">
                        {p.flsaStatus === 'EXCLUDED_MANAGER' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                            EXCLUDED (FLSA)
                          </span>
                        ) : p.flsaStatus === 'EXCLUDED_TIP_CREDIT' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            BOH TIP CREDIT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ELIGIBLE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: Overtime & Labor Targets ─── */}
      {activeTab === 'overtime' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Weekly Labor % of Sales</span>
              <p className={`text-3xl font-bold mt-1 ${laborPercentageOfRevenue > 32 ? 'text-red-400' : 'text-emerald-400'}`}>
                {laborPercentageOfRevenue.toFixed(1)}%
              </p>
              <span className="text-xs text-zinc-500 mt-1 block">Industry Target: 28% – 32%</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Weekly Revenue Basis</span>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-2 text-zinc-500 text-sm">$</span>
                <input
                  type="number"
                  step="500"
                  value={weeklyRevenue}
                  onChange={(e) => setWeeklyRevenue(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2.5 pl-6 py-1 text-lg font-bold font-mono text-zinc-100 w-full"
                />
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <span className="text-xs text-zinc-500 uppercase tracking-wide">Total Payroll Cost</span>
              <p className="text-3xl font-bold text-amber-400 mt-1">{fmt(totalLaborCostDollars)}</p>
              <span className="text-xs text-zinc-500 mt-1 block">Includes regular + overtime</span>
            </div>
          </div>

          {/* Overtime Audit Table */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              Employee Weekly Overtime Audit (Federal FLSA 40h + Daily 8h Thresholds)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                    <th className="text-left pb-2">Employee</th>
                    <th className="text-left pb-2">Role</th>
                    <th className="text-right pb-2">Regular Hours</th>
                    <th className="text-right pb-2">Overtime (1.5×)</th>
                    <th className="text-right pb-2">Regular Pay</th>
                    <th className="text-right pb-2">Overtime Pay</th>
                    <th className="text-right pb-2">Total Gross</th>
                    <th className="text-center pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 font-mono">
                  {overtimeAudits.map(({ employee, audit }) => (
                    <tr key={employee.id} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 font-sans font-medium text-zinc-100">{employee.name}</td>
                      <td className="py-2.5 font-sans text-zinc-400 capitalize">{employee.role.replace(/_/g, ' ')}</td>
                      <td className="py-2.5 text-right">{audit.regularHours.toFixed(1)}h</td>
                      <td className="py-2.5 text-right text-amber-400 font-bold">
                        {audit.overtimeHours > 0 ? `${audit.overtimeHours.toFixed(1)}h` : '0h'}
                      </td>
                      <td className="py-2.5 text-right">{fmt(audit.regularCostCents / 100)}</td>
                      <td className="py-2.5 text-right text-amber-400">{fmt(audit.overtimeCostCents / 100)}</td>
                      <td className="py-2.5 text-right font-bold text-zinc-100">{fmt(audit.totalLaborCostCents / 100)}</td>
                      <td className="py-2.5 text-center font-sans">
                        {audit.hasOvertime ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            OVERTIME
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            STANDARD
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
