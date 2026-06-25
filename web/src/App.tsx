import React, { useState, useEffect } from 'react';
import { ShoppingBag, MonitorPlay, Box, Users, Calendar } from 'lucide-react';
import { POSDashboard } from './components/POSDashboard';
import { KDSScreen } from './components/KDSScreen';
import { InventoryManager } from './components/InventoryManager';
import { StaffScheduler } from './components/StaffScheduler';
import { CRMDashboard } from './components/CRMDashboard';
import { KDSTicket, OrderItem } from './types';
import { mcp } from './services/mcpClient';

const INITIAL_KDS_TICKETS: KDSTicket[] = [
  {
    id: 't-101',
    orderId: 'o-201',
    tableNumber: 'Table 4',
    status: 'queued',
    elapsedSeconds: 140, // 2m 20s
    priority: 'low',
    items: [
      { id: 'i-1', productName: 'Sourdough Loaf', quantity: 1, price: 8.50 },
      { id: 'i-2', productName: 'Espresso Double', quantity: 1, price: 3.25 }
    ]
  },
  {
    id: 't-102',
    orderId: 'o-202',
    tableNumber: 'Table 7',
    status: 'prep',
    elapsedSeconds: 380, // 6m 20s
    priority: 'medium',
    items: [
      { id: 'i-3', productName: 'Chocolate Babka', quantity: 1, price: 12.00 },
      { id: 'i-4', productName: 'Oat Milk Latte', quantity: 2, price: 4.75 }
    ]
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('activeTab') || 'pos';
  });

  const [tickets, setTickets] = useState<KDSTicket[]>(() => {
    const raw = localStorage.getItem('kds_tickets');
    return raw ? JSON.parse(raw) : INITIAL_KDS_TICKETS;
  });

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('kds_tickets', JSON.stringify(tickets));
  }, [tickets]);

  // Establish local-first MCP server connections on client start
  useEffect(() => {
    mcp.connect("pos-server", "stdio://pos-server");
    mcp.connect("kds-server", "stdio://kds-server");
    mcp.connect("inventory-server", "stdio://inventory-server");
  }, []);

  // Adds a new ticket to KDS when POS checkouts via POS MCP Server
  const handleOrderComplete = async (cartItems: OrderItem[], table: string) => {
    try {
      const response = await mcp.callTool<any>("pos-server", "create_order", {
        tableNumber: table,
        items: cartItems.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price
        }))
      });

      const newTicket: KDSTicket = {
        id: response.ticketId,
        orderId: response.orderId,
        tableNumber: response.tableNumber,
        status: 'queued',
        elapsedSeconds: 0,
        priority: 'low',
        items: cartItems.map((item, idx) => ({
          id: `i-${idx}-${Date.now()}`,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price
        }))
      };
      setTickets(prev => [...prev, newTicket]);
    } catch (error) {
      console.error("Failed to submit order via MCP:", error);
    }
  };

  const handleBumpTicket = async (id: string) => {
    try {
      await mcp.callTool("kds-server", "bump_kds_ticket", { ticketId: id });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'bumped' } : t));
    } catch (error) {
      console.error("Failed to bump ticket via MCP:", error);
    }
  };

  const activeTicketsCount = tickets.filter(t => t.status !== 'bumped').length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <h1 className="sidebar-title">
          <span>🍳</span> KitchenFlow
        </h1>
        <nav>
          <ul className="sidebar-menu">
            <li>
              <a 
                onClick={() => setActiveTab('pos')}
                className={`sidebar-link ${activeTab === 'pos' ? 'active' : ''}`}
              >
                <ShoppingBag size={18} />
                <span>POS Checkout</span>
              </a>
            </li>
            <li>
              <a 
                onClick={() => setActiveTab('kds')}
                className={`sidebar-link ${activeTab === 'kds' ? 'active' : ''}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MonitorPlay size={18} />
                  <span>KDS Queue</span>
                </span>
                {activeTicketsCount > 0 && (
                  <span style={{
                    backgroundColor: 'var(--accent-orange)',
                    color: 'var(--bg-primary)',
                    borderRadius: '12px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: '800'
                  }}>
                    {activeTicketsCount}
                  </span>
                )}
              </a>
            </li>
            <li>
              <a 
                onClick={() => setActiveTab('inventory')}
                className={`sidebar-link ${activeTab === 'inventory' ? 'active' : ''}`}
              >
                <Box size={18} />
                <span>Inventory Ledger</span>
              </a>
            </li>
            <li>
              <a 
                onClick={() => setActiveTab('scheduler')}
                className={`sidebar-link ${activeTab === 'scheduler' ? 'active' : ''}`}
              >
                <Calendar size={18} />
                <span>Shift Scheduler</span>
              </a>
            </li>
            <li>
              <a 
                onClick={() => setActiveTab('crm')}
                className={`sidebar-link ${activeTab === 'crm' ? 'active' : ''}`}
              >
                <Users size={18} />
                <span>CRM & Loyalty</span>
              </a>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Panel Content */}
      <main className="main-content">
        {activeTab === 'pos' && <POSDashboard onOrderComplete={handleOrderComplete} />}
        {activeTab === 'kds' && <KDSScreen tickets={tickets} onBumpTicket={handleBumpTicket} />}
        {activeTab === 'inventory' && <InventoryManager />}
        {activeTab === 'scheduler' && <StaffScheduler />}
        {activeTab === 'crm' && <CRMDashboard />}
      </main>
    </div>
  );
};

export default App;
