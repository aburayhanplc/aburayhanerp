
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
  batch: Partial<ArrivalBatch>,
  items: ArrivalItem[]
): ArrivalBatch => {
  const driverCost = round(safeNum(batch.driverCost));
  const storeCost = round(safeNum(batch.storeCost));
  const freightCost = round(safeNum(batch.freightCost));
  const postalCost = round(safeNum(batch.postalCost));

  const totalPartnerKg = round(items
    .filter((i) => i.ownerType === 'Partner')
    .reduce((sum, i) => sum + safeNum(i.arrivedKg), 0));

  const totalClientKg = round(items
    .filter((i) => i.ownerType === 'Client')
    .reduce((sum, i) => sum + safeNum(i.arrivedKg), 0));

  // Partner per-KG cost: (Driver + Store + Freight) / total partner KG
  const partnerPerKgCost = totalPartnerKg > 0 
    ? round((driverCost + storeCost + freightCost) / totalPartnerKg)
    : 0;

  // Client per-KG cost: (Driver + Store + Postal) / total client KG
  const clientPerKgCost = totalClientKg > 0 
    ? round((driverCost + storeCost + postalCost) / totalClientKg)
    : 0;

  // Revenue = Arrived KG × service fee per KG
  const totalClientRevenue = round(items
    .filter((i) => i.ownerType === 'Client')
    .reduce((sum, i) => sum + (safeNum(i.arrivedKg) * safeNum(i.serviceFeePerKg)), 0));

  // Client Costs = Arrived KG × clientPerKgCost
  const totalClientCosts = round(totalClientKg * clientPerKgCost);

  // Net profit = total client revenue − total client costs
  const netProfit = round(totalClientRevenue - totalClientCosts);

  return {
    ...batch,
    driverCost,
    storeCost,
    freightCost,
    postalCost,
    items: items.map(i => ({
      ...i,
      arrivedKg: round(safeNum(i.arrivedKg)),
      serviceFeePerKg: round(safeNum(i.serviceFeePerKg))
    })),
    totalPartnerKg,
    totalClientKg,
    partnerPerKgCost,
    clientPerKgCost,
    totalClientRevenue,
    totalClientCosts,
    netProfit,
  } as ArrivalBatch;
};

export const getShipmentProgress = (shipment: MasterShipment) => {
  const arrived = round(shipment.items.reduce((sum, i) => sum + i.arrivedKg, 0));
  const total = shipment.totalPlannedKg;
  return total > 0 ? Math.min(100, round((arrived / total) * 100)) : 0;
};
