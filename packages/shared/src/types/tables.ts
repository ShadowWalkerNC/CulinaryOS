// ============================================================
// CulinaryOS — Table, Floor & Service Types
// Shared definitions for table merging, splitting, transfers, and assistance
// ============================================================

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty' | 'merged';

export type TableShape = 'square' | 'round' | 'rectangle' | 'booth' | 'bar' | 'oval';

export interface FloorTable {
  id: string;
  number: string;
  label: string;
  sectionId: string;
  sectionName: string;
  capacity: number;
  shape: TableShape;
  defaultStatus: TableStatus;
  currentOrderId?: string;
  mergedIntoTableId?: string;
  mergedTableIds?: string[];
  assignedServerId?: string;
  assignedServerName?: string;
}

export interface TableMergeRequest {
  sourceTableIds: string[];
  targetTableId: string;
  managerPin?: string;
  tenantId?: string;
}

export interface TableMergeResponse {
  success: boolean;
  targetTableId: string;
  mergedOrderId: string;
  mergedTableNumbers: string[];
  combinedItemsCount: number;
  newTotalCents: number;
}

export interface OrderSplitPartition {
  partitionId?: string;
  seatNumber?: number;
  itemIds: string[];
  guestLabel?: string;
}

export interface OrderSplitRequest {
  splitType: 'seat' | 'items' | 'custom';
  partitions: OrderSplitPartition[];
}

export interface OrderSplitResponse {
  success: boolean;
  originalOrderId: string;
  newOrderIds: string[];
  partitions: {
    orderId: string;
    subtotal: number;
    tax: number;
    total: number;
    itemCount: number;
    seatNumber?: number;
  }[];
}

export interface TableTransferRequest {
  tableId: string;
  fromServerId: string;
  toServerId: string;
  toServerName?: string;
  managerPin: string;
}

export interface TableTransferResponse {
  success: boolean;
  tableId: string;
  orderId?: string;
  fromServerId: string;
  toServerId: string;
  toServerName: string;
  transferredAt: string;
}

export type TableAssistanceType = 'server' | 'water' | 'bill' | 'help';

export interface TableAssistanceRequest {
  tableId: string;
  tableNumber?: string;
  type: TableAssistanceType;
  note?: string;
}

export interface TableAssistanceNotification {
  id: string;
  tableId: string;
  tableNumber: string;
  type: TableAssistanceType;
  note?: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
}
