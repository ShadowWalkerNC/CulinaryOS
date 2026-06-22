// Shows above ticket cards when there are held courses waiting
// so the KDS operator knows course 2 will appear automatically.

import { formatDistanceToNow } from 'date-fns';
import type { CourseFiredNotice } from '../lib/realtime';

interface HeldCourse {
  orderId:      string;
  tableNumber?: string | number | null;
  courseNumber: number;
  heldAt:       string;
}

interface Props {
  heldCourses:    HeldCourse[];
  firedNotices:   CourseFiredNotice[];
  onDismissNotice: (orderId: string, course: number) => void;
}

export function CourseHoldBanner({ heldCourses, firedNotices, onDismissNotice }: Props) {
  if (heldCourses.length === 0 && firedNotices.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {/* Fired notices — green flash */}
      {firedNotices.map((n) => (
        <div key={`${n.orderId}-${n.courseNumber}`}
          className="flex items-center justify-between bg-green-950 border border-green-700 rounded-lg px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-lg">🟢</span>
            <div>
              <p className="text-green-300 text-sm font-bold">
                Course {n.courseNumber} fired — {n.firedTicketIds.length} ticket{n.firedTicketIds.length !== 1 ? 's' : ''} now live
              </p>
              <p className="text-green-600 text-xs">
                Order {n.orderId.slice(0, 8)}… • {n.firedBy === 'auto' ? 'Auto-fired after course ' + (n.courseNumber - 1) : `Fired by ${n.firedBy}`}
              </p>
            </div>
          </div>
          <button onClick={() => onDismissNotice(n.orderId, n.courseNumber)}
            className="text-green-700 hover:text-green-400 text-sm">×</button>
        </div>
      ))}

      {/* Held courses — amber holding indicator */}
      {heldCourses.map((h) => (
        <div key={`${h.orderId}-${h.courseNumber}`}
          className="flex items-center gap-3 bg-yellow-950 border border-yellow-800 rounded-lg px-4 py-2.5">
          <span className="text-lg">⏸️</span>
          <div>
            <p className="text-yellow-300 text-sm font-semibold">
              Course {h.courseNumber} held
              {h.tableNumber ? ` — Table ${h.tableNumber}` : ''}
            </p>
            <p className="text-yellow-700 text-xs">
              Waiting for course {h.courseNumber - 1} to clear • held {formatDistanceToNow(new Date(h.heldAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
