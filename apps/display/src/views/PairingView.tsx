// ============================================================
// CulinaryOS — TV Display Pairing Screen
// Large 6-digit code, QR code for instant phone pairing, auto-transition
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisplayShell } from '@culinaryos/display';
import { DisplayClient } from '@culinaryos/display';
import { useRemoteDpadNavigation } from '@culinaryos/display';

export const PairingView: React.FC = () => {
  const navigate = useNavigate();
  const [pairingCode, setPairingCode] = useState<string>('------');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const client = React.useMemo(() => new DisplayClient(), []);

  const registerDevice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await client.registerDevice('Walmart onn. 4K Box');
      // Format 6 digit code with space: 726 419
      const code = data.pairingCode;
      const formatted = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
      setPairingCode(formatted);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to CulinaryOS network');
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    registerDevice();
  }, [registerDevice]);

  // Check pairing status every 3 seconds
  useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      const session = await client.getSession();
      if (mounted && session && session.isPaired) {
        // Paired! Route to assigned mode
        const mode = session.assignedMode || 'kitchen';
        const view = session.assignedView || 'all';
        if (mode === 'kitchen') navigate(`/kitchen?station=${view}`);
        else if (mode === 'manager') navigate('/manager');
        else if (mode === 'staff') navigate('/staff');
        else if (mode === 'guest') navigate('/menu');
        else if (mode === 'pickup') navigate('/pickup');
        else if (mode === 'marketing') navigate('/promo');
        else navigate('/kitchen');
      }
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [client, navigate]);

  // Remote key support: Press OK to generate a fresh pairing code
  useRemoteDpadNavigation({
    onOk: () => registerDevice(),
  });

  const pairingUrl = 'https://culinaryos.app/displays';
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    pairingUrl
  )}&bgcolor=ffffff&color=000000&margin=2`;

  return (
    <DisplayShell
      brand="culinaryos"
      remoteHints={['[OK] Refresh Code', 'Go to culinaryos.app/displays on phone or tablet']}
    >
      <div className="flex-1 flex flex-col items-center justify-center -mt-8 font-mono">
        <div className="max-w-3xl w-full text-center flex flex-col items-center">
          {/* Logo Mark */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-5xl font-black tracking-tight text-white font-sans">
              CULINARY<span className="text-amber-400">OS</span>
            </span>
            <span className="text-xs uppercase bg-amber-400 text-black font-black px-3 py-1 rounded-md tracking-widest">
              DISPLAY
            </span>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-100 uppercase tracking-wide mb-2">
            Connect this display
          </h2>
          <p className="text-lg text-slate-400 font-sans mb-10">
            Open the Manager Hub on your phone, tablet, or workstation to pair this television.
          </p>

          {/* Pairing Code Big Box */}
          <div className="bg-[#0b121f] border-2 border-amber-400/80 rounded-3xl p-10 shadow-[0_0_50px_rgba(251,191,36,0.15)] flex flex-col items-center max-w-xl w-full mb-10">
            <span className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
              Go to: <span className="text-white font-black">culinaryos.app/displays</span>
            </span>

            <div className="text-xs font-semibold text-amber-400/80 uppercase tracking-widest mt-4">
              PAIRING CODE
            </div>

            <div className="my-3 text-7xl font-black text-amber-400 tracking-[0.25em] pl-4 font-mono select-all">
              {loading ? '...' : pairingCode}
            </div>

            {error ? (
              <span className="text-xs text-rose-400 font-bold mt-2">{error}</span>
            ) : (
              <span className="text-xs text-slate-400 font-semibold tracking-wide flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                Waiting for manager confirmation...
              </span>
            )}
          </div>

          {/* Instant QR Pairing */}
          <div className="flex items-center gap-6 bg-[#090d15] border border-slate-800 px-6 py-4 rounded-2xl">
            <div className="bg-white p-2 rounded-xl">
              <img src={qrApiUrl} alt="Pairing QR" className="w-24 h-24 object-contain" />
            </div>
            <div className="text-left font-sans">
              <div className="text-sm font-bold text-white uppercase tracking-wider">
                Instant Mobile Setup
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Scan QR code with your phone camera to open the Displays Hub directly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DisplayShell>
  );
};
