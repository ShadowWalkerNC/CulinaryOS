import React from 'react';

export interface CulinaryHeaderProps {
  activeModule: 'pos' | 'kds' | 'web' | 'admin' | 'kitchenkit';
  tenantName?: string;
  serverStatus?: 'connected' | 'offline';
}

export const CulinaryHeader: React.FC<CulinaryHeaderProps> = ({
  activeModule,
  tenantName = 'Main Bistro',
  serverStatus = 'connected'
}) => {
  const modules = [
    { id: 'pos', label: 'POS Terminal', port: '5172', url: 'http://localhost:5172' },
    { id: 'kds', label: 'KDS Kitchen', port: '5173', url: 'http://localhost:5173' },
    { id: 'web', label: 'Web Store', port: '5176', url: 'http://localhost:5176' },
    { id: 'admin', label: 'Back Office', port: '5174', url: 'http://localhost:5174' },
    { id: 'kitchenkit', label: 'KitchenKit', port: '5175', url: 'http://localhost:5175' },
  ] as const;

  return (
    <header className="bg-white border-b border-[#e5e7eb] px-5 py-3 flex items-center justify-between shadow-xs shrink-0 select-none">
      {/* Brand Logo & Wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0f172a] text-white rounded-lg flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined filled text-[18px]">skillet</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-black text-sm text-[#0b1c30] uppercase tracking-wider">CulinaryOS</h1>
            <span className="bg-[#0f172a0d] text-[#0f172a] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-[#0f172a26]">
              Hub v0.3
            </span>
          </div>
          <p className="text-[10px] text-[#6b7280] font-medium">{tenantName}</p>
        </div>
      </div>

      {/* Cross-Application Module Navigation Tabs */}
      <nav className="flex items-center gap-1.5 bg-[#f8f9fa] border border-[#e5e7eb] p-1 rounded-xl">
        {modules.map((m) => {
          const isActive = activeModule === m.id;
          return (
            <a
              key={m.id}
              href={m.url}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-[#0f172a] shadow-xs border border-[#e5e7eb]'
                  : 'text-[#6b7280] hover:text-[#0b1c30] hover:bg-[#e5e7eb50]'
              }`}
            >
              <span>{m.label}</span>
              <span className={`text-[8px] px-1 py-0.5 rounded font-mono ${isActive ? 'bg-[#0f172a0d] text-[#0f172a]' : 'bg-[#e5e7eb] text-[#6b7280]'}`}>
                :{m.port}
              </span>
            </a>
          );
        })}
      </nav>

      {/* System Status Indicators */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#f8f9fa] border border-[#e5e7eb] px-3 py-1.5 rounded-xl text-[10px] text-[#6b7280]">
          <span className={`w-2 h-2 rounded-full ${serverStatus === 'connected' ? 'bg-[#22c55e] animate-pulse' : 'bg-red-500'}`} />
          <span className="font-semibold">{serverStatus === 'connected' ? 'LAN Connected' : 'Offline'}</span>
          <span className="text-[#cbd5e1]">|</span>
          <span className="font-mono text-[9px] font-bold text-[#0f172a]">MCP Ready</span>
        </div>
      </div>
    </header>
  );
};
