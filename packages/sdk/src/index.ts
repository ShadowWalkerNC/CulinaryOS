/**
 * @culinaryos/sdk
 * Official TypeScript SDK for CulinaryOS Restaurant Operating System.
 * Connects directly to Hono API (:3000) or cloud instances.
 */

export interface CulinaryOSClientConfig {
  baseUrl?: string;
  tenantId: string;
  apiKey?: string;
  bearerToken?: string;
}

export class CulinaryOSClient {
  readonly baseUrl: string;
  readonly tenantId: string;
  private apiKey?: string;
  private bearerToken?: string;

  constructor(config: CulinaryOSClientConfig) {
    this.baseUrl = (config.baseUrl || 'http://localhost:3000').replace(/\/$/, '');
    this.tenantId = config.tenantId;
    this.apiKey = config.apiKey;
    this.bearerToken = config.bearerToken;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.tenantId,
    };
    if (this.apiKey) {
      h['x-internal-key'] = this.apiKey;
    }
    if (this.bearerToken) {
      h['Authorization'] = `Bearer ${this.bearerToken}`;
    }
    return h;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.headers(),
        ...(options.headers as Record<string, string> || {}),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `API Error: ${res.status} ${res.statusText}`);
    }
    return data?.data ?? data;
  }

  // --- Orders & POS Subsystem ---
  readonly orders = {
    list: (params: { status?: string } = {}) => {
      const q = params.status ? `?status=${params.status}` : '';
      return this.request<any[]>(`/v1/orders${q}`);
    },
    get: (orderId: string) => {
      return this.request<any>(`/v1/orders/${orderId}`);
    },
    create: (order: { table_number?: string; guest_count?: number; items: any[] }) => {
      return this.request<any>('/v1/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });
    },
    sendToKitchen: (orderId: string, orderSnapshot?: any) => {
      return this.request<any>(`/v1/orders/${orderId}/send`, {
        method: 'PATCH',
        body: JSON.stringify(orderSnapshot ? { order: orderSnapshot } : {}),
      });
    },
    void: (orderId: string, managerPin: string, reason: string) => {
      return this.request<any>(`/v1/orders/${orderId}/void`, {
        method: 'POST',
        body: JSON.stringify({ managerPin, reason }),
      });
    },
  };

  // --- Kitchen Display (KDS) Subsystem ---
  readonly kds = {
    listTickets: (params: { station?: string; status?: string } = {}) => {
      const sp = new URLSearchParams();
      if (params.station) sp.set('station', params.station);
      if (params.status) sp.set('status', params.status);
      const q = sp.toString() ? `?${sp.toString()}` : '';
      return this.request<any[]>(`/v1/kds/tickets${q}`);
    },
    bump: (ticketId: string) => {
      return this.request<any>(`/v1/kds/tickets/${ticketId}/bump`, { method: 'PATCH' });
    },
    bumpItem: (ticketId: string, itemId: string) => {
      return this.request<any>(`/v1/kds/tickets/${ticketId}/items/${itemId}/bump`, { method: 'PATCH' });
    },
    fireCourse: (orderId: string, course: number) => {
      return this.request<any>(`/v1/kds/orders/${orderId}/fire-course`, {
        method: 'POST',
        body: JSON.stringify({ course }),
      });
    },
  };

  // --- Reservations Subsystem ---
  readonly reservations = {
    list: (params: { date?: string; status?: string } = {}) => {
      const sp = new URLSearchParams();
      if (params.date) sp.set('date', params.date);
      if (params.status) sp.set('status', params.status);
      const q = sp.toString() ? `?${sp.toString()}` : '';
      return this.request<any[]>(`/v1/reservations${q}`);
    },
    create: (reservation: {
      guest_name: string;
      party_size: number;
      reserved_at: string;
      guest_phone?: string;
      guest_email?: string;
      table_id?: string;
    }) => {
      return this.request<any>('/v1/reservations', {
        method: 'POST',
        body: JSON.stringify(reservation),
      });
    },
    updateStatus: (reservationId: string, status: string, tableId?: string) => {
      return this.request<any>(`/v1/reservations/${reservationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, table_id: tableId }),
      });
    },
    getAvailability: (date: string, partySize?: number) => {
      const sp = new URLSearchParams({ date });
      if (partySize) sp.set('party_size', String(partySize));
      return this.request<any>(`/v1/reservations/availability?${sp.toString()}`);
    },
  };

  // --- Reports & Accounting Subsystem ---
  readonly reports = {
    dailySummary: (date?: string) => {
      const q = date ? `?date=${date}` : '';
      return this.request<any>(`/v1/reports/sales${q}`);
    },
    zReportPreview: (date?: string, shiftId?: string) => {
      const sp = new URLSearchParams();
      if (date) sp.set('date', date);
      if (shiftId) sp.set('shift_id', shiftId);
      const q = sp.toString() ? `?${sp.toString()}` : '';
      return this.request<any>(`/v1/reports/z-report/preview${q}`);
    },
    closeShiftZReport: (params: { managerPin: string; actualCashCountedCents?: number; notes?: string }) => {
      return this.request<any>('/v1/reports/z-report/close', {
        method: 'POST',
        body: JSON.stringify(params),
      });
    },
  };

  // --- Billing & Subscriptions ---
  readonly billing = {
    getSubscription: () => {
      return this.request<any>('/v1/billing/subscription');
    },
    createCheckoutSession: (plan: 'starter' | 'pro' | 'enterprise') => {
      return this.request<{ checkout_url: string }>('/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan }),
      });
    },
    createCustomerPortal: () => {
      return this.request<{ portal_url: string }>('/v1/billing/portal', {
        method: 'POST',
      });
    },
  };
}

export function createClient(config: CulinaryOSClientConfig): CulinaryOSClient {
  return new CulinaryOSClient(config);
}
