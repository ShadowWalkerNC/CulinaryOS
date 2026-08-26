import { useState } from 'react';
import { useEmployees, useAddEmployee, useShifts, useAddShift, useDeleteShift } from '../hooks/useLabor';

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

  const [empForm, setEmpForm] = useState({ name: '', role: '', hourly_rate: '' });
  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    shift_date: '',
    shift_name: 'AM',
    start_time: '08:00',
    end_time: '16:00',
  });

  function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!empForm.name || !empForm.role || !empForm.hourly_rate) return;
    addEmployee.mutate({
      name: empForm.name,
      role: empForm.role,
      hourly_rate: parseFloat(empForm.hourly_rate),
    });
    setEmpForm({ name: '', role: '', hourly_rate: '' });
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
    setShiftForm({ ...shiftForm, shift_date: '' });
  }

  const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-full focus:outline-none focus:border-amber-500';
  const btnCls = 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Labor</h1>
        <p className="text-zinc-400 text-sm">Shift scheduling · Labor cost tracking</p>
      </div>

      {/* Add Employee */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Add Employee</h2>
        <form onSubmit={handleAddEmployee} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className={inputCls} placeholder="Name" value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="Role (e.g. Line Cook)" value={empForm.role} onChange={e => setEmpForm(f => ({ ...f, role: e.target.value }))} />
          <input className={inputCls} type="number" placeholder="Hourly Rate" value={empForm.hourly_rate} onChange={e => setEmpForm(f => ({ ...f, hourly_rate: e.target.value }))} />
          <button type="submit" className={`${btnCls} sm:col-span-3`} disabled={addEmployee.isPending}>
            {addEmployee.isPending ? 'Adding…' : 'Add Employee'}
          </button>
        </form>
        {empLoading ? (
          <p className="text-zinc-500 text-sm mt-4">Loading employees…</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {employees.map(emp => (
              <li key={emp.id} className="flex justify-between text-sm py-1 border-b border-zinc-800">
                <span>{emp.name} <span className="text-zinc-500">· {emp.role}</span></span>
                <span className="text-amber-400">{fmt(emp.hourly_rate)}/hr</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Log Shift */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Log Shift</h2>
        <form onSubmit={handleAddShift} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select className={inputCls} value={shiftForm.employee_id} onChange={e => setShiftForm(f => ({ ...f, employee_id: e.target.value }))}>
            <option value="">Select employee…</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
          <input className={inputCls} type="date" value={shiftForm.shift_date} onChange={e => setShiftForm(f => ({ ...f, shift_date: e.target.value }))} />
          <select className={inputCls} value={shiftForm.shift_name} onChange={e => setShiftForm(f => ({ ...f, shift_name: e.target.value }))}>
            {['AM','PM','Brunch','Dinner','Night'].map(n => <option key={n}>{n}</option>)}
          </select>
          <input className={inputCls} type="time" value={shiftForm.start_time} onChange={e => setShiftForm(f => ({ ...f, start_time: e.target.value }))} />
          <input className={inputCls} type="time" value={shiftForm.end_time} onChange={e => setShiftForm(f => ({ ...f, end_time: e.target.value }))} />
          <button type="submit" className={btnCls} disabled={addShift.isPending}>
            {addShift.isPending ? 'Logging…' : 'Log Shift'}
          </button>
        </form>
      </section>

      {/* Shift Log */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Recent Shifts</h2>
        {shiftLoading ? (
          <p className="text-zinc-500 text-sm">Loading shifts…</p>
        ) : shifts.length === 0 ? (
          <p className="text-zinc-500 text-sm">No shifts logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                <th className="text-left pb-2">Date</th>
                <th className="text-left pb-2">Employee</th>
                <th className="text-left pb-2">Shift</th>
                <th className="text-left pb-2">Hours</th>
                <th className="text-right pb-2">Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => {
                const hrs = s.actual_hours ?? hoursFromShift(s.start_time, s.end_time);
                const rate = (s.employees as any)?.hourly_rate ?? 0;
                return (
                  <tr key={s.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                    <td className="py-2">{s.shift_date}</td>
                    <td className="py-2">{(s.employees as any)?.name ?? '—'}</td>
                    <td className="py-2">{s.shift_name}</td>
                    <td className="py-2">{hrs.toFixed(2)}</td>
                    <td className="py-2 text-right text-amber-400">{fmt(hrs * rate)}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => deleteShift.mutate(s.id)} className="text-zinc-600 hover:text-red-400 text-xs ml-4">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
