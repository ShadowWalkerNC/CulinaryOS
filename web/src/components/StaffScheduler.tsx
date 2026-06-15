import React, { useState } from 'react';
import { Calendar, UserPlus, Check, X, ShieldAlert } from 'lucide-react';
import { StaffShift } from '../types';

const INITIAL_SHIFTS: StaffShift[] = [
  { id: 's1', staffName: 'Nate D.', role: 'Chef', startTime: '06:00', endTime: '14:00', hourlyRate: 35.00 },
  { id: 's2', staffName: 'Sarah K.', role: 'Sous Chef', startTime: '07:00', endTime: '15:00', hourlyRate: 25.00 },
  { id: 's3', staffName: 'Marcus L.', role: 'Line Cook', startTime: '11:00', endTime: '19:00', hourlyRate: 18.00 },
  { id: 's4', staffName: 'Emily R.', role: 'Server', startTime: '10:00', endTime: '16:00', hourlyRate: 15.00 },
  { id: 's5', staffName: 'Dave H.', role: 'Server', startTime: '16:00', endTime: '22:00', hourlyRate: 15.00 }
];

const MOCK_REQUESTS = [
  { id: 'r1', staffName: 'Sarah K.', date: '2026-06-20', reason: 'Doctor Appointment', status: 'pending' },
  { id: 'r2', staffName: 'Emily R.', date: '2026-06-22', reason: 'Family Event', status: 'pending' }
];

export const StaffScheduler: React.FC = () => {
  const [shifts, setShifts] = useState<StaffShift[]>(INITIAL_SHIFTS);
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  
  // New shift form state
  const [staffName, setStaffName] = useState<string>('');
  const [role, setRole] = useState<'Chef' | 'Sous Chef' | 'Line Cook' | 'Server'>('Line Cook');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<string>('18.00');
  
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const checkConflict = (name: string, start: string, end: string): boolean => {
    // Check if worker has an overlapping shift
    const workerShifts = shifts.filter(s => s.staffName.toLowerCase() === name.toLowerCase());
    for (const shift of workerShifts) {
      if (
        (start >= shift.startTime && start < shift.endTime) ||
        (end > shift.startTime && end <= shift.endTime) ||
        (start <= shift.startTime && end >= shift.endTime)
      ) {
        return true;
      }
    }
    return false;
  };

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!staffName || !startTime || !endTime) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('End time must be after start time.');
      return;
    }

    if (checkConflict(staffName, startTime, endTime)) {
      setErrorMsg(`Scheduling Conflict: ${staffName} is already scheduled during these hours.`);
      return;
    }

    const newShift: StaffShift = {
      id: Math.random().toString(),
      staffName,
      role,
      startTime,
      endTime,
      hourlyRate: parseFloat(hourlyRate) || 15.00
    };

    setShifts(prev => [...prev, newShift]);
    setSuccessMsg(`Shift logged successfully for ${staffName}.`);
    
    // Clear form
    setStaffName('');
    setStartTime('');
    setEndTime('');
  };

  const handleRequest = (id: string, action: 'approve' | 'deny') => {
    setRequests(prev => prev.map(r => r.id === id 
      ? { ...r, status: action === 'approve' ? 'Approved' : 'Denied' }
      : r
    ));
  };

  return (
    <div>
      <h2 className="title-xl">Staff Scheduler & HR</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
        {/* Left Side: Shift Roster */}
        <div>
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Today's Shift Roster
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {shifts.map(shift => (
                <div key={shift.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid var(--bg-tertiary)'
                }}>
                  <div>
                    <strong style={{ fontSize: '16px' }}>{shift.staffName}</strong>
                    <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>{shift.role}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>
                      {shift.startTime} - {shift.endTime}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--accent-orange)' }}>
                      ${shift.hourlyRate.toFixed(2)} / hr
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time Off Requests */}
          <div className="glass-card">
            <h3 className="title-lg">Pending Time-Off Requests</h3>
            {requests.filter(r => r.status === 'pending').length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No pending requests.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requests.map(req => (
                  <div key={req.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-primary)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--bg-tertiary)'
                  }}>
                    <div>
                      <strong>{req.staffName}</strong>
                      <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Date: {req.date} · Reason: "{req.reason}"
                      </span>
                      {req.status !== 'pending' && (
                        <span style={{
                          display: 'inline-block',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: req.status === 'Approved' ? 'var(--status-success)' : 'var(--status-danger)',
                          marginTop: '6px'
                        }}>
                          Status: {req.status}
                        </span>
                      )}
                    </div>
                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          onClick={() => handleRequest(req.id, 'approve')}
                          className="btn-secondary" 
                          style={{ color: 'var(--status-success)', borderColor: 'rgba(16,185,129,0.2)', padding: '6px 10px' }}
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => handleRequest(req.id, 'deny')}
                          className="btn-secondary" 
                          style={{ color: 'var(--status-danger)', borderColor: 'rgba(239,68,68,0.2)', padding: '6px 10px' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Add Shift Form */}
        <div>
          <div className="glass-card">
            <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} /> Schedule Shift
            </h3>

            {errorMsg && (
              <div style={{
                backgroundColor: 'rgba(239,68,68,0.1)',
                color: 'var(--status-danger)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid rgba(239,68,68,0.2)'
              }}>
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div style={{
                backgroundColor: 'rgba(16,185,129,0.1)',
                color: 'var(--status-success)',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleAddShift}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Staff Name</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={e => setStaffName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-main)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-family)'
                  }}
                  placeholder="e.g. Sarah K."
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-main)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-family)'
                  }}
                >
                  <option value="Chef">Chef</option>
                  <option value="Sous Chef">Sous Chef</option>
                  <option value="Line Cook">Line Cook</option>
                  <option value="Server">Server</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--bg-tertiary)',
                      color: 'var(--text-main)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-family)'
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--bg-tertiary)',
                      color: 'var(--text-main)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-family)'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.50"
                  value={hourlyRate}
                  onChange={e => setHourlyRate(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-main)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-family)'
                  }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Shift</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
