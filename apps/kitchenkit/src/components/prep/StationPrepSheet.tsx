export interface StationPrepSheetItem {
  id?: string;
  ingredient_name: string;
  prep_amount: number;
  unit: string;
  is_done?: boolean;
  note?: string | null;
}

interface StationPrepSheetProps {
  shift: string;
  date: string;
  items: StationPrepSheetItem[];
  isSavedPlan?: boolean;
  planCompleted?: boolean;
  completedAt?: string | null;
  className?: string;
}

export default function StationPrepSheet({
  shift,
  date,
  items,
  isSavedPlan = false,
  planCompleted = false,
  completedAt,
  className = '',
}: StationPrepSheetProps) {
  const completedCount = items.filter((i) => i.is_done).length;
  const totalCount = items.length;

  return (
    <div className={`station-prep-sheet bg-white text-zinc-900 p-6 rounded-xl border border-zinc-200 shadow-sm print:p-0 print:border-none print:shadow-none ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold tracking-wider uppercase text-xs text-zinc-500">KitchenKit</span>
            <span className="text-zinc-300">•</span>
            <span className="font-semibold text-xs text-brand-700 print:text-zinc-700">Culinary Prep Planner</span>
          </div>
          <h1 className="text-xl font-extrabold text-zinc-900 tracking-tight">STATION PREP SHEET</h1>
          <p className="text-xs text-zinc-500 mt-1">Line Prep &amp; Mise en Place Checklist</p>
        </div>
        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-zinc-900 text-white font-bold text-sm rounded-md print:border print:border-zinc-900 print:bg-zinc-100 print:text-zinc-900">
            {shift} SHIFT
          </div>
          <div className="text-sm font-semibold text-zinc-800 mt-1.5">{date}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {completedCount} of {totalCount} Completed
          </div>
        </div>
      </div>

      {/* Verification / Shift Note Banner */}
      <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between text-xs text-zinc-700 print:bg-zinc-50">
        <div>
          <span className="font-bold">Station Instructions:</span> Check off items as completed. Label, date, and initial all prep containers.
          {!isSavedPlan && <span className="ml-2 font-semibold text-amber-700 print:text-zinc-600">(Unsaved Live Preview)</span>}
        </div>
        {planCompleted && (
          <div className="font-bold text-emerald-700 print:text-zinc-900">
            SHIFT COMPLETED {completedAt ? `(${new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
          </div>
        )}
      </div>

      {/* Prep Table */}
      {items.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 italic border border-dashed border-zinc-300 rounded-lg">
          No prep required for the {shift} shift. All items at par level.
        </div>
      ) : (
        <table className="station-prep-table w-full border-collapse">
          <thead>
            <tr className="bg-zinc-100 text-zinc-800 text-xs font-bold uppercase tracking-wider border-b-2 border-zinc-300">
              <th className="py-2.5 px-3 text-center w-12">Done</th>
              <th className="py-2.5 px-3 text-left">Item / Prep Name</th>
              <th className="py-2.5 px-3 text-right w-32">Prep Qty</th>
              <th className="py-2.5 px-3 text-left w-48">Notes / Batch Spec</th>
              <th className="py-2.5 px-3 text-center w-24">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-sm">
            {items.map((item, idx) => (
              <tr key={item.id ?? `${item.ingredient_name}-${idx}`} className={item.is_done ? 'bg-zinc-50 print:bg-white' : ''}>
                {/* Large Checkbox Square */}
                <td className="py-3 px-3 text-center align-middle">
                  <div className={`w-6 h-6 mx-auto rounded border-2 flex items-center justify-center font-bold transition-colors ${
                    item.is_done
                      ? 'border-zinc-900 bg-zinc-900 text-white print:bg-zinc-200 print:text-zinc-900'
                      : 'border-zinc-400 bg-white'
                  }`}>
                    {item.is_done ? '✓' : ''}
                  </div>
                </td>
                {/* Item Name */}
                <td className="py-3 px-3">
                  <div className={`font-bold text-base ${item.is_done ? 'line-through text-zinc-400 print:text-zinc-600' : 'text-zinc-900'}`}>
                    {item.ingredient_name}
                  </div>
                </td>
                {/* Prep Amount & Unit */}
                <td className="py-3 px-3 text-right tabular-nums">
                  <span className={`inline-block font-extrabold text-base px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 print:bg-zinc-100 print:text-zinc-900 print:border-zinc-300 ${
                    item.is_done ? 'opacity-50 print:opacity-100' : ''
                  }`}>
                    +{item.prep_amount} {item.unit}
                  </span>
                </td>
                {/* Notes */}
                <td className="py-3 px-3 text-xs text-zinc-600">
                  {item.note ? item.note : <span className="text-zinc-300 print:text-zinc-200">______________________</span>}
                </td>
                {/* Line Verification / Time Signature */}
                <td className="py-3 px-3 text-center text-xs text-zinc-400">
                  {item.is_done ? 'DONE' : <span className="text-zinc-300 print:text-zinc-200">___:___</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer Sign-off Block */}
      <div className="mt-8 pt-4 border-t border-zinc-300 flex flex-wrap justify-between gap-4 text-xs text-zinc-600">
        <div>
          <span>Prepared By: ___________________________</span>
        </div>
        <div>
          <span>Sous / Head Chef Sign-off: ___________________________</span>
        </div>
        <div>
          <span>Printed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
