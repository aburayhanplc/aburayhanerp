
import React, { useMemo, useState } from 'react';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Scale, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  Trash2,
  Edit3,
  CheckCircle2,
  Truck,
  Warehouse,
  Ship,
  Mail,
  Info,
  Loader2
} from 'lucide-react';
import { MasterShipment, ArrivalBatch } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateBatchFinancials, safeNum, round } from '../services/erpService';

interface ReportingProps {
  shipments: MasterShipment[];
  setShipments: React.Dispatch<React.SetStateAction<MasterShipment[]>>;
  businessSettings: {
    name: string;
    logoUrl: string | null;
    partner1: string;
    partner2: string;
  };
}

const Reporting: React.FC<ReportingProps> = ({ shipments, setShipments, businessSettings }) => {
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editData, setEditData] = useState<Partial<ArrivalBatch>>({});

  const allBatches = useMemo(() => {
    return shipments.flatMap(s => s.batches.map(b => {
      const ms = shipments.find(sh => sh.id === b.masterShipmentId);
      return {
        ...b,
        shipmentName: ms?.name || 'Unknown Shipment',
        dispatchDate: ms?.dispatchDate || 'N/A',
        totalPlannedWeight: ms?.totalPlannedKg || 0,
        masterItems: ms?.items || []
      };
    })).sort((a, b) => new Date(b.batchDate).getTime() - new Date(a.batchDate).getTime());
  }, [shipments]);

  const handleDeleteBatch = (batchId: string, shipmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this batch? Arrived weights will be reverted in the master shipment.")) return;

    setShipments(prev => prev.map(s => {
      if (s.id === shipmentId) {
        const batchToRemove = s.batches.find(b => b.id === batchId);
        if (!batchToRemove) return s;

        const updatedItems = s.items.map(item => {
          const batchItem = batchToRemove.items.find(bi => bi.ownerName === item.ownerName);
          return batchItem ? { ...item, arrivedKg: item.arrivedKg - batchItem.arrivedKg } : item;
        });

        const totalArrived = updatedItems.reduce((sum, i) => sum + i.arrivedKg, 0);
        const status = totalArrived === 0 ? 'In Transit' : totalArrived >= s.totalPlannedKg - 0.1 ? 'Completed' : 'Partially Arrived';

        return {
          ...s,
          items: updatedItems,
          batches: s.batches.filter(b => b.id !== batchId),
          status: status as any
        };
      }
      return s;
    }));
    setSelectedBatch(null);
  };

  const handleStartEdit = () => {
    setEditData({
      driverCost: selectedBatch.driverCost,
      storeCost: selectedBatch.storeCost,
      freightCost: selectedBatch.freightCost,
      postalCost: selectedBatch.postalCost,
      batchDate: selectedBatch.batchDate
    });
    setIsEditingCosts(true);
  };

  const handleSaveEdit = () => {
    if (!selectedBatch) return;

    const updatedBatchData = calculateBatchFinancials({ ...selectedBatch, ...editData }, selectedBatch.items);

    setShipments(prev => prev.map(s => {
      if (s.id === selectedBatch.masterShipmentId) {
        const updatedBatches = s.batches.map(b => {
          if (b.id === selectedBatch.id) {
            return { ...b, ...updatedBatchData };
          }
          return b;
        });
        return { ...s, batches: updatedBatches };
      }
      return s;
    }));

    setSelectedBatch(prev => ({
      ...prev,
      ...updatedBatchData
    }));
    setIsEditingCosts(false);
  };

  const handleExportPDF = async (batch: any) => {
    try {
      setIsExporting(true);
      const doc = new jsPDF();
      const margin = 14;
      
      // Ensure all costs are strictly numbers to prevent "gibberish" string concatenation
      const dCost = safeNum(batch.driverCost);
      const sCost = safeNum(batch.storeCost);
      const fCost = safeNum(batch.freightCost);
      const pCost = safeNum(batch.postalCost);
      const totalLogistics = round(dCost + sCost + fCost + pCost);

      const totalBatchKg = round((safeNum(batch.totalPartnerKg) || 0) + (safeNum(batch.totalClientKg) || 0));
      const totalNetProfit = round(safeNum(batch.netProfit));
      const splitValue = round(totalNetProfit / 2);

      // Header
      doc.setFontSize(22);
      doc.setTextColor(20, 184, 166); 
      doc.text(businessSettings.name, margin, 20);
      
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text('Internal Batch Reconciliation Report', margin, 30);
      
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Shipment: ${batch.shipmentName}`, margin, 38);
      doc.text(`Batch Date: ${batch.batchDate}`, margin, 43);
      doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin, 48);

      // Summary Table
      const summaryData = [
        ['Total Net Profit', `$${totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        [`50% Share: ${businessSettings.partner1}`, `$${splitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        [`50% Share: ${businessSettings.partner2}`, `$${splitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ['Batch Arrived Weight', `${totalBatchKg.toLocaleString()} KG`],
        ['Client Total Revenue', `$${(safeNum(batch.totalClientRevenue) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
        ['Total Logistics Expenses', `$${totalLogistics.toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
      ];

      autoTable(doc, {
        startY: 55,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
      });

      // Owners Detailed Section
      const ownerTableData = batch.items.map((item: any) => {
        const arrived = safeNum(item.arrivedKg);
        const weightRatioTotal = totalBatchKg > 0 ? arrived / totalBatchKg : 0;
        
        const partnerWeight = safeNum(batch.totalPartnerKg);
        const clientWeight = safeNum(batch.totalClientKg);

        const weightRatioCategory = item.ownerType === 'Partner'
          ? (partnerWeight > 0 ? arrived / partnerWeight : 0)
          : (clientWeight > 0 ? arrived / clientWeight : 0);

        const driverShare = dCost * weightRatioTotal;
        const storeShare = sCost * weightRatioTotal;
        const freightShare = item.ownerType === 'Partner' ? fCost * weightRatioCategory : 0;
        const postalShare = item.ownerType === 'Client' ? pCost * weightRatioCategory : 0;
        const totalExpense = driverShare + storeShare + freightShare + postalShare;
        
        const feePerKg = safeNum(item.serviceFeePerKg);
        const revenue = item.ownerType === 'Client' ? (arrived * feePerKg) : 0;
        const netResult = item.ownerType === 'Client' ? (revenue - totalExpense) : -totalExpense;

        return [
          item.ownerName,
          item.ownerType,
          `${arrived.toLocaleString()} KG`,
          `$${driverShare.toFixed(2)}`,
          `$${storeShare.toFixed(2)}`,
          item.ownerType === 'Partner' ? `$${freightShare.toFixed(2)}` : `$${postalShare.toFixed(2)}`,
          `$${totalExpense.toFixed(2)}`,
          item.ownerType === 'Client' ? `$${revenue.toFixed(2)}` : '-',
          `$${netResult.toFixed(2)}`
        ];
      });

      doc.setFontSize(12);
      doc.setTextColor(0);
      const lastTable = (doc as any).lastAutoTable;
      const finalY = lastTable ? lastTable.finalY : 100;
      doc.text('Proportional Cost & Revenue Analysis', margin, finalY + 15);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Owner', 'Type', 'Weight', 'Driver', 'Store', 'Misc', 'Expense', 'Revenue', 'Net']],
        body: ownerTableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [20, 184, 166] },
      });

      doc.save(`${batch.shipmentName}_Reconciliation_${batch.batchDate}.pdf`);
    } catch (err) {
      console.error("PDF Export failed:", err);
      alert("Error generating PDF. Please ensure all data fields are valid.");
    } finally {
      setIsExporting(false);
    }
  };

  if (selectedBatch) {
    const totalBatchKg = round((safeNum(selectedBatch.totalPartnerKg) || 0) + (safeNum(selectedBatch.totalClientKg) || 0));
    const totalNetProfit = round(safeNum(selectedBatch.netProfit));
    const splitValue = round(totalNetProfit / 2);

    return (
      <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-8 duration-500 pb-20">
        <div className="flex items-center justify-between px-2 md:px-0">
          <button 
            onClick={() => setSelectedBatch(null)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Logs
          </button>
          
          <div className="flex gap-2">
            {!isEditingCosts ? (
              <>
                <button onClick={handleStartEdit} className="p-3 bg-white border border-slate-200 text-teal-600 rounded-2xl hover:bg-teal-50 transition-all flex items-center gap-2 font-bold shadow-sm">
                  <Edit3 size={18} />
                  <span className="hidden md:inline">Adjust Costs</span>
                </button>
                <button onClick={() => handleDeleteBatch(selectedBatch.id, selectedBatch.masterShipmentId)} className="p-3 bg-white border border-slate-200 text-rose-500 rounded-2xl hover:bg-rose-50 transition-all flex items-center gap-2 font-bold shadow-sm">
                  <Trash2 size={18} />
                  <span className="hidden md:inline">Delete</span>
                </button>
                <button 
                  onClick={() => handleExportPDF(selectedBatch)} 
                  disabled={isExporting}
                  className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  <span className="hidden md:inline">{isExporting ? 'Building PDF...' : 'Download Report'}</span>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditingCosts(false)} className="px-4 py-2 text-slate-400 font-black uppercase tracking-widest text-[10px]">Cancel</button>
                <button onClick={handleSaveEdit} className="bg-teal-500 text-white px-6 py-2 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-teal-100">
                  <CheckCircle2 size={18} /> Apply Changes
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden mx-2 md:mx-0">
          <div className="p-8 md:p-12 border-b border-slate-50 bg-slate-50/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-teal-100/50">FINANCIAL RECONCILIATION</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedBatch.batchDate}</span>
            </div>
            <h3 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-none mb-2">{selectedBatch.shipmentName}</h3>
            <p className="text-slate-400 font-medium">Internal Report Context (Batch #{selectedBatch.id.split('-').pop()})</p>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            {isEditingCosts && (
              <div className="bg-teal-50/50 p-8 rounded-[2.5rem] border-2 border-teal-100/50 animate-in slide-in-from-top-4 duration-300">
                <h4 className="font-black text-teal-800 uppercase tracking-widest text-xs mb-6 flex items-center gap-2"><Edit3 size={16} /> Edit Operational Costs</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Driver ($)</label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl border border-teal-100 outline-none focus:ring-2 ring-teal-500 font-black" value={editData.driverCost || ''} onChange={e => setEditData({...editData, driverCost: e.target.value as any})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Store ($)</label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl border border-teal-100 outline-none focus:ring-2 ring-teal-500 font-black" value={editData.storeCost || ''} onChange={e => setEditData({...editData, storeCost: e.target.value as any})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Freight ($)</label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl border border-teal-100 outline-none focus:ring-2 ring-teal-500 font-black" value={editData.freightCost || ''} onChange={e => setEditData({...editData, freightCost: e.target.value as any})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Postal ($)</label>
                    <input type="number" className="w-full px-4 py-3 rounded-xl border border-teal-100 outline-none focus:ring-2 ring-teal-500 font-black" value={editData.postalCost || ''} onChange={e => setEditData({...editData, postalCost: e.target.value as any})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Date</label>
                    <input type="date" className="w-full px-4 py-3 rounded-xl border border-teal-100 outline-none focus:ring-2 ring-teal-500 font-black" value={editData.batchDate || ''} onChange={e => setEditData({...editData, batchDate: e.target.value})} />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <SummaryCard icon={TrendingUp} label="Total Net Profit" value={`$${totalNetProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="text-teal-600" />
              <SummaryCard icon={DollarSign} label={`${businessSettings.partner1.split(' ')[0]} (50%)`} value={`$${splitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="text-indigo-600" />
              <SummaryCard icon={DollarSign} label={`${businessSettings.partner2.split(' ')[0]} (50%)`} value={`$${splitValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="text-indigo-600" />
              <SummaryCard icon={Scale} label="Batch Weight" value={`${totalBatchKg.toLocaleString()} KG`} color="text-slate-800" />
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full" />
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ownership Expense Analysis</h4>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {selectedBatch.items.map((item: any) => {
                  const arrived = safeNum(item.arrivedKg);
                  const weightRatioTotal = totalBatchKg > 0 ? arrived / totalBatchKg : 0;
                  
                  const partnerWeight = safeNum(selectedBatch.totalPartnerKg);
                  const clientWeight = safeNum(selectedBatch.totalClientKg);

                  const weightRatioCategory = item.ownerType === 'Partner'
                    ? (partnerWeight > 0 ? arrived / partnerWeight : 0)
                    : (clientWeight > 0 ? arrived / clientWeight : 0);

                  const driverShare = safeNum(selectedBatch.driverCost) * weightRatioTotal;
                  const storeShare = safeNum(selectedBatch.storeCost) * weightRatioTotal;
                  const freightShare = item.ownerType === 'Partner' ? safeNum(selectedBatch.freightCost) * weightRatioCategory : 0;
                  const postalShare = item.ownerType === 'Client' ? safeNum(selectedBatch.postalCost) * weightRatioCategory : 0;
                  const totalExpense = driverShare + storeShare + freightShare + postalShare;
                  
                  const feePerKg = safeNum(item.serviceFeePerKg);
                  const revenue = item.ownerType === 'Client' ? (arrived * feePerKg) : 0;

                  return (
                    <div key={item.id} className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 overflow-hidden flex flex-col">
                      <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50">
                         <div>
                            <p className="text-xl font-black text-slate-800 leading-none">{item.ownerName}</p>
                            <span className={`text-[10px] font-black uppercase tracking-widest mt-2 block ${item.ownerType === 'Partner' ? 'text-teal-500' : 'text-amber-500'}`}>
                              {item.ownerType} • {arrived.toLocaleString()} KG
                            </span>
                         </div>
                         <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Net Exposure</p>
                            <p className={`text-xl font-black ${item.ownerType === 'Client' && (revenue - totalExpense) >= 0 ? 'text-teal-600' : 'text-slate-800'}`}>
                              {item.ownerType === 'Client' ? `$${(revenue - totalExpense).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `$${(-totalExpense).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            </p>
                         </div>
                      </div>
                      
                      <div className="p-8 grid grid-cols-2 gap-y-6 gap-x-8">
                        <CostItem icon={Truck} label="Driver Share" value={driverShare} />
                        <CostItem icon={Warehouse} label="Store Share" value={storeShare} />
                        {item.ownerType === 'Partner' ? (
                          <CostItem icon={Ship} label="Freight Share" value={freightShare} highlight />
                        ) : (
                          <CostItem icon={Mail} label="Postal Share" value={postalShare} highlight />
                        )}
                        <div className="pt-4 mt-4 border-t border-slate-100 col-span-2 flex justify-between items-center">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Cost</p>
                           <p className="text-lg font-black text-slate-800">${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="px-2 md:px-0">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Financial Log</h2>
        <p className="text-sm text-slate-500 font-medium">Review history and download internal batch reports</p>
      </div>

      <div className="space-y-4">
        {allBatches.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200 mx-2 md:mx-0">
            <FileText size={40} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-400">No batch history recorded</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 mx-2 md:mx-0">
            {allBatches.map(batch => (
              <div 
                key={batch.id} 
                className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-xl transition-all group"
              >
                <div className="flex items-center gap-6 cursor-pointer flex-1" onClick={() => setSelectedBatch(batch)}>
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500 transition-colors">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">{batch.batchDate}</span>
                      <span className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{batch.items.length} Owners</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-teal-600 transition-colors">{batch.shipmentName}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-8 md:gap-12">
                   <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Profit</p>
                    <p className={`text-lg font-black ${(safeNum(batch.netProfit) || 0) >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>${(safeNum(batch.netProfit) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteBatch(batch.id, batch.masterShipmentId)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    <button onClick={() => setSelectedBatch(batch)} className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-teal-500 group-hover:text-white transition-all"><ChevronRight size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
    <div className="flex items-center gap-3 mb-3">
      <div className={`p-2 rounded-lg bg-white border border-slate-100 shadow-sm ${color}`}>
        <Icon size={16} />
      </div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className={`text-xl font-black ${color}`}>{value}</p>
  </div>
);

const CostItem = ({ icon: Icon, label, value, highlight }: any) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 mb-1">
       <Icon size={12} className={highlight ? "text-teal-500" : "text-slate-300"} />
       <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
    </div>
    <p className="text-base font-black text-slate-800">${(safeNum(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
  </div>
);

export default Reporting;
