import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { usePOSStore } from '../lib/store';
import {
  flushDurableQueue,
  migrateLegacyQueueToDurable,
  getPosDeviceId,
  apiHeaders,
  getApiBase,
} from '@culinaryos/shared';

export function ConnectionStatus() {
  const tenantId = usePOSStore((s) => s.tenantId);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const flushing = useRef(false);

  async function flushPending() {
    if (flushing.current) return;
    flushing.current = true;
    try {
      // Tenant/device-partitioned durable queue (R4/P4a). A device-ID
      // failure skips this attempt; the queue is preserved for the next.
      let deviceId: string;
      try {
        deviceId = getPosDeviceId();
      } catch {
        return;
      }
      const scope = { tenantId, deviceId };
      // Best-effort safe legacy migration: failures preserve the legacy
      // original for a later retry and never block the durable flush.
      try {
        await migrateLegacyQueueToDurable(scope);
      } catch {
        // keep legacy for next attempt
      }
      // Durable flush acks only submitted known IDs for this tenant and
      // never submits card-like rows; failures preserve the queue.
      await flushDurableQueue(scope, getApiBase(), apiHeaders(tenantId));
    } catch {
      // keep queue for next attempt
    } finally {
      flushing.current = false;
    }
  }

  useEffect(() => {
    const onOnline = () => {
      setStatus('live');
      flushPending();
    };
    const onOffline = () => setStatus('error');

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    if (!navigator.onLine) setStatus('error');

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [tenantId]);

  useEffect(() => {
    if (!supabase) {
      // Demo mode — still try flush when browser is online
      if (navigator.onLine) {
        setStatus('live');
        flushPending();
      } else {
        setStatus('error');
      }
      return;
    }

    const channel = supabase!
      .channel(`presence:pos:${tenantId}`)
      .subscribe((s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('live');
          flushPending();
        } else if (s === 'CLOSED' || s === 'CHANNEL_ERROR') {
          setStatus('error');
        } else {
          setStatus('connecting');
        }
      });
    return () => { supabase!.removeChannel(channel); };
  }, [tenantId]);

  const dot = status === 'live' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse';
  const label = { live: 'LIVE', error: 'OFFLINE', connecting: 'CONNECTING' }[status];

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-[#888888] text-xs font-mono">{label}</span>
    </div>
  );
}
