
import { ArrivalBatch, ArrivalItem, MasterShipment } from '../types';

/**
 * Safe numeric parser to handle empty strings or undefined inputs
 */
export const safeNum = (val: any): number => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Round to 2 decimal places
 */
export const round = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const calculateBatchFinancials = (
  batchInputs: Partial<ArrivalBatch>,
  items: ArrivalItem[]
): ArrivalBatch => {
  // 1. Sanitize Inputs
  const driverCostTotal = round(safeNum(batchInputs.driverCostTotal));
  const storeCostTotal = round(safeNum(batchInputs.storeCostTotal));
  const freightRatePerKg = round(safeNum(batchInputs.freightRatePerKg));
  const postalCostTotal = round(safeNum(batchInputs.postalCostTotal));

  const partnerItems = items.filter(i => i.ownerType === 'Partner');
  const clientItems = items.filter(i => i.ownerType === 'Client');

  const totalPartnerKg = round(partnerItems.reduce((sum, i) => sum + safeNum(i.arrivedKg), 0));
  const totalClientKg = round(clientItems.reduce((sum, i) => sum + safeNum(i.arrivedKg), 0));
  const totalArrivedKg = round(totalPartnerKg + totalClientKg);

  // 2. Shared Costs (Driver & Store) - Distributed by total weight
  const driverPerKg = totalArrivedKg > 0 ? driverCostTotal / totalArrivedKg : 0;
  const storePerKg = totalArrivedKg > 0 ? storeCostTotal / totalArrivedKg : 0;
  const sharedRatePerKg = driverPerKg + storePerKg;

  // 3. Partner Calculations
  const partnerSharedCost = round(totalPartnerKg * sharedRatePerKg);
  const partnerFreightCost = round(totalPartnerKg * freightRatePerKg);
  const partnerTotalLogistics = round(partnerSharedCost + partnerFreightCost);

  // 4. Client Calculations
  const clientSharedCost = round(totalClientKg * sharedRatePerKg);
  const clientPostalCost = round(totalClientKg > 0 ? postalCostTotal : 0); // Postal applies total to clients
  const clientTotalCost = round(clientSharedCost + clientPostalCost);

  // 5. Revenue & Profit
  const totalClientRevenue = round(clientItems.reduce((sum, i) => 
    sum + (safeNum(i.arrivedKg) * safeNum(i.serviceFeePerKg)), 0
  ));

  // Net Profit = Client Revenue - Client Total Cost (shared + postal)
  const netProfit = round(totalClientRevenue - clientTotalCost);

  return {
    ...batchInputs,
    driverCostTotal,
    storeCostTotal,
    freightRatePerKg,
    postalCostTotal,
    items: items.map(i => ({
      ...i,
      arrivedKg: round(safeNum(i.arrivedKg)),
      serviceFeePerKg: round(safeNum(i.serviceFeePerKg))
    })),
    totalPartnerKg,
    totalClientKg,
    totalArrivedKg,
    partnerSharedCost,
    partnerFreightCost,
    partnerTotalLogistics,
    clientSharedCost,
    clientPostalCost,
    clientTotalCost,
    totalClientRevenue,
    netProfit,
  } as ArrivalBatch;
};

export const getShipmentProgress = (shipment: MasterShipment) => {
  const arrived = round(shipment.items.reduce((sum, i) => sum + i.arrivedKg, 0));
  const total = shipment.totalPlannedKg;
  return total > 0 ? Math.min(100, round((arrived / total) * 100)) : 0;
};
