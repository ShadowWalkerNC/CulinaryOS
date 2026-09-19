import React, { useState } from 'react';
import { useDevice } from '../context/DeviceContext';
import {
  ShieldCheck,
  Lock,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  KeyRound,
  Plus,
  Edit3,
} from '@culinaryos/ui';

interface RoleDefinition {
  id: string;
  name: string;
  level: string;
  flsaTipPoolEligible: boolean; // FLSA Rule 9: Managers/Owners EXCLUDED
  flsaNote: string;
  staffCount: number;
  permissions: {
    cashDrawer: boolean;
    voidComps: boolean;
    toggle86: boolean;
    viewPnL: boolean;
    editMenu: boolean;
    manageStaff: boolean;
  };
}

export function RolesManagementPage() {
  const { effectiveDevice } = useDevice();
  const [roles, setRoles] = useState<RoleDefinition[]>([
    {
      id: 'owner',
      name: 'Owner / Enterprise Admin',
      level: 'Tier 1',
      flsaTipPoolEligible: false,
      flsaNote: 'FLSA Law: Strict Exclusion (Hiring/Firing/Ownership)',
      staffCount: 2,
      permissions: { cashDrawer: true, voidComps: true, toggle86: true, viewPnL: true, editMenu: true, manageStaff: true },
    },
    {
      id: 'gm',
      name: 'General Manager (MOD)',
      level: 'Tier 2',
      flsaTipPoolEligible: false,
      flsaNote: 'FLSA Law: Strict Exclusion (Directs work & schedules)',
      staffCount: 3,
      permissions: { cashDrawer: true, voidComps: true, toggle86: true, viewPnL: true, editMenu: true, manageStaff: true },
    },
    {
      id: 'shift_lead',
      name: 'Shift Supervisor / Floor Lead',
      level: 'Tier 3',
      flsaTipPoolEligible: false,
      flsaNote: 'FLSA Law: Excluded if directing work >20% time',
      staffCount: 4,
      permissions: { cashDrawer: true, voidComps: true, toggle86: true, viewPnL: false, editMenu: false, manageStaff: false },
    },
    {
      id: 'server',
      name: 'FOH Server & Bartender',
      level: 'Tier 4',
      flsaTipPoolEligible: true,
      flsaNote: 'FLSA Law: Eligible for Tip Pool (Direct customer service)',
      staffCount: 18,
      permissions: { cashDrawer: true, voidComps: false, toggle86: true, viewPnL: false, editMenu: false, manageStaff: false },
    },
    {
      id: 'line_cook',
      name: 'BOH Line Cook & Prep Chef',
      level: 'Tier 5',
      flsaTipPoolEligible: true,
      flsaNote: 'FLSA Law: Eligible if restaurant pays full minimum wage',
      staffCount: 12,
      permissions: { cashDrawer: false, voidComps: false, toggle86: true, viewPnL: false, editMenu: false, manageStaff: false },
    },
  ]);

  const togglePermission = (roleId: string, permKey: keyof RoleDefinition['permissions']) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.id === roleId
          ? {
              ...r,
              permissions: {
                ...r.permissions,
                [permKey]: !r.permissions[permKey],
              },
            }
          : r
      )
    );
  };

  // Mobile View
  if (effectiveDevice === 'mobile') {
    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">My Role & Credentials</h2>
              <p className="text-[10px] text-slate-500">Active POS & Terminal Access</p>
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Role:</span>
              <span className="font-bold text-slate-900">General Manager (MOD)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Staff PIN:</span>
              <span className="font-mono font-bold text-slate-900">•••• (1234)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tip Pool Status:</span>
              <span className="font-bold text-red-600 text-[11px]">FLSA Exempt (Manager)</span>
            </div>
          </div>
        </div>

        {/* Roles Overview Cards */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Configured Roles (5)</h3>
          {roles.map((r) => (
            <div key={r.id} className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{r.name}</p>
                  <p className="text-[10px] text-slate-500">{r.staffCount} active employees</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  r.flsaTipPoolEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {r.flsaTipPoolEligible ? 'Tip Pool Legal' : 'Tip Excluded'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                {r.flsaNote}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Tablet View
  if (effectiveDevice === 'tablet') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-slate-950">Role & Access Management</h1>
            <p className="text-xs text-slate-500">FLSA tip-pool legality gates and touch permission controls</p>
          </div>
          <button
            type="button"
            className="min-h-[48px] px-4 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Role</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{r.name}</h3>
                  <p className="text-xs text-slate-500">{r.staffCount} staff assigned · {r.level}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  r.flsaTipPoolEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {r.flsaTipPoolEligible ? 'Tip Pool: Eligible' : 'FLSA: Excluded'}
                </span>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                {r.flsaNote}
              </p>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(r.permissions).map(([perm, granted]) => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => togglePermission(r.id, perm as keyof RoleDefinition['permissions'])}
                    className={`min-h-[44px] px-2.5 py-1.5 rounded-xl text-left border flex items-center justify-between active:scale-[0.97] ${
                      granted
                        ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 font-semibold'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <span className="capitalize">{perm.replace(/([A-Z])/g, ' $1')}</span>
                    {granted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop View: Comprehensive RBAC Permissions Matrix
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">User Roles & RBAC Matrix</h1>
          <p className="text-xs text-slate-500 font-medium">
            Granular terminal permissions, manager override authorizations, and FLSA Title 29 Tip Engine compliance gates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>FLSA Manager Exclusion Enforced in Code</span>
          </div>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Custom Role</span>
          </button>
        </div>
      </div>

      {/* RBAC Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Role-Based Access Control (RBAC) Permission Matrix</h3>
            <p className="text-xs text-slate-500">Click any permission toggle to immediately update active terminal credentials</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Real-time Staff PIN Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Role & Level</th>
                <th className="p-3.5">FLSA Tip Pool Gate</th>
                <th className="p-3.5 text-center">Cash Drawer</th>
                <th className="p-3.5 text-center">Void / Comps</th>
                <th className="p-3.5 text-center">86 Items</th>
                <th className="p-3.5 text-center">P&L Reports</th>
                <th className="p-3.5 text-center">Edit Menu</th>
                <th className="p-3.5 text-center">Staff & PINs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-3.5">
                    <p className="font-bold text-slate-900 text-sm">{r.name}</p>
                    <p className="text-[11px] text-slate-400">{r.staffCount} staff members · {r.level}</p>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                        r.flsaTipPoolEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {r.flsaTipPoolEligible ? 'Eligible Pool Member' : 'Legally Excluded'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{r.flsaNote}</p>
                  </td>
                  {(['cashDrawer', 'voidComps', 'toggle86', 'viewPnL', 'editMenu', 'manageStaff'] as const).map(
                    (permKey) => {
                      const granted = r.permissions[permKey];
                      return (
                        <td key={permKey} className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(r.id, permKey)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                              granted
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            }`}
                            title={`Toggle ${permKey}`}
                          >
                            {granted ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                      );
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
