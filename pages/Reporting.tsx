
import React, { useMemo, useState } from 'react';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  DollarSign, 
  ArrowLeft,
  Calendar,
  Edit3,
  CheckCircle2,
  Truck,
  Warehouse,
  Ship,
  Mail,
  Loader2,
  Info
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
  const [selectedBatch, setSelectedBatch] = useState<ArrivalBatch | null>(null);
  const [isEditingCosts, setIsEditingCosts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editData, setEditData] = useState<Partial<ArrivalBatch>>({});

  const allBatches = useMemo(() => {
    return shipments.flatMap(s => s.batches.map(b => ({
      ...b,
      shipmentName: s.name,
      dispatchDate: s.dispatchDate,
    }))).sort((a, b) => new Date(b.batchDate).getTime() - new Date(a.batchDate).getTime());
  }, [shipments]);

  const handleStartEdit = () => {
    if (!selectedBatch) return;
    setEditData({ ...selectedBatch });
    setIsEditingCosts(true);
  };

  const handleSaveEdit = () => {
    if (!selectedBatch) return;
    const updated = calculateBatchFinancials(editData, selectedBatch.items);
    setShipments(prev => prev.map(s => {
      if (s.id === selectedBatch.masterShipmentId) {
        return { ...s, batches: s.batches.map(b => b.id === selectedBatch.id ? updated : b) };
      }
      return s;
    }));
    setSelectedBatch(updated);
    setIsEditingCosts(false);
  };

  const handleExportPDF = async (batch: ArrivalBatch) => {
    try {
      setIsExporting(true);
      const doc = new jsPDF('l', 'mm', 'a4'); 
      const margin = 14;
      
      const shipment = shipments.find(s => s.id === batch.masterShipmentId);
      const profitSplit = round(batch.netProfit / 2);

      const driverRate = batch.totalArrivedKg > 0 ? batch.driverCostTotal / batch.totalArrivedKg : 0;
      const storeRate = batch.totalArrivedKg > 0 ? batch.storeCostTotal / batch.totalArrivedKg : 0;
      const postalRate = batch.totalClientKg > 0 ? batch.postalCostTotal / batch.totalClientKg : 0;

      // 1. Logo & Business Header
      if (businessSettings.logoUrl) {
        try {
          doc.addImage(businessSettings.logoUrl, 'PNG', margin, 10, 25, 25);
        } catch (e) {
          console.error("Could not add logo to PDF", e);
        }
      }

      doc.setFontSize(22);
      doc.setTextColor(20, 184, 166); 
      doc.text(businessSettings.name, businessSettings.logoUrl ? 42 : margin, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Official Financial Reconciliation Matrix`, businessSettings.logoUrl ? 42 : margin, 28);
      doc.text(`Vessel: ${shipment?.name || 'N/A'} | Arrival: ${batch.batchDate}`, businessSettings.logoUrl ? 42 : margin, 33);

      // 2. The Unified Master Table
      const tableHeaders = [
        'Owner Name', 
        'Type', 
        'Weight (KG)', 
        'Driver Share', 
        'Store Share', 
        'Freight/Postal', 
        'Total Exp', 
        'Revenue', 
        'Net Result', 
        'Profit Split'
      ];

      const tableRows = batch.items.map(item => {
        const isPartner = item.ownerType === 'Partner';
        const weight = safeNum(item.arrivedKg);
        const dShare = weight * driverRate;
        const sShare = weight * storeRate;
        const specRate = isPartner ? batch.freightRatePerKg : postalRate;
        const specExp = weight * specRate;
        const totalExp = dShare + sShare + specExp;
        
        const rev = !isPartner ? weight * safeNum(item.serviceFeePerKg) : 0;
        const netResult = !isPartner ? rev - totalExp : -totalExp;
        
        const isMainPartner = item.ownerName === businessSettings.partner1 || item.ownerName === businessSettings.partner2;

        return [
          item.ownerName,
          item.ownerType,
          weight.toLocaleString(),
          `$${dShare.toFixed(2)}`,
          `$${sShare.toFixed(2)}`,
          `$${specExp.toFixed(2)}`,
          `$${totalExp.toFixed(2)}`,
          isPartner ? '-' : `$${rev.toFixed(2)}`,
          `$${netResult.toFixed(2)}`,
          isMainPartner ? `$${profitSplit.toLocaleString()}` : '-'
        ];
      });

      autoTable(doc, {
        startY: 45,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 
          0: { fontStyle: 'bold' },
          8: { fontStyle: 'bold' }, 
          9: { fontStyle: 'bold', textColor: [20, 184, 166], fillColor: [240, 253, 250] } 
        }
      });

      // 3. Calculation Logic Footer
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text('Calculation Basis & Rates Applied:', margin, finalY);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Metric', 'Total Amount', 'Derived Rate per KG']],
        body: [
          ['Driver Costs', `$${batch.driverCostTotal.toLocaleString()}`, `$${driverRate.toFixed(4)}/KG`],
          ['Store Costs', `$${batch.storeCostTotal.toLocaleString()}`, `$${storeRate.toFixed(4)}/KG`],
          ['Freight Costs (Partners)', '-', `$${batch.freightRatePerKg.toFixed(4)}/KG`],
          ['Postal Costs (Clients)', `$${batch.postalCostTotal.toLocaleString()}`, `$${postalRate.toFixed(4)}/KG`]
        ],
        theme: 'striped',
        styles: { fontSize: 8 }
      });

      doc.save(`Financial_Matrix_${shipment?.name}_${batch.batchDate}.pdf`);
    } catch (err) {
      alert("Error generating PDF. Please ensure all data is valid.");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  if (selectedBatch) {
    const split = round(selectedBatch.netProfit / 2);
    const driverRate = selectedBatch.totalArrivedKg > 0 ? selectedBatch.driverCostTotal / selectedBatch.totalArrivedKg : 0;
    const storeRate = selectedBatch.totalArrivedKg > 0 ? selectedBatch.storeCostTotal / selectedBatch.totalArrivedKg : 0;
    const postalRate = selectedBatch.totalClientKg > 0 ? selectedBatch.postalCostTotal / selectedBatch.totalClientKg : 0;

    return (
      <div className="space-y-4 md:space-y-6 animate-in slide-in-from-right-4 duration-300 pb-24 md:pb-12 px-2 md:px-0">
        <button onClick={() => setSelectedBatch(null)} className="flex items-center gap-2 text-slate-500 font-black text-xs uppercase hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} /> Back to History
        </button>
        
        <div className="bg-white md:rounded-[3rem] rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 md:p-12 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-teal-100 tracking-tighter">Owner Reconciliation</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{selectedBatch.batchDate}</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none truncate">Batch Breakdown</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              {!isEditingCosts ? (
                <>
                  <button onClick={handleStartEdit} className="w-full sm:flex-1 p-3.5 bg-white border border-slate-200 text-teal-600 rounded-xl hover:bg-teal-50 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase">
                    <Edit3 size={14} /> Edit Costs
                  </button>
                  <button onClick={() => handleExportPDF(selectedBatch)} disabled={isExporting} className="w-full sm:flex-1 p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase shadow-lg shadow-slate-200">
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                    PDF Matrix
                  </button>
                </>
              ) : (
                <button onClick={handleSaveEdit} className="w-full bg-teal-500 text-white p-4 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-teal-100 flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} /> Save Changes
                </button>
              )}
            </div>
          </div>

          <div className="p-6 md:p-12 space-y-8">
            {isEditingCosts && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-teal-50/30 p-6 md:p-8 rounded-[2rem] border-2 border-dashed border-teal-100">
                <Input label="Driver (Total $)" value={editData.driverCostTotal} onChange={v => setEditData({...editData, driverCostTotal: Number(v)})} />
                <Input label="Store (Total $)" value={editData.storeCostTotal} onChange={v => setEditData({...editData, storeCostTotal: Number(v)})} />
                <Input label="Freight (Rate/KG)" value={editData.freightRatePerKg} onChange={v => setEditData({...editData, freightRatePerKg: Number(v)})} />
                <Input label="Postal (Total $)" value={editData.postalCostTotal} onChange={v => setEditData({...editData, postalCostTotal: Number(v)})} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard label="Net Batch Profit" value={`$${selectedBatch.netProfit.toLocaleString()}`} icon={TrendingUp} color="teal" />
              <SummaryCard label={`${businessSettings.partner1.split(' ')[0]} Split`} value={`$${split.toLocaleString()}`} icon={DollarSign} color="indigo" />
              <SummaryCard label={`${businessSettings.partner2.split(' ')[0]} Split`} value={`$${split.toLocaleString()}`} icon={DollarSign} color="indigo" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <div className="w-1 h-5 bg-teal-500 rounded-full" />
                 <h4 className="font-black text-slate-800 uppercase tracking-widest text-[10px]">Owner-Specific Audit</h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {selectedBatch.items.map(item => {
                  const isPartner = item.ownerType === 'Partner';
                  const weight = safeNum(item.arrivedKg);
                  const dShare = weight * driverRate;
                  const sShare = weight * storeRate;
                  const specRate = isPartner ? selectedBatch.freightRatePerKg : postalRate;
                  const specExp = weight * specRate;
                  const totalExp = dShare + sShare + specExp;
                  const rev = !isPartner ? weight * safeNum(item.serviceFeePerKg) : 0;
                  const result = !isPartner ? rev - totalExp : -totalExp;
                  const isMainPartner = item.ownerName === businessSettings.partner1 || item.ownerName === businessSettings.partner2;

                  return (
                    <div key={item.id} className="bg-slate-50/50 rounded-[2rem] border border-slate-100 overflow-hidden flex flex-col hover:border-teal-200 transition-all group">
                      <div className="p-6 md:p-8 bg-white border-b flex justify-between items-center">
                        <div className="min-w-0">
                          <p className="text-lg font-black text-slate-800 leading-none truncate">{item.ownerName}</p>
                          <div className="flex items-center gap-2 mt-2">
                             <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${isPartner ? 'text-teal-600 bg-teal-50 border-teal-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                                {item.ownerType}
                             </span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{weight.toLocaleString()} KG</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                           <p className="text-[9px] font-black text-teal-600 uppercase tracking-tight">Net Result</p>
                           <p className={`text-xl font-black ${result >= 0 ? 'text-teal-600' : 'text-rose-500'}`}>
                              ${result.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </p>
                        </div>
                      </div>

                      <div className="p-6 md:p-8 space-y-4">
                         <div className="grid grid-cols-2 gap-3">
                            <CostBreakdownItem icon={Truck} label="Driver" total={dShare} />
                            <CostBreakdownItem icon={Warehouse} label="Store" total={sShare} />
                            <CostBreakdownItem icon={isPartner ? Ship : Mail} label={isPartner ? "Freight" : "Postal"} total={specExp} highlight />
                            <div className="bg-slate-900 rounded-xl p-4 text-white flex flex-col justify-center">
                               <p className="text-[8px] font-black uppercase opacity-50 mb-1">Total Expense</p>
                               <p className="text-base font-black">${totalExp.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                            </div>
                         </div>
                         
                         {isMainPartner && (
                           <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex justify-between items-center">
                              <span className="text-[9px] font-black text-teal-600 uppercase">Profit Split (50/50)</span>
                              <span className="text-base font-black text-teal-700">${split.toLocaleString()}</span>
                           </div>
                         )}
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
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300 pb-24 md:pb-12 px-2 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Financial Matrix</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Audit trail for all vessels</p>
        </div>
        <div className="bg-teal-50 text-teal-600 p-2.5 rounded-xl"><FileText size={20} /></div>
      </div>
      <div className="space-y-2">
        {allBatches.length === 0 ? (
          <div className="bg-white p-12 md:p-20 rounded-[2rem] text-center border-2 border-dashed border-slate-200">
            <Info size={32} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Empty History</h3>
          </div>
        ) : (
          allBatches.map(b => (
            <div key={b.id} onClick={() => setSelectedBatch(b)} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between cursor-pointer hover:border-teal-300 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors"><Calendar size={18} /></div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{b.batchDate}</p>
                  <h3 className="text-base font-black text-slate-800 truncate max-w-[140px] sm:max-w-none">{b.shipmentName}</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Batch Profit</p>
                <p className="text-base font-black text-teal-600">${b.netProfit.toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const CostBreakdownItem = ({ icon: Icon, label, total, highlight }: any) => (
  <div className={`p-3 rounded-xl border ${highlight ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
     <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={10} className={highlight ? 'text-amber-500' : 'text-slate-400'} />
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter shrink-0">{label} Share</span>
     </div>
     <p className="text-sm font-black text-slate-800 leading-none">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
  </div>
);

const SummaryCard = ({ label, value, icon: Icon, color }: any) => (
  <div className={`p-5 rounded-[2rem] border bg-white shadow-sm flex flex-col justify-between ${color === 'teal' ? 'border-teal-100' : 'border-indigo-100'}`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color === 'teal' ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600'}`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <p className={`text-xl font-black tracking-tight ${color === 'teal' ? 'text-teal-600' : 'text-indigo-600'}`}>{value}</p>
    </div>
  </div>
);

const Input = ({ label, value, onChange }: any) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input type="number" className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-teal-500 rounded-xl outline-none text-sm font-black transition-all" value={value || ''} onChange={e => onChange(e.target.value)} />
  </div>
);

export default Reporting;
