
export type OwnerType = 'Partner' | 'Client';

export interface ShipmentItem {
  id: string;
  ownerName: string;
  ownerType: OwnerType;
  plannedKg: number;
  arrivedKg: number; // Cumulative from all batches
}

export interface ArrivalItem {
  id: string;
  ownerName: string;
  ownerType: OwnerType;
  arrivedKg: number;
  serviceFeePerKg: number; // Only for clients
}

export interface ArrivalBatch {
  id: string;
  masterShipmentId: string;
  batchDate: string;
  driverCost: number;
  storeCost: number;
  freightCost: number; // Partners only
  postalCost: number;  // Clients only
  items: ArrivalItem[];
  // Calculated fields
  totalPartnerKg: number;
  totalClientKg: number;
  partnerPerKgCost: number;
  clientPerKgCost: number;
  totalClientRevenue: number;
  totalClientCosts: number;
  netProfit: number;
}

export interface MasterShipment {
  id: string;
  name: string;
  dispatchDate: string;
  status: 'Draft' | 'In Transit' | 'Partially Arrived' | 'Completed';
  totalPlannedKg: number;
  items: ShipmentItem[];
  batches: ArrivalBatch[];
  isArchived?: boolean; // New property
}

export interface FinancialSummary {
  totalRevenue: number;
  totalPartnerCosts: number;
  totalClientCosts: number;
  netProfit: number;
  totalWeight: number;
}
