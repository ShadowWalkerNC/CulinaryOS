import type { CartState } from '../types';

interface Props {
  cart:         CartState;
  tenantSlug:   string;
  onClose:      () => void;
  onUpdateQty:  (id: string, qty: number) => void;
  onRemove:     (id: string) => void;
}

/**
 * CartDrawer — Phase 4a stub.
 * Renders the cart summary. Checkout flow (Phase 4b) wires in
 * guest info collection + POST /v1/online-orders + Stripe CheckoutDrawer.
 */
export function CartDrawer({ cart, onClose, onUpdateQty, onRemove: _onRemove }: Props) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        style={{ width: '400px', maxWidth: '100vw', background: 'var(--bg-card)', padding: '24px', height: '100dvh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Your cart</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        {cart.items.length === 0 && (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '40px' }}>Your cart is empty.</p>
        )}

        {cart.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: '14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</div>
              {item.modifiers.length > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {item.modifiers.map((m) => m.name).join(', ')}
                </div>
              )}
              {item.notes && (
                <div style={{ fontSize: '12px', color: 'var(--amber)', marginTop: '2px', fontStyle: 'italic' }}>{item.notes}</div>
              )}
              <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                ${(item.unit_price / 100).toFixed(2)}
              </div>
            </div>
            {/* Qty stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} style={stepBtn}>-</button>
              <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
              <button onClick={() => onUpdateQty(item.id, item.quantity + 1)} style={stepBtn}>+</button>
            </div>
          </div>
        ))}

        {cart.items.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', paddingTop: '4px' }}>
              <span>Total</span>
              <span>${(cart.total / 100).toFixed(2)}</span>
            </div>
            {/* Checkout CTA — wired in Phase 4b */}
            <button
              style={{ padding: '14px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}
              onClick={() => alert('Checkout coming in Phase 4b!')}
            >
              Proceed to checkout
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const stepBtn: React.CSSProperties = {
  width: '28px', height: '28px', borderRadius: '6px',
  border: '1px solid var(--border)', background: 'var(--bg-elevated)',
  color: 'var(--text)', fontWeight: 700, fontSize: '16px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
};
