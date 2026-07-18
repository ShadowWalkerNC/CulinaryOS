export function getMockOrders(): any[] {
  const data = localStorage.getItem('culinaryos_mock_orders');
  return data ? JSON.parse(data) : [];
}

export function saveMockOrders(orders: any[]) {
  localStorage.setItem('culinaryos_mock_orders', JSON.stringify(orders));
  window.dispatchEvent(new Event('mock-db-update'));
}
