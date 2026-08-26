import { X, Printer, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import StationPrepSheet, { type StationPrepSheetItem } from './StationPrepSheet';

interface StationExportModalProps {
  shift: string;
  date: string;
  items: StationPrepSheetItem[];
  isSavedPlan?: boolean;
  planCompleted?: boolean;
  completedAt?: string | null;
  onClose: () => void;
}

export default function StationExportModal({
  shift,
  date,
  items,
  isSavedPlan = false,
  planCompleted = false,
  completedAt,
  onClose,
}: StationExportModalProps) {
  const [copied, setCopied] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleCopyText() {
    const textList = [
      `=== KITCHENKIT PREP LIST ===`,
      `Shift: ${shift} | Date: ${date}`,
      `Items count: ${items.length}`,
      `----------------------------`,
      ...items.map(
        (i) =>
          `[${i.is_done ? 'X' : ' '}] ${i.ingredient_name} — +${i.prep_amount} ${i.unit}${i.note ? ` (${i.note})` : ''}`
      ),
      `============================`,
    ].join('\n');

    navigator.clipboard.writeText(textList);
    setCopied(true);
    toast.success('Prep list copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="w-full max-w-4xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-brand-400" />
            <h2 className="font-bold text-zinc-100 text-lg">Station Prep Sheet Preview</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="btn-ghost text-sm flex items-center gap-1.5"
              title="Copy plain text list to clipboard"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy Text List'}
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Printer size={15} />
              Print Sheet
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5 ml-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900">
          <StationPrepSheet
            shift={shift}
            date={date}
            items={items}
            isSavedPlan={isSavedPlan}
            planCompleted={planCompleted}
            completedAt={completedAt}
          />
        </div>
      </div>
    </div>
  );
}
