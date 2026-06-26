import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { CourseFireEvent } from '../types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Listens for INSERT events on course_fire_log.
 * Returns the latest CourseFireEvent; auto-clears after `ttlMs` (default 5s).
 * The KDS Station renders a CourseHoldBanner while this is non-null.
 */
export function useCourseFiredNotices(ttlMs = 5_000) {
  const [notice, setNotice] = useState<CourseFireEvent | null>(null);

  useEffect(() => {
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
      supabase.removeChannel(channel);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [ttlMs]);

  return notice;
}
