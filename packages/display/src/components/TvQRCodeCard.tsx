// ============================================================
// CulinaryOS — TvQRCodeCard Component
// High-contrast QR code display for digital menus, loyalty & promotions
// ============================================================

import React from 'react';

export interface TvQRCodeCardProps {
  url: string;
  label?: string;
  callToAction?: string;
  brand?: 'culinaryos' | 'cheezies';
  className?: string;
}

export const TvQRCodeCard: React.FC<TvQRCodeCardProps> = ({
  url,
  label = 'ORDER ONLINE',
  callToAction = 'Scan with your smartphone camera',
  brand = 'culinaryos',
  className = '',
}) => {
  const isCheezies = brand === 'cheezies';
  // Standard high contrast dynamic SVG QR code generator endpoint or inline representation
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    url
  )}&bgcolor=ffffff&color=000000&margin=2`;

  return (
    <div
      className={`p-6 rounded-3xl border-2 flex flex-col items-center text-center shadow-2xl ${
        isCheezies
          ? 'bg-[#1a1202] border-amber-500/50 text-amber-50'
          : 'bg-[#0b111e] border-slate-700 text-slate-100'
      } ${className}`}
    >
      <div className="bg-white p-3 rounded-2xl shadow-inner mb-4">
        <img
          src={qrApiUrl}
          alt={label}
          className="w-48 h-48 object-contain rounded-lg"
          loading="lazy"
        />
      </div>

      <span className="text-xl font-black font-mono uppercase tracking-wider text-amber-400">
        {label}
      </span>
      <p className="text-xs font-semibold tracking-wide text-slate-400 mt-1 max-w-[200px]">
        {callToAction}
      </p>
    </div>
  );
};
