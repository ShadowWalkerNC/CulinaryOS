import { useState, useEffect } from 'react';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PairingModal({ isOpen, onClose }: PairingModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [lanIp, setLanIp] = useState<string>('127.0.0.1');
  const [activeSurface, setActiveSurface] = useState<string>('desktop');
  const [copied, setCopied] = useState<boolean>(false);

  const fetchPairingInfo = async () => {
    try {
      const res = await fetch('http://localhost:5188/api/pairing-qr');
      if (res.ok) {
        const data = await res.json();
        setQrDataUrl(data.qrDataUrl);
        setLanIp(data.pairing.lanIp);
      } else {
        throw new Error('Offline');
      }
    } catch {
      // Fallback
      setLanIp(window.location.hostname || '127.0.0.1');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPairingInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const surfacePorts: Record<string, { port: number; path: string; name: string; desc: string }> = {
    desktop: { port: 5180, path: '', name: 'Desktop Workstation', desc: 'Unified multi-surface restaurant workstation' },
    pos: { port: 5172, path: '', name: 'Handheld POS Terminal', desc: 'Server handheld ordering & tap-to-pay' },
    kds: { port: 5173, path: '', name: 'Kitchen KDS Screen', desc: 'Kitchen line & prep station display' },
    tableside: { port: 5176, path: '/table/demo/1', name: 'Tableside Guest QR', desc: 'Dine-in self-ordering & split payment' },
    admin: { port: 5174, path: '', name: 'Admin Back-Office', desc: 'Manager dashboard, inventory & reports' },
  };

  const current = surfacePorts[activeSurface] || surfacePorts.desktop;
  const currentUrl = `http://${lanIp}:${current.port}${current.path}`;
  const mdnsUrl = `http://culinaryos.local:${current.port}${current.path}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden text-slate-100 font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
              <span className="material-symbols-outlined text-2xl">qr_code_2</span>
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                Mobile & Tablet QR Pairing
              </h2>
              <p className="text-xs text-slate-400">
                Instantly connect iPads, Android handhelds, and Kitchen TVs over Wi-Fi
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Surface Switcher */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {Object.entries(surfacePorts).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setActiveSurface(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
                activeSurface === key
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        {/* QR Code & Pairing Instructions */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="bg-white p-3.5 rounded-2xl shadow-xl border-4 border-slate-800 mb-4 flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Pairing QR Code" className="w-56 h-56 rounded-lg" />
            ) : (
              <div className="w-56 h-56 flex flex-col items-center justify-center bg-slate-100 text-slate-600 rounded-lg p-4">
                <span className="material-symbols-outlined text-5xl mb-2 text-slate-800">qr_code</span>
                <span className="text-xs font-mono font-bold break-all text-slate-900">{currentUrl}</span>
              </div>
            )}
          </div>

          <h3 className="font-bold text-base text-slate-100">{current.name}</h3>
          <p className="text-xs text-slate-400 mb-3">{current.desc}</p>

          <div className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs mb-3 font-mono">
            <div className="text-left overflow-hidden">
              <span className="text-[10px] text-slate-500 uppercase block">Direct LAN URL</span>
              <span className="text-orange-400 font-bold truncate block">{currentUrl}</span>
            </div>
            <button
              onClick={copyUrl}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold shrink-0 transition"
            >
              {copied ? '✅ Copied!' : 'Copy Link'}
            </button>
          </div>

          <div className="w-full bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-left text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold mb-1">
              <span className="material-symbols-outlined text-sm text-emerald-400">cell_tower</span>
              <span>Zero-Config mDNS Discovery</span>
            </div>
            <span>Devices with mDNS support can also visit </span>
            <span className="font-mono text-cyan-400 font-bold">{mdnsUrl}</span>
            <span> directly on your local Wi-Fi without entering numeric IP addresses.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
