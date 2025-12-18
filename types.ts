
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
  driverCostTotal: number;
  storeCostTotal: number;
  freightRatePerKg: number; // Partners only, per KG
  postalCostTotal: number;  // Clients only, total amount
  items: ArrivalItem[];
  // Calculated fields for reporting
  totalPartnerKg: number;
  totalClientKg: number;
  totalArrivedKg: number;
  
  partnerSharedCost: number;
  partnerFreightCost: number;
  partnerTotalLogistics: number;
  
  clientSharedCost: number;
  clientPostalCost: number;
  clientTotalCost: number;
  
  totalClientRevenue: number;
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
  isArchived?: boolean;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalPartnerCosts: number;
  totalClientCosts: number;
  netProfit: number;
  totalWeight: number;
}
