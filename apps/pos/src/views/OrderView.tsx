import { useState } from 'react';
import { useOrder, useFireOrder, useVoidOrder, useVoidLineItem, useApplyDiscount, useOpenDrawer, useVerifyManagerPin } from '../lib/queries';
import { usePOSStore } from '../lib/store';
import { calculateMultiRateTax } from '@culinaryos/shared';
import {
  Flame,
  CreditCard,
  Trash2,
  Tag,
  ClipboardList,
  Plus,
  Minus,
  Percent,
  X,
  Check,
  ShieldAlert,
  Lock,
  KeyRound,
  RotateCcw,
  Sparkles,
} from '@culinaryos/ui';

export function OrderView() {
  const { activeOrderId, setView, setActiveOrder } = usePOSStore();
  const { data: order, isLoading } = useOrder(activeOrderId);
  const { mutate: fireOrder, isPending: firing } = useFireOrder();
  const { mutate: voidOrder, isPending: voiding } = useVoidOrder();
  const { mutate: voidLineItem, isPending: voidingItem } = useVoidLineItem();
  const { mutate: applyDiscount } = useApplyDiscount();
  const { mutate: openDrawer, isPending: openingDrawer } = useOpenDrawer();
  const { mutateAsync: verifyManagerPin } = useVerifyManagerPin();

  // Modals state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [customPercentInput, setCustomPercentInput] = useState('');
  const [customFlatInput, setCustomFlatInput] = useState('');

  // Manager PIN Authorization Modal State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState<'void_order' | 'void_item' | 'high_comp' | 'open_drawer' | null>(null);
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  const [managerPinInput, setManagerPinInput] = useState('');
  const [reasonCode, setReasonCode] = useState<string>('customer_change');
  const [isCooked, setIsCooked] = useState<boolean>(true);
  const [pinNotes, setPinNotes] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pendingDiscount, setPendingDiscount] = useState<{ pct: number; flat: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  if (isLoading || !order) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-6 h-6 border-2 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPostSend = ['sent', 'in-progress', 'ready', 'served'].includes(order.status);
  const activeItems = (order.items || []).filter((i: any) => !i.is_voided);

  // Calculate Subtotal & Multi-Rate Tax
  const taxResult = calculateMultiRateTax(
    activeItems.map((i: any) => ({
      name: i.name,
      station: i.station,
      category: i.category,
      lineTotalCents: i.line_total || (i.unit_price * (i.quantity || 1)),
    }))
  );

  const subtotal = taxResult.subtotalCents;
  const discountPercent = order.discount_percent ?? 0;
  const discountFlat = order.discount_flat ?? 0;
  const discountAmount = Math.round(subtotal * (discountPercent / 100)) + discountFlat;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  
  // Effective multi-rate tax scaled to taxable subtotal
  const effectiveTaxRatio = subtotal > 0 ? taxableSubtotal / subtotal : 1;
  const tax = Math.round(taxResult.totalTaxCents * effectiveTaxRatio);
  const total = taxableSubtotal + tax;

  // --- Handlers for Actions & Manager PIN Gate ---

  function initiateVoidOrder() {
    if (!isPostSend) {
      if (confirm('Void this un-sent order?')) {
        voidOrder({ orderId: order.id, reason: 'un_sent_cancel', isCooked: false });
        triggerToast('Order voided');
      }
      return;
    }
    setPinAction('void_order');
    setTargetItemId(null);
    setReasonCode('customer_change');
    setIsCooked(true);
    setManagerPinInput('');
    setPinNotes('');
    setPinError(null);
    setShowPinModal(true);
  }

  function initiateVoidItem(itemId: string) {
    if (!isPostSend) {
      if (confirm('Remove this un-sent item?')) {
        voidLineItem({ orderId: order.id, itemId, reason: 'un_sent_remove', isCooked: false });
        triggerToast('Item removed');
      }
      return;
    }
    setPinAction('void_item');
    setTargetItemId(itemId);
    setReasonCode('kitchen_error');
    setIsCooked(true);
    setManagerPinInput('');
    setPinNotes('');
    setPinError(null);
    setShowPinModal(true);
  }

  function initiateDrawerOpen() {
    setPinAction('open_drawer');
    setReasonCode('no_sale_open');
    setManagerPinInput('');
    setPinNotes('');
    setPinError(null);
    setShowPinModal(true);
  }

  function handleSetDiscount(pct: number, flat: number) {
    if (!order) return;
    // High discount threshold: > 20% or > $15 requires Manager PIN
    const isHighComp = pct > 20 || flat > 1500;
    if (isHighComp) {
      setPendingDiscount({ pct, flat });
      setPinAction('high_comp');
      setReasonCode('vip_comp');
      setManagerPinInput('');
      setPinNotes('');
      setPinError(null);
      setShowDiscountModal(false);
      setShowPinModal(true);
      return;
    }

    applyDiscount({ orderId: order.id, discountPercent: pct, discountFlat: flat });
    setShowDiscountModal(false);
    triggerToast(`Discount applied: ${pct > 0 ? `${pct}%` : `$${(flat / 100).toFixed(2)}`}`);
  }

  function handleApplyCustomDiscount() {
    const pct = parseFloat(customPercentInput || '0');
    const flat = Math.round(parseFloat(customFlatInput || '0') * 100);
    handleSetDiscount(isNaN(pct) ? 0 : pct, isNaN(flat) ? 0 : flat);
  }

  async function handleConfirmManagerPin() {
    if (!managerPinInput.trim()) {
      setPinError('Please enter a 4–8 digit Manager PIN');
      return;
    }

    try {
      const auth = await verifyManagerPin(managerPinInput.trim());
      if (!auth.authorized) {
        setPinError(auth.error || 'Invalid manager authorization PIN');
        return;
      }

      // Execute protected action
      if (pinAction === 'void_order') {
        voidOrder({
          orderId: order.id,
          managerPin: managerPinInput.trim(),
          reasonCode,
          isCooked,
          notes: pinNotes,
        });
        setShowPinModal(false);
        triggerToast(`Order voided by ${auth.managerName || 'Manager'}${isCooked ? ' (Waste Debited)' : ''}`);
      } else if (pinAction === 'void_item' && targetItemId) {
        voidLineItem({
          orderId: order.id,
          itemId: targetItemId,
          managerPin: managerPinInput.trim(),
          reasonCode,
          isCooked,
          notes: pinNotes,
        });
        setShowPinModal(false);
        triggerToast(`Item voided by ${auth.managerName || 'Manager'}${isCooked ? ' (Waste Debited)' : ''}`);
      } else if (pinAction === 'open_drawer') {
        openDrawer({
          managerPin: managerPinInput.trim(),
          reason: reasonCode,
          notes: pinNotes,
        });
        setShowPinModal(false);
        triggerToast(`Cash drawer opened by ${auth.managerName || 'Manager'}`);
      } else if (pinAction === 'high_comp' && pendingDiscount) {
        applyDiscount({
          orderId: order.id,
          discountPercent: pendingDiscount.pct,
          discountFlat: pendingDiscount.flat,
        });
        setShowPinModal(false);
        triggerToast(`High Comp authorized by ${auth.managerName || 'Manager'}`);
      }
    } catch (err: any) {
      setPinError(err.message || 'Authorization failed');
    }
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-[#0f172a] text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg z-50 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Ticket Header */}
      <div className="p-3.5 border-b border-[#e5e7eb] flex items-center justify-between shrink-0 bg-[#f8f9fa]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black text-[#1f2937] uppercase tracking-wider">
              {order.table_number ? `Table ${order.table_number}` : 'Takeaway'}
            </h2>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                order.status === 'open'
                  ? 'bg-amber-100 text-amber-800'
                  : order.status === 'sent'
                  ? 'bg-blue-100 text-blue-800'
                  : order.status === 'in-progress'
                  ? 'bg-purple-100 text-purple-800'
                  : order.status === 'ready'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {order.status}
            </span>
          </div>
          {order.server_name && (
            <p className="text-[10px] text-[#6b7280] font-bold mt-0.5">Server: {order.server_name}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={initiateDrawerOpen}
            title="Pop Cash Drawer"
            className="text-[10px] font-black text-[#475569] bg-white hover:bg-[#f1f5f9] border border-[#cbd5e1] px-2.5 py-1 rounded-lg uppercase flex items-center gap-1 transition-colors shadow-2xs"
          >
            <KeyRound className="w-3 h-3 text-amber-600" />
            <span>Drawer</span>
          </button>
          <button
            onClick={() => setActiveOrder(null)}
            className="text-[10px] font-black text-[#0f172a] hover:underline uppercase"
          >
            Close
          </button>
        </div>
      </div>

      {/* Ticket Items (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-white">
        {order.items?.length === 0 ? (
          <div className="text-center text-[#9ca3af] mt-16 p-4">
            <p className="text-xs font-bold uppercase tracking-wider">Ticket Empty</p>
            <p className="text-[10px] text-[#9ca3af] mt-1 leading-normal">
              Tap items on the menu grid to add to this ticket.
            </p>
          </div>
        ) : (
          order.items?.map((item: any) => (
            <div
              key={item.id}
              className={`border-b border-[#f3f4f6] pb-2 flex justify-between items-start text-xs ${
                item.is_voided ? 'opacity-40 line-through bg-rose-50/50 p-1.5 rounded-lg' : ''
              }`}
            >
              <div className="flex-1 pr-2">
                <p className="text-[#1f2937] font-bold flex items-center gap-1">
                  {item.quantity > 1 && (
                    <span className="text-[#0f172a] font-black">{item.quantity}x</span>
                  )}
                  <span>{item.name}</span>
                  <span className="text-[9px] font-extrabold bg-[#f3f4f6] text-[#6b7280] px-1 py-0.2 rounded ml-1">
                    S{item.seat_number ?? 1}
                  </span>
                  {item.is_voided && (
                    <span className="text-[8px] font-black bg-rose-100 text-rose-800 px-1 rounded uppercase">
                      VOIDED ({item.void_reason || 'mistake'})
                    </span>
                  )}
                </p>
                {item.modifiers?.map((m: any) => (
                  <p key={m.id || m.name} className="text-[#6b7280] text-[10px] ml-3">
                    — {m.name}
                  </p>
                ))}
                {item.notes && (
                  <p className="text-[#f59e0b] text-[10px] ml-3 italic">{item.notes}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <p className="text-[#1f2937] font-bold font-mono">
                  ${((item.line_total || item.unit_price * (item.quantity || 1)) / 100).toFixed(2)}
                </p>
                {!item.is_voided && (
                  <button
                    onClick={() => initiateVoidItem(item.id)}
                    title="Void line item"
                    className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Totals & Operations */}
      <div className="p-3.5 border-t border-[#e5e7eb] bg-[#f8f9fa] shrink-0 space-y-3">
        <div className="space-y-1 text-[11px] text-[#6b7280]">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-mono">${(subtotal / 100).toFixed(2)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-red-500 font-semibold">
              <span>Discounts Applied</span>
              <span className="font-mono">-${(discountAmount / 100).toFixed(2)}</span>
            </div>
          )}

          {/* Multi-Rate Tax Breakdown */}
          {taxResult.breakdown.alcohol.taxAmountCents > 0 ? (
            <div className="space-y-0.5 border-t border-dashed border-[#e2e8f0] pt-1">
              <div className="flex justify-between text-[10px]">
                <span>Food Tax (8.25%)</span>
                <span className="font-mono">
                  ${(Math.round(taxResult.breakdown.preparedFood.taxAmountCents * effectiveTaxRatio) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Alcohol Tax (10.0%)</span>
                <span className="font-mono">
                  ${(Math.round(taxResult.breakdown.alcohol.taxAmountCents * effectiveTaxRatio) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-between">
              <span>Tax (8.25%)</span>
              <span className="font-mono">${(tax / 100).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-xs text-[#1f2937] font-black pt-1.5 border-t border-[#e5e7eb] uppercase">
            <span>Total</span>
            <span className="font-mono text-[#0f172a]">${(total / 100).toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {order.status === 'open' && (
            <button
              onClick={() => fireOrder(order.id)}
              disabled={firing || !order.items?.length}
              className="col-span-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl py-3.5 text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
            >
              <Flame className="w-4 h-4" />
              <span>{firing ? 'Sending to Kitchen...' : 'SEND TO KITCHEN'}</span>
            </button>
          )}

          {['sent', 'in-progress', 'ready'].includes(order.status) && (
            <button
              onClick={() => setView('checkout')}
              className="col-span-3 bg-[#0f172a] hover:bg-[#1e293b] text-white font-black rounded-xl py-3.5 text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
            >
              <CreditCard className="w-4 h-4" />
              <span>PROCEED TO PAY</span>
            </button>
          )}

          <button
            onClick={initiateVoidOrder}
            disabled={voiding}
            className="bg-white text-rose-600 hover:bg-rose-50 rounded-xl py-2.5 text-[11px] font-black transition-all uppercase border-2 border-rose-200 flex flex-col items-center justify-center gap-1 shadow-xs"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>{isPostSend ? 'Void (PIN)' : 'Void'}</span>
          </button>

          <button
            onClick={() => setShowDiscountModal(true)}
            className="bg-white text-[#0f172a] hover:bg-blue-50 rounded-xl py-2.5 text-[11px] font-black transition-all uppercase border-2 border-[#e5e7eb] flex flex-col items-center justify-center gap-1 shadow-xs"
          >
            <Tag className="w-4 h-4 text-slate-700" />
            <span>Promo</span>
          </button>

          <button
            onClick={() => setView('menu')}
            className="bg-white text-[#0f172a] hover:bg-blue-50 rounded-xl py-2.5 text-[11px] font-black transition-all uppercase border-2 border-[#e5e7eb] flex flex-col items-center justify-center gap-1 shadow-xs"
          >
            <ClipboardList className="w-4 h-4 text-slate-700" />
            <span>Menu</span>
          </button>
        </div>
      </div>

      {/* Coupon Discounts & Promo Modal */}
      {showDiscountModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl max-w-xs w-full p-5 shadow-2xl space-y-4">
            <div className="border-b border-[#e5e7eb] pb-2 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-[#0f172a] uppercase tracking-wider block">
                  Ticket Savings
                </span>
                <h3 className="text-sm font-black text-[#1f2937] uppercase">Coupon Discounts</h3>
              </div>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-xs font-bold text-[#9ca3af] hover:text-[#0f172a]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black text-[#6b7280] uppercase block">Preset Promotions</span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => handleSetDiscount(10, 0)}
                  className="w-full bg-[#f8f9fa] hover:bg-[#0f172a0d] border border-[#e5e7eb] hover:border-[#0f172a] p-2.5 rounded-xl text-left flex justify-between items-center transition-colors"
                >
                  <span className="text-xs font-bold text-[#1f2937]">10% Senior / Military Off</span>
                  <span className="text-[10px] font-black text-[#0f172a]">10% OFF</span>
                </button>

                <button
                  onClick={() => handleSetDiscount(0, 500)}
                  className="w-full bg-[#f8f9fa] hover:bg-[#0f172a0d] border border-[#e5e7eb] hover:border-[#0f172a] p-2.5 rounded-xl text-left flex justify-between items-center transition-colors"
                >
                  <span className="text-xs font-bold text-[#1f2937]">$5.00 Off Coupon</span>
                  <span className="text-[10px] font-black text-[#0f172a]">-$5.00</span>
                </button>

                <button
                  onClick={() => handleSetDiscount(15, 0)}
                  className="w-full bg-[#f8f9fa] hover:bg-[#0f172a0d] border border-[#e5e7eb] hover:border-[#0f172a] p-2.5 rounded-xl text-left flex justify-between items-center transition-colors"
                >
                  <span className="text-xs font-bold text-[#1f2937]">15% VIP Patron Discount</span>
                  <span className="text-[10px] font-black text-[#0f172a]">15% OFF</span>
                </button>

                <button
                  onClick={() => handleSetDiscount(25, 0)}
                  className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 p-2.5 rounded-xl text-left flex justify-between items-center transition-colors"
                >
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>25% Manager Comp</span>
                  </span>
                  <span className="text-[10px] font-black text-amber-800">PIN REQ</span>
                </button>
              </div>
            </div>

            <div className="border-t border-[#e5e7eb] pt-3 space-y-2">
              <span className="text-[10px] font-black text-[#6b7280] uppercase block">
                Custom Discount Override
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Discount %"
                  value={customPercentInput}
                  onChange={(e) => setCustomPercentInput(e.target.value)}
                  className="w-full bg-[#f9fafb] border border-[#cbd5e1] rounded-lg p-2 text-xs font-mono"
                />
                <input
                  type="number"
                  placeholder="Flat ($)"
                  value={customFlatInput}
                  onChange={(e) => setCustomFlatInput(e.target.value)}
                  className="w-full bg-[#f9fafb] border border-[#cbd5e1] rounded-lg p-2 text-xs font-mono"
                />
              </div>
              <button
                onClick={handleApplyCustomDiscount}
                className="w-full bg-[#1f2937] text-white rounded-lg py-2 text-[10px] font-black uppercase tracking-wider"
              >
                Apply Custom Promo
              </button>
            </div>

            <div className="border-t border-[#e5e7eb] pt-2">
              <button
                onClick={() => handleSetDiscount(0, 0)}
                className="w-full bg-red-50 text-red-600 hover:bg-red-100 rounded-lg py-2 text-[10px] font-bold uppercase"
              >
                Clear / Remove Discounts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* F3.1 & F3.2: Manager PIN Authorization & Void Governance Modal */}
      {/* ============================================================ */}
      {showPinModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border-2 border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-left">
            <div className="border-b border-[#e5e7eb] pb-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <ShieldAlert className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">
                    {pinAction === 'void_order'
                      ? 'Post-Send Order Void'
                      : pinAction === 'void_item'
                      ? 'Post-Send Item Void'
                      : pinAction === 'open_drawer'
                      ? 'Manual Drawer Open'
                      : 'Manager Authorization'}
                  </h3>
                  <p className="text-[10px] text-[#64748b] font-medium">Security Gatekeeper & Audit Ledger</p>
                </div>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {pinError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-xl font-bold flex items-center gap-1.5">
                <X className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Manager PIN Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#475569] uppercase tracking-wider block">
                Manager Authorization PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={8}
                  autoFocus
                  placeholder="Enter Manager PIN (Demo: 5678)"
                  value={managerPinInput}
                  onChange={(e) => {
                    setManagerPinInput(e.target.value);
                    setPinError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmManagerPin();
                  }}
                  className="w-full bg-[#f8fafc] border-2 border-[#cbd5e1] focus:border-[#0f172a] rounded-xl p-3 text-center text-base tracking-widest font-mono font-bold"
                />
              </div>
            </div>

            {/* Reason Code Dropdown */}
            {pinAction !== 'open_drawer' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#475569] uppercase tracking-wider block">
                  Mandatory Reason Code
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-xl p-2.5 text-xs font-semibold text-[#1e293b]"
                >
                  <option value="customer_change">Customer Changed Mind</option>
                  <option value="kitchen_error">Kitchen Error / Wrong Preparation</option>
                  <option value="damaged">Dropped or Damaged Plate</option>
                  <option value="spill">Spill Incident</option>
                  <option value="wrong_order">Server Entry Mistake</option>
                  <option value="cold_food">Customer Returned / Cold Food</option>
                  <option value="86d_after_order">86'd After Order Placed</option>
                  <option value="vip_comp">VIP Patron Courtesy Comp</option>
                  <option value="other">Other Manager Override</option>
                </select>
              </div>
            )}

            {/* F3.2 Automated Waste Debiting Checkbox */}
            {(pinAction === 'void_order' || pinAction === 'void_item') && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCooked}
                    onChange={(e) => setIsCooked(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                  />
                  <span className="text-xs font-bold text-rose-900">
                    Food was prepped/cooked (Auto-log waste)
                  </span>
                </label>
                <p className="text-[10px] text-rose-700 ml-6 leading-tight">
                  Automatically reduces inventory and writes scrap loss to the food cost variance ledger.
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Audit notes (optional)..."
                value={pinNotes}
                onChange={(e) => setPinNotes(e.target.value)}
                className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-xl p-2 text-xs font-medium"
              />
            </div>

            {/* Confirm & Cancel Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] font-black rounded-xl py-3 text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmManagerPin}
                className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-black rounded-xl py-3 text-xs uppercase tracking-wider transition-colors shadow-md"
              >
                Authorize & Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderView;
