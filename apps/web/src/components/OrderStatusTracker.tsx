import { useState, useEffect } from 'react';
import type { OnlineOrder, OnlineOrderStatus } from '../types';
import { getOrder, updateOrderStatus } from '../lib/orderStore';

interface Props {
  orderId: string;
  onBackToMenu?: () => void;
}

const STAGES: { key: OnlineOrderStatus; label: string; icon: string; desc: string }[] = [
  { key: 'received', label: 'Received', icon: '📋', desc: 'Order confirmed by restaurant' },
  { key: 'preparing', label: 'Preparing', icon: '🍳', desc: 'Kitchen is cooking your meal' },
  { key: 'ready', label: 'Ready / Out for Delivery', icon: '🛍️', desc: 'Ready for pickup or on the way' },
  { key: 'completed', label: 'Completed', icon: '🎉', desc: 'Order complete & enjoyed' },
];

export function OrderStatusTracker({ orderId, onBackToMenu }: Props) {
  const [order, setOrder] = useState<OnlineOrder | null>(null);
  const [loading, setLoading] = useState(true);

  // Load order data
  useEffect(() => {
    const loaded = getOrder(orderId);
    setOrder(loaded);
    setLoading(false);

    // Set up auto-refresh simulation for demo progression
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

  if (loading) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: '640px', margin: '0 auto', color: 'var(--text-muted)' }}>
        Loading order status…
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '60px 24px', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Order Not Found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
          We could not find an active order with ID: <code style={{ color: 'var(--accent)' }}>{orderId}</code>
        </p>
        {onBackToMenu && (
          <button
            onClick={onBackToMenu}
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Back to Menu
          </button>
        )}
      </div>
    );
  }

  const currentStageIdx = getStageIndex(order.status);
  const isDelivery = order.mode === 'delivery';

  // Customize Stage 3 label depending on mode
  const displayStages = STAGES.map((s, idx) => {
    if (idx === 2) {
      return {
        ...s,
        label: isDelivery ? 'Out for Delivery' : 'Ready for Pickup',
        icon: isDelivery ? '🚗' : '🛍️',
        desc: isDelivery ? 'Driver is on the way to you' : 'Hot & ready at the pass',
      };
    }
    return s;
  });

  const activeStage = displayStages[currentStageIdx];

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Status Header */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>{activeStage.icon}</div>
        <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700 }}>
          Order #{order.orderNumber}
        </h1>
        <div
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '999px',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: '13px',
            marginTop: '4px',
            marginBottom: '12px',
          }}
        >
          {activeStage.label}
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
          {activeStage.desc}
        </p>

        {/* Estimated Time Card */}
        <div
          style={{
            marginTop: '20px',
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '20px' }}>⏱️</span>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              {isDelivery ? 'Estimated Delivery Time' : 'Estimated Ready Time'}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
              {order.estimatedTime}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Progress Bar Tracker */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700 }}>Order Status Progress</span>
          <button
            onClick={handleAdvanceStage}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Simulate status progression"
          >
            ⚡ Advance Stage (Demo)
          </button>
        </div>

        {/* Visual Progress Steps */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Connecting Line */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '12%',
              right: '12%',
              height: '4px',
              background: 'var(--border)',
              zIndex: 1,
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--accent)',
                width: `${(currentStageIdx / (displayStages.length - 1)) * 100}%`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {displayStages.map((st, idx) => {
            const isCompleted = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            return (
              <div
                key={st.key}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '24%',
                  textAlign: 'center',
                }}
              >
                {/* Step Badge / Circle */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isCurrent ? 'var(--accent)' : isCompleted ? 'var(--green)' : 'var(--bg-elevated)',
                    border: `2px solid ${isCurrent ? 'var(--accent)' : isCompleted ? 'var(--green)' : 'var(--border)'}`,
                    color: isCurrent || isCompleted ? '#fff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px',
                    boxShadow: isCurrent ? '0 0 12px var(--accent)' : 'none',
                    transition: 'all 0.3s ease',
                    marginBottom: '8px',
                  }}
                >
                  {isCompleted ? '✓' : st.icon}
                </div>
                {/* Step Label */}
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? 'var(--accent)' : isCompleted ? 'var(--text)' : 'var(--text-muted)',
                    lineHeight: 1.2,
                  }}
                >
                  {st.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer & Delivery/Pickup Details */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <div style={detailHeader}>Customer Info</div>
          <div style={detailText}>{order.customer.name}</div>
          <div style={detailSubtext}>{order.customer.phone}</div>
          {order.customer.email && <div style={detailSubtext}>{order.customer.email}</div>}
        </div>

        <div>
          <div style={detailHeader}>{isDelivery ? 'Delivery Location' : 'Pickup Details'}</div>
          {isDelivery ? (
            <>
              <div style={detailText}>{order.customer.address || 'Address provided'}</div>
              {order.customer.deliveryNotes && (
                <div style={{ ...detailSubtext, fontStyle: 'italic', marginTop: '4px' }}>
                  Note: "{order.customer.deliveryNotes}"
                </div>
              )}
            </>
          ) : (
            <>
              <div style={detailText}>Requested: {order.customer.pickupTime || 'ASAP'}</div>
              <div style={detailSubtext}>Present Order #{order.orderNumber} at the counter</div>
            </>
          )}
        </div>
      </div>

      {/* Item Breakdown & Summary */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
        }}
      >
        <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700 }}>Item Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {order.items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingBottom: '10px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>
                  {item.quantity}x {item.name}
                </div>
                {item.modifiers.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {item.modifiers.map((m) => m.name).join(', ')}
                  </div>
                )}
                {item.notes && (
                  <div style={{ fontSize: '12px', color: 'var(--amber)', marginTop: '2px', fontStyle: 'italic' }}>
                    Notes: {item.notes}
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px', flexShrink: 0 }}>
                ${((item.unit_price * item.quantity) / 100).toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Totals Breakdown */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={sumRow}>
            <span>Subtotal</span>
            <span>${(order.subtotal / 100).toFixed(2)}</span>
          </div>
          <div style={sumRow}>
            <span>Tax</span>
            <span>${(order.tax / 100).toFixed(2)}</span>
          </div>
          {isDelivery && (
            <div style={sumRow}>
              <span>Delivery Fee</span>
              <span>${(order.deliveryFee / 100).toFixed(2)}</span>
            </div>
          )}
          <div style={sumRow}>
            <span>Tip</span>
            <span>${(order.tip / 100).toFixed(2)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '16px',
              borderTop: '1px dashed var(--border)',
              paddingTop: '8px',
              marginTop: '4px',
            }}
          >
            <span>Total Paid</span>
            <span>${(order.total / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Navigation CTA */}
      {onBackToMenu && (
        <button
          onClick={onBackToMenu}
          style={{
            padding: '14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'var(--bg-card)',
            color: 'var(--text)',
            fontWeight: 700,
            fontSize: '15px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          ← Back to Menu
        </button>
      )}
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

const detailHeader: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

const detailText: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  color: 'var(--text)',
};

const detailSubtext: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-muted)',
};

const sumRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  color: 'var(--text-muted)',
};
