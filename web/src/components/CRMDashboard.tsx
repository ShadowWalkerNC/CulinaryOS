import React, { useState } from 'react';
import { Users, Award, Shield, UserPlus } from 'lucide-react';
import { CRMCustomer } from '../types';

const INITIAL_CUSTOMERS: CRMCustomer[] = [
  { id: 'c1', name: 'Nate D.', email: 'nate@culinaryos.com', tier: 'Platinum', points: 1250, totalSpent: 980.50 },
  { id: 'c2', name: 'Alice M.', email: 'alice@example.com', tier: 'Gold', points: 620, totalSpent: 430.00 },
  { id: 'c3', name: 'Bob S.', email: 'bob@gmail.com', tier: 'Silver', points: 280, totalSpent: 195.00 },
  { id: 'c4', name: 'Clarissa J.', email: 'clarissa@outlook.com', tier: 'Bronze', points: 45, totalSpent: 35.00 }
];

export const CRMDashboard: React.FC = () => {
  const [customers, setCustomers] = useState<CRMCustomer[]>(INITIAL_CUSTOMERS);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  
  const [selectedCust, setSelectedCust] = useState<CRMCustomer | null>(null);
  const [pointAdjust, setPointAdjust] = useState<string>('50');
  
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const newCust: CRMCustomer = {
      id: Math.random().toString(),
      name,
      email,
      tier: 'Bronze',
      points: 0,
      totalSpent: 0.00
    };

    setCustomers(prev => [...prev, newCust]);
    setSuccessMsg(`Customer ${name} registered successfully!`);
    setName('');
    setEmail('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAdjustPoints = (multiplier: number) => {
    if (!selectedCust) return;
    const adjustment = parseInt(pointAdjust) * multiplier;
    if (isNaN(adjustment)) return;

    setCustomers(prev => prev.map(c => {
      if (c.id === selectedCust.id) {
        const nextPoints = Math.max(0, c.points + adjustment);
        
        // Auto-recalculate loyalty tier based on points
        let nextTier: CRMCustomer['tier'] = 'Bronze';
        if (nextPoints >= 1000) nextTier = 'Platinum';
        else if (nextPoints >= 500) nextTier = 'Gold';
        else if (nextPoints >= 150) nextTier = 'Silver';
        
        const updated = { ...c, points: nextPoints, tier: nextTier };
        setSelectedCust(updated);
        return updated;
      }
      return c;
    }));
  };

  const getTierColor = (tier: CRMCustomer['tier']): string => {
    switch (tier) {
      case 'Platinum': return '#e5e7eb'; // cool silver-white
      case 'Gold': return '#fbbf24'; // rich amber gold
      case 'Silver': return '#9ca3af'; // silver grey
      case 'Bronze': return '#b45309'; // copper bronze
    }
  };

  return (
    <div>
      <h2 className="title-xl">CRM & Customer Loyalty</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
        {/* Customer Directory */}
        <div>
          <div className="glass-card" style={{ padding: '0px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--bg-tertiary)' }}>
              <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0px' }}>
                <Users size={18} /> Registered Customer Log
              </h3>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--bg-tertiary)' }}>
                  <th style={{ padding: '16px' }}>Name</th>
                  <th style={{ padding: '16px' }}>Email</th>
                  <th style={{ padding: '16px' }}>Loyalty Tier</th>
                  <th style={{ padding: '16px' }}>Points Balance</th>
                  <th style={{ padding: '16px' }}>Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(cust => (
                  <tr 
                    key={cust.id} 
                    onClick={() => setSelectedCust(cust)}
                    style={{ 
                      borderBottom: '1px solid var(--bg-tertiary)',
                      cursor: 'pointer',
                      backgroundColor: selectedCust?.id === cust.id ? 'rgba(255,138,0,0.05)' : 'transparent'
                    }}
                  >
                    <td style={{ padding: '16px', fontWeight: '500' }}>{cust.name}</td>
                    <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{cust.email}</td>
                    <td style={{ padding: '16px' }}>
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: getTierColor(cust.tier),
                          fontWeight: '700',
                          fontSize: '12px'
                        }}
                      >
                        <Shield size={12} fill={getTierColor(cust.tier)} /> {cust.tier}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '600' }}>{cust.points} pts</td>
                    <td style={{ padding: '16px' }}>${cust.totalSpent.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div>
          {/* Selected Customer Panel */}
          {selectedCust && (
            <div className="glass-card" style={{ marginBottom: '24px', borderColor: 'var(--accent-orange)' }}>
              <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--accent-orange)" /> Manage Rewards
              </h3>
              <p style={{ fontSize: '15px', marginBottom: '8px' }}>
                Customer: <strong>{selectedCust.name}</strong>
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Tier: <strong style={{ color: getTierColor(selectedCust.tier) }}>{selectedCust.tier}</strong> | Balance: <strong>{selectedCust.points} pts</strong>
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Point Adjustment</label>
                <input
                  type="number"
                  value={pointAdjust}
                  onChange={e => setPointAdjust(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-main)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-family)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleAdjustPoints(1)} 
                  className="btn-primary" 
                  style={{ flexGrow: 1 }}
                >
                  Add
                </button>
                <button 
                  onClick={() => handleAdjustPoints(-1)} 
                  className="btn-secondary" 
                  style={{ flexGrow: 1 }}
                >
                  Deduct
                </button>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} /> Register Customer
            </h3>

            {successMsg && (
              <div style={{
                backgroundColor: 'rgba(16,185,129,0.1)',
                color: 'var(--status-success)',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '12px',
                textAlign: 'center'
              }}>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-main)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-family)'
                  }}
                  placeholder="e.g. Nate D."
                  required
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    color: 'var(--text-main)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-family)'
                  }}
                  placeholder="e.g. nate@culinaryos.com"
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Register</button>
            </form>
          </div>

          {/* Tier Rules */}
          <div className="glass-card">
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>Loyalty Program Parameters</h4>
            <ul style={{ fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Bronze:</strong> Entry level. Earn 1 pt per $1 spend.</li>
              <li><strong>Silver (150+ pts):</strong> Earn 1.1x multiplier points.</li>
              <li><strong>Gold (500+ pts):</strong> Earn 1.25x points + 5% off online checkout.</li>
              <li><strong>Platinum (1000+ pts):</strong> Earn 1.5x points + VIP priority service.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
