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

/**
 * Listens for INSERT events on course_fire_log.
 * Returns the latest CourseFireEvent; auto-clears after `ttlMs` (default 5s).
 * The KDS Station renders a CourseHoldBanner while this is non-null.
 */
export function useCourseFiredNotices(ttlMs = 5_000) {
  const [notice, setNotice] = useState<CourseFireEvent | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel('course-fire-log-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'course_fire_log' },
        (payload) => {
          const row = payload.new as any;
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

