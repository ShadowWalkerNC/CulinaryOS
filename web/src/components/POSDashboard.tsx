import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, CreditCard, Wifi, WifiOff } from 'lucide-react';
import { Product, OrderItem } from '../types';

interface POSProps {
  onOrderComplete: (items: OrderItem[], table: string) => void;
}

const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Sourdough Loaf', price: 8.50, category: 'Bread', ingredients: [] },
  { id: 'p2', name: 'Chocolate Babka', price: 12.00, category: 'Bread', ingredients: [] },
  { id: 'p3', name: 'Almond Croissant', price: 4.50, category: 'Pastry', ingredients: [] },
  { id: 'p4', name: 'Espresso Double', price: 3.25, category: 'Drinks', ingredients: [] },
  { id: 'p5', name: 'Oat Milk Latte', price: 4.75, category: 'Drinks', ingredients: [] },
  { id: 'p6', name: 'Blueberry Scone', price: 3.75, category: 'Pastry', ingredients: [] }
];

export const POSDashboard: React.FC<POSProps> = ({ onOrderComplete }) => {
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [tableNum, setTableNum] = useState<string>('Takeout');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [paymentDone, setPaymentDone] = useState<boolean>(false);
  
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08; // 8% sales tax
  const total = subtotal + tax;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productName === product.name);
      if (existing) {
        return prev.map(item => item.productName === product.name 
          ? { ...item, quantity: item.quantity + 1 }
          : item
        );
      }
      return [...prev, { id: Math.random().toString(), productName: product.name, quantity: 1, price: product.price }];
    });
  };

  const changeQty = (name: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productName === name) {
        const nextQty = item.quantity + delta;
        return nextQty > 0 ? { ...item, quantity: nextQty } : null;
      }
      return item;
    }).filter(Boolean) as OrderItem[]);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    // Call the parent order trigger
    onOrderComplete(cart, tableNum);
    setPaymentDone(true);
    setTimeout(() => {
      setCart([]);
      setPaymentDone(false);
      setTableNum('Takeout');
    }, 1500);
  };

  const filteredProducts = selectedCategory === 'All' 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === selectedCategory);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="title-xl" style={{ marginBottom: '4px' }}>POS Checkout</h2>
          <p style={{ color: 'var(--text-muted)' }}>Location: Northern Fixin's - Main Terminal</p>
        </div>

        <button 
          onClick={() => setIsOffline(!isOffline)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: isOffline ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            color: isOffline ? 'var(--status-danger)' : 'var(--status-success)',
            border: '1px solid',
            borderColor: isOffline ? 'var(--status-danger)' : 'var(--status-success)',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
          {isOffline ? 'Offline Mode Active' : 'Connected to Cloud'}
        </button>
      </div>

      <div className="pos-grid">
        {/* Menu Grid */}
        <div>
          {/* Category Selector */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {['All', 'Bread', 'Pastry', 'Drinks'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`btn-secondary ${selectedCategory === cat ? 'active' : ''}`}
                style={{
                  borderColor: selectedCategory === cat ? 'var(--accent-orange)' : 'var(--bg-tertiary)',
                  color: selectedCategory === cat ? 'var(--accent-orange)' : 'var(--text-main)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pos-menu">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                className="menu-card"
                onClick={() => addToCart(product)}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                  {product.category === 'Bread' ? '🍞' : product.category === 'Pastry' ? '🥐' : '☕'}
                </div>
                <div style={{ fontWeight: '600', fontSize: '15px' }}>{product.name}</div>
                <div className="menu-price">${product.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Cart */}
        <div className="pos-cart">
          <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} /> Cart
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Table Number / Seat</label>
            <input 
              type="text" 
              value={tableNum} 
              onChange={e => setTableNum(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--bg-tertiary)',
                color: 'var(--text-main)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontFamily: 'var(--font-family)'
              }}
            />
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                Cart is empty
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.productName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--accent-orange)' }}>
                      ${item.price.toFixed(2)} each
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => changeQty(item.productName, -1)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>{item.quantity}</span>
                    <button 
                      onClick={() => addToCart({ id: '', name: item.productName, price: item.price, category: '', ingredients: [] })}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ minWidth: '60px', textAlign: 'right', fontWeight: '600', fontSize: '14px' }}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals */}
          <div style={{ borderTop: '1px solid var(--bg-tertiary)', paddingTop: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tax (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700', marginTop: '12px' }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent-orange)' }}>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout triggers */}
          {isOffline && (
            <div style={{
              backgroundColor: 'rgba(245,158,11,0.1)',
              color: 'var(--status-warning)',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
              marginBottom: '16px',
              border: '1px solid rgba(245,158,11,0.2)'
            }}>
              Offline Queue Enabled. The transaction card token will be cached locally and synced within 24 hours.
            </div>
          )}

          {paymentDone ? (
            <div style={{
              backgroundColor: 'rgba(16,185,129,0.1)',
              color: 'var(--status-success)',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              fontWeight: '700'
            }}>
              Payment Successful!
            </div>
          ) : (
            <button 
              className="btn-primary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              <CreditCard size={18} />
              {isOffline ? 'Queue Offline Capture' : 'Process Payment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
