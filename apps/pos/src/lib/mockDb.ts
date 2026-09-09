export function getMockOrders(): any[] {
  const data = localStorage.getItem('culinaryos_mock_orders');
  return data ? JSON.parse(data) : [];
}

export function saveMockOrders(orders: any[]) {
  localStorage.setItem('culinaryos_mock_orders', JSON.stringify(orders));
  window.dispatchEvent(new Event('mock-db-update'));
}

export function updateMockOrderStatus(orderId: string, status: string, metadata?: Record<string, any>) {
  const orders = getMockOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    orders[index] = {
      ...orders[index],
      status,
      ...(metadata ?? {}),
      updated_at: new Date().toISOString(),
    };
    saveMockOrders(orders);
    window.dispatchEvent(new CustomEvent('culinaryos:order-status-changed', {
      detail: { orderId, status, order: orders[index] },
    }));
  }
}
