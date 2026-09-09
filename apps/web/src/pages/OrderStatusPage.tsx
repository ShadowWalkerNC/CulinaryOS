import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Button } from '@culinaryos/ui';
import { OrderStatusTracker } from '../components/OrderStatusTracker';

export function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 select-none">
      {/* Sub-Header Breadcrumb */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/menu/demo')}
            className="h-auto w-auto p-0 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-transparent hover:text-[#0f172a] [&>span]:gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Menu</span>
          </Button>
          <span className="text-xs font-mono font-bold text-slate-400">
            Order Reference: {orderId?.slice(0, 10)}...
          </span>
        </div>
      </div>

      {/* Tracker Main */}
      <main className="pb-16 pt-4">
        <OrderStatusTracker
          orderId={orderId ?? ''}
          onBackToMenu={() => navigate('/menu/demo')}
        />
      </main>
    </div>
  );
}
