import { useState, useEffect } from 'react';
import type { OnlineOrder, OnlineOrderStatus } from '../types';
import { getOrder, updateOrderStatus } from '../lib/orderStore';
import {
  CheckCircle2,
  Clock,
  MapPin,
  ShoppingBag,
  ChefHat,
  Sparkles,
  ArrowRight,
  Phone,
  Receipt,
  Utensils,
  Share2,
} from '@culinaryos/ui';

interface Props {
  orderId: string;
  onBackToMenu?: () => void;
}

interface StageMeta {
  key: OnlineOrderStatus;
  label: string;
  sublabel: string;
  icon: string;
  description: string;
}

const STAGES: StageMeta[] = [
  {
    key: 'received',
    label: 'Order Confirmed',
    sublabel: 'Sent to Kitchen',
    icon: 'confirmed',
    description: 'The kitchen has received and ticketed your order.',
  },
  {
    key: 'preparing',
    label: 'Preparing Dishes',
    sublabel: 'Cooking on Station',
    icon: 'cooking',
    description: 'Our culinary team is crafting your meal from scratch.',
  },
  {
    key: 'ready',
    label: 'Ready / On The Way',
    sublabel: 'En Route or At Pass',
    icon: 'ready',
    description: 'Hot and packed, heading directly to your destination.',
  },
  {
    key: 'completed',
    label: 'Order Completed',
    sublabel: 'Delivered & Enjoyed',
    icon: 'completed',
    description: 'Your order has been fulfilled. Enjoy your meal.',
  },
];

export function OrderStatusTracker({ orderId, onBackToMenu }: Props) {
  const [order, setOrder] = useState<OnlineOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load order data
  useEffect(() => {
    const loaded = getOrder(orderId);
    setOrder(loaded);
    setLoading(false);

    // Auto-refresh simulation
    const interval = setInterval(() => {
      const current = getOrder(orderId);
      if (current) setOrder({ ...current });
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId]);

  function handleAdvanceStage() {
    if (!order) return;
    const currentIdx = getStageIndex(order.status);
    const nextIdx = (currentIdx + 1) % 4;
    const nextStageKeys: OnlineOrderStatus[] = [
      'received',
      'preparing',
      order.mode === 'delivery' ? 'out_for_delivery' : 'ready',
      'completed',
    ];
    const newStatus = nextStageKeys[nextIdx];
    const updated = updateOrderStatus(order.id, newStatus);
    if (updated) setOrder({ ...updated });
  }

  function handleShare() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-10 h-10 border-3 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-lg">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-4">
          <Receipt className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          We could not find an active ticket with reference <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono font-bold">{orderId}</code>.
        </p>
        {onBackToMenu && (
          <button
            type="button"
            onClick={onBackToMenu}
            className="px-6 py-3 bg-[#0f172a] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#1e293b] transition-all"
          >
            Back to Storefront
          </button>
        )}
      </div>
    );
  }

  const currentStageIdx = getStageIndex(order.status);
  const isDelivery = order.mode === 'delivery';

  // Customize Stage 3 label based on mode
  const displayStages = STAGES.map((s, idx) => {
    if (idx === 2) {
      return {
        ...s,
        label: isDelivery ? 'Out for Delivery' : 'Ready for Pickup',
        sublabel: isDelivery ? 'Driver Dispatched' : 'At the Pass',
        icon: isDelivery ? 'delivery' : 'pickup',
        description: isDelivery
          ? 'Your courier is en route with your fresh order.'
          : 'Your order is hot and ready at the pickup counter.',
      };
    }
    return s;
  });

  const activeStage = displayStages[currentStageIdx];

  const renderStageIcon = (iconKey: string, className = "w-6 h-6") => {
    switch (iconKey) {
      case 'confirmed':
        return <Receipt className={className} />;
      case 'cooking':
        return <ChefHat className={className} />;
      case 'ready':
      case 'pickup':
        return <ShoppingBag className={className} />;
      case 'delivery':
        return <ShoppingBag className={className} />;
      case 'completed':
        return <CheckCircle2 className={className} />;
      default:
        return <Clock className={className} />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Live Order Hero Status Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm text-center relative overflow-hidden">
        {/* Glowing Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-[#0f172a] to-blue-500" />

        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 animate-pulseGlow">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Live Order Tracking</span>
        </div>

        <div className="flex justify-center text-slate-800 mb-3">
          {renderStageIcon(activeStage.icon, "w-10 h-10")}
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          {activeStage.label}
        </h1>
        <p className="text-xs md:text-sm text-slate-500 font-medium max-w-md mx-auto mt-1">
          {activeStage.description}
        </p>

        {/* ETA & Order Badge */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Order Number
            </span>
            <span className="font-mono font-black text-base text-slate-900">
              #{order.orderNumber}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              {isDelivery ? 'Est. Arrival' : 'Est. Ready'}
            </span>
            <span className="font-mono font-black text-base text-emerald-700">
              {order.estimatedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Visual 4-Stage Progress Tracker */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Preparation Lifecycle</span>
          </h3>

          {/* Demo Status Advancer */}
          <button
            type="button"
            onClick={handleAdvanceStage}
            className="px-2.5 py-1 bg-slate-100 hover:bg-[#0f172a] text-slate-700 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs"
            title="Advance lifecycle state for testing"
          >
            <span>Next Stage (Demo)</span>
          </button>
        </div>

        {/* Steps Progress Bar */}
        <div className="relative pt-2 pb-2">
          {/* Background Connecting Line */}
          <div className="absolute top-7 left-8 right-8 h-1 bg-slate-100 -translate-y-1/2 z-0">
            <div
              className="h-full bg-[#0f172a] transition-all duration-500 ease-out"
              style={{ width: `${(currentStageIdx / (displayStages.length - 1)) * 100}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="relative z-10 flex justify-between">
            {displayStages.map((stage, idx) => {
              const isDone = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;

              return (
                <div key={stage.key} className="flex flex-col items-center text-center w-24">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      isCurrent
                        ? 'bg-[#0f172a] text-white shadow-md scale-110 ring-4 ring-slate-100'
                        : isDone
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : renderStageIcon(stage.icon, "w-4 h-4")}
                  </div>
                  <span
                    className={`text-xs mt-2.5 font-bold leading-tight ${
                      isCurrent ? 'text-slate-900' : isDone ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                    {stage.sublabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customer & Fulfillment Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Customer Information
          </span>
          <p className="font-bold text-sm text-slate-900">{order.customer.name}</p>
          <p className="text-xs text-slate-600 font-mono">{order.customer.phone}</p>
          {order.customer.email && (
            <p className="text-xs text-slate-500">{order.customer.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            {isDelivery ? 'Delivery Location' : 'Pickup Location'}
          </span>
          {isDelivery ? (
            <>
              <p className="font-bold text-sm text-slate-900 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span>{order.customer.address}</span>
              </p>
              {order.customer.deliveryNotes && (
                <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-xl mt-1 border border-slate-100">
                  "{order.customer.deliveryNotes}"
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-bold text-sm text-slate-900">142 Mercer Street, Soho, NY</p>
              <p className="text-xs text-slate-500">
                Ready in {order.customer.pickupTime || '15-20 mins'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Itemized Order Receipt Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-slate-500" />
            <span>Itemized Receipt</span>
          </h3>
          <span className="text-xs font-mono font-bold text-slate-400">
            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex justify-between items-start">
              <div className="min-w-0 flex-1 pr-3">
                <p className="font-bold text-xs text-slate-900">
                  {item.quantity}x {item.name}
                </p>
                {item.modifiers.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {item.modifiers.map((m) => m.name).join(', ')}
                  </p>
                )}
                {item.notes && (
                  <p className="text-[11px] text-amber-700 italic mt-0.5">
                    Note: "{item.notes}"
                  </p>
                )}
              </div>
              <span className="font-mono font-bold text-xs text-slate-900 shrink-0">
                ${((item.unit_price * item.quantity) / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals Breakdown */}
        <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono text-slate-800">${(order.subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Estimated Tax</span>
            <span className="font-mono text-slate-800">${(order.tax / 100).toFixed(2)}</span>
          </div>
          {isDelivery && (
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-mono text-slate-800">
                ${(order.deliveryFee / 100).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Staff Tip</span>
            <span className="font-mono text-slate-800">${(order.tip / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200 font-black text-sm text-slate-900">
            <span>Total Paid</span>
            <span className="font-mono text-base">${(order.total / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {onBackToMenu && (
          <button
            type="button"
            onClick={onBackToMenu}
            className="flex-1 py-3.5 px-4 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
          >
            <Utensils className="w-4 h-4" />
            <span>Order More / Back to Menu</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleShare}
          className="py-3.5 px-5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
        >
          <Share2 className="w-4 h-4 text-slate-500" />
          <span>{copiedLink ? 'Link Copied!' : 'Share Live Tracker'}</span>
        </button>
      </div>
    </div>
  );
}

function getStageIndex(status: OnlineOrderStatus): number {
  switch (status) {
    case 'received':
      return 0;
    case 'preparing':
      return 1;
    case 'ready':
    case 'out_for_delivery':
      return 2;
    case 'completed':
      return 3;
    default:
      return 0;
  }
}
