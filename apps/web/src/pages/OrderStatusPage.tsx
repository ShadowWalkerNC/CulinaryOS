import { useParams, useNavigate } from 'react-router-dom';
import { OrderStatusTracker } from '../components/OrderStatusTracker';

export function OrderStatusPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-app)', color: 'var(--text)' }}>
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={() => navigate('/menu/demo')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← CulinaryOS Ordering
        </button>
      </header>

      <main style={{ paddingBottom: '60px' }}>
        <OrderStatusTracker
          orderId={orderId ?? ''}
          onBackToMenu={() => navigate('/menu/demo')}
        />
      </main>
    </div>
  );
}
