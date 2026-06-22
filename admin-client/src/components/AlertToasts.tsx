import type { LiveAlert } from '../lib/realtime';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  alerts: LiveAlert[];
  dismiss: (id: string) => void;
}

export function AlertToasts({ alerts, dismiss }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50" style={{ maxWidth: 380 }}>
      {alerts.slice(0, 5).map((a) => (
        <div key={a.id}
          className={`rounded-lg px-4 py-3 flex items-start gap-3 shadow-xl border ${
            a.type === 'out_of_stock'  ? 'bg-red-950    border-red-800    text-red-200'
          : a.type === 'low_stock'    ? 'bg-yellow-950 border-yellow-800 text-yellow-200'
          :                            'bg-[#1a1a1a]  border-[#333333]  text-[#cccccc]'
          }`}>
          <span className="text-lg mt-0.5">
            {a.type === 'out_of_stock' ? '🚫' : a.type === 'low_stock' ? '⚠️' : '🔴'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {a.type === 'out_of_stock' ? 'OUT OF STOCK' : a.type === 'low_stock' ? 'LOW STOCK' : 'EVENT ERROR'}
            </p>
            <p className="text-xs mt-0.5 break-words">{a.message}</p>
            <p className="text-[10px] mt-1 opacity-60">
              {formatDistanceToNow(new Date(a.at), { addSuffix: true })}
            </p>
          </div>
          <button onClick={() => dismiss(a.id)}
            className="text-xs opacity-50 hover:opacity-100 flex-shrink-0">×</button>
        </div>
      ))}
    </div>
  );
}
