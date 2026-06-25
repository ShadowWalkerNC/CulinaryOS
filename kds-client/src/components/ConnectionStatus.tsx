// Live dot in the header — shows Realtime connection state
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useKDSStore } from '../lib/store';

export function ConnectionStatus() {
  const tenantId = useKDSStore((s) => s.tenantId);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

  useEffect(() => {
    const channel = supabase
      .channel(`presence:kds:${tenantId}`)
      .subscribe((s) => {
        if (s === 'SUBSCRIBED')    setStatus('live');
        else if (s === 'CLOSED' || s === 'CHANNEL_ERROR') setStatus('error');
        else setStatus('connecting');
      });
    return () => { supabase.removeChannel(channel); };
  }, [tenantId]);

  const dot = status === 'live'
    ? 'bg-green-500'
    : status === 'error'
    ? 'bg-red-500'
    : 'bg-yellow-500 animate-pulse';

  const label = status === 'live' ? 'LIVE' : status === 'error' ? 'OFFLINE' : 'CONNECTING';

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-[#888888] text-xs font-mono">{label}</span>
    </div>
  );
}
