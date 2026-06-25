// KDS-local types extending the shared contract
export type { KitchenTicket, TicketItem, TicketStatus, KitchenStation, Order } from '../../../shared/types';

export interface StationView {
  station: import('../../../shared/types').KitchenStation;
  label: string;
  color: string;   // tailwind bg class
  tickets: import('../../../shared/types').KitchenTicket[];
}
