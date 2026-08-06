import { useEffect, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CourseFireEvent } from '../types';

let supabase: SupabaseClient | null = null;
try {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (url && key && !url.includes('your-project')) {
    supabase = createClient(url, key);
  }
} catch {
  // Supabase not available
}

const TENANT_ID = import.meta.env.VITE_TENANT_ID as string | undefined;

/**
 * Listens for INSERT events on course_fire_log (tenant-scoped).
 */
export function useCourseFiredNotices(ttlMs = 5_000) {
  const [notice, setNotice] = useState<CourseFireEvent | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    const filter = TENANT_ID ? `tenant_id=eq.${TENANT_ID}` : undefined;

    const channel = supabase
      .channel(TENANT_ID ? `course-fire-log:${TENANT_ID}` : 'course-fire-log-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_fire_log',
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const row = payload.new as any;
          if (TENANT_ID && row.tenant_id && row.tenant_id !== TENANT_ID) return;
          setNotice({
            orderId:        row.order_id,
            courseNumber:   row.course_number,
            firedTicketIds: row.ticket_ids ?? [],
            firedBy:        row.fired_by,
            firedAt:        row.fired_at,
          });
          if (clearTimer) clearTimeout(clearTimer);
          clearTimer = setTimeout(() => setNotice(null), ttlMs);
        }
      )
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [ttlMs]);

  return notice;
}
