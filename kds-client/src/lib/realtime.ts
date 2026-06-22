// ============================================================
// KDS Realtime — tickets + course fire notifications
// ============================================================

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, TENANT_ID }   from './supabase';
import type { KitchenTicket }    from './types';

export type ConnectionState = 'CONNECTING' | 'LIVE' | 'OFFLINE';

export interface CourseFiredNotice {
  orderId:       string;
  courseNumber:  number;
  firedTicketIds: string[];
  firedBy:       string;
  firedAt:       string;
}

export function useRealtimeTickets(
  station: string | null,
  onInsert: (t: KitchenTicket) => void,
  onUpdate: (t: KitchenTicket) => void,
  onDelete: (id: string)       => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connState, setConnState] = useState<ConnectionState>('CONNECTING');

  useEffect(() => {
    channelRef.current = supabase
      .channel(`kds:tickets:${TENANT_ID}:${station ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'kitchen_tickets',
          filter: `tenant_id=eq.${TENANT_ID}`,
        },
        (payload) => {
          const ticket = (payload.new ?? payload.old) as KitchenTicket;
          if (station && ticket.station !== station) return;

          if (payload.eventType === 'INSERT') onInsert(ticket);
          else if (payload.eventType === 'UPDATE') onUpdate(ticket);
          else if (payload.eventType === 'DELETE') onDelete(ticket.id);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED')   setConnState('LIVE');
        else if (status === 'CLOSED')  setConnState('OFFLINE');
        else                           setConnState('CONNECTING');
      });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [station]);

  return connState;
}

export function useCourseFiredNotices() {
  const [notices, setNotices] = useState<CourseFiredNotice[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = supabase
      .channel(`kds:course_fire_log:${TENANT_ID}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'course_fire_log',
          filter: `tenant_id=eq.${TENANT_ID}`,
        },
        (payload) => {
          const row = payload.new as any;
          setNotices((prev) => [
            {
              orderId:        row.order_id,
              courseNumber:   row.course_number,
              firedTicketIds: row.ticket_ids,
              firedBy:        row.fired_by,
              firedAt:        row.fired_at,
            },
            ...prev.slice(0, 9),  // keep last 10
          ]);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  function dismiss(orderId: string, courseNumber: number) {
    setNotices((prev) =>
      prev.filter((n) => !(n.orderId === orderId && n.courseNumber === courseNumber))
    );
  }

  return { notices, dismiss };
}
