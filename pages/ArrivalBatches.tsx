
import React, { useState } from 'react';
import { PackageCheck, ArrowRight, X, Check, Info, Zap } from 'lucide-react';
import { MasterShipment, ArrivalBatch, ArrivalItem } from '../types';
import { calculateBatchFinancials, safeNum, round } from '../services/erpService';

interface ArrivalBatchesProps {
  shipments: MasterShipment[];
  setShipments: React.Dispatch<React.SetStateAction<MasterShipment[]>>;
}

const ArrivalBatches: React.FC<ArrivalBatchesProps> = ({ shipments, setShipments }) => {
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batchData, setBatchData] = useState<Partial<ArrivalBatch>>({
    driverCostTotal: 0,
    storeCostTotal: 0,
    freightRatePerKg: 0,
    postalCostTotal: 0,
    batchDate: new Date().toISOString().split('T')[0]
  });

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId);
  const [arrivalItems, setArrivalItems] = useState<ArrivalItem[]>([]);

  const openBatchModal = (shipment: MasterShipment) => {
    setSelectedShipmentId(shipment.id);
    setArrivalItems(shipment.items.map(item => ({
      id: `ai-${Date.now()}-${item.id}`,
      ownerName: item.ownerName,
      ownerType: item.ownerType,
      arrivedKg: 0,
      serviceFeePerKg: item.ownerType === 'Client' ? 1.2 : 0 
    })));
    setIsModalOpen(true);
  };

  const handleSaveBatch = () => {
    if (!selectedShipment) return;

    const totalWeight = round(arrivalItems.reduce((sum, i) => sum + safeNum(i.arrivedKg), 0));
    if (totalWeight <= 0) return alert("Validation Error: Please record some weight to finalize this batch.");

    for (const item of arrivalItems) {
      const original = selectedShipment.items.find(i => i.ownerName === item.ownerName);
      if (original) {
        const remaining = round(original.plannedKg - (original.arrivedKg || 0));
        if (safeNum(item.arrivedKg) > remaining + 0.1) {
          return alert(`Limit Error: ${item.ownerName} has exceeded their vessel manifest limit of ${remaining}kg.`);
        }
      }
    }

    const calculatedBatch = calculateBatchFinancials(batchData, arrivalItems);
    calculatedBatch.id = `batch-${Date.now()}`;
    calculatedBatch.masterShipmentId = selectedShipment.id;

    setShipments(prev => prev.map(s => {
      if (s.id === selectedShipmentId) {
        const updatedItems = s.items.map(orig => {
          const match = arrivalItems.find(a => a.ownerName === orig.ownerName);
          return match ? { ...orig, arrivedKg: round((orig.arrivedKg || 0) + safeNum(match.arrivedKg)) } : orig;
        });
        
        const totalArrived = round(updatedItems.reduce((sum, i) => sum + (i.arrivedKg || 0), 0));
        const status = totalArrived >= s.totalPlannedKg - 0.5 ? 'Completed' : 'Partially Arrived';
        
        return {
          ...s,
          items: updatedItems,
          batches: [...(s.batches || []), calculatedBatch],
          status: status as any
        };
      }
      return s;
    }));

    setIsModalOpen(false);
    setBatchData({ driverCostTotal: 0, storeCostTotal: 0, freightRatePerKg: 0, postalCostTotal: 0, batchDate: new Date().toISOString().split('T')[0] });
  };

  const totalBatchLoad = round(arrivalItems.reduce((sum, i) => sum + safeNum(i.arrivedKg), 0));

  return (
    <div className="space-y-4 md:space-y-6 pb-24 px-2 md:px-0">
      <div className="space-y-1">
        <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter">Cargo Arrival</h2>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Weight Receipt & Logistics Matrix</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {shipments.filter(s => !s.isArchived).length === 0 ? (
          <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
             <Info className="text-slate-200 mb-2" size={32} />
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No active vessels in logistics log</p>
          </div>
        ) : (
          shipments.filter(s => !s.isArchived).map(s => {
            const arrived = round(s.items.reduce((sum, i) => sum + (i.arrivedKg || 0), 0));
            const remaining = Math.max(0, round(s.totalPlannedKg - arrived));

            return (
              <div key={s.id} className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:border-teal-200 transition-all group">
                <div className="space-y-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none truncate group-hover:text-teal-600 transition-colors">{s.name}</h3>
                      <p className="text-[9px] text-slate-400 font-black mt-2 uppercase tracking-widest">{s.dispatchDate}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border shrink-0 ${
                      s.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">In Store</p>
                      <p className="text-xl font-black text-teal-600">{arrived.toLocaleString()} <span className="text-[10px] opacity-40">KG</span></p>
                    </div>
                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">To Come</p>
                      <p className="text-xl font-black text-slate-800">{remaining.toLocaleString()} <span className="text-[10px] opacity-40">KG</span></p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => openBatchModal(s)}
                  disabled={s.status === 'Completed'}
                  className={`w-full mt-8 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    s.status === 'Completed' 
                      ? 'bg-slate-50 text-slate-300 border border-slate-200' 
                      : 'bg-slate-900 text-white shadow-xl hover:bg-teal-600 active:scale-95'
                  }`}
                >
                  Receive Cargo <ArrowRight size={18} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && selectedShipment && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-20 duration-500">
            {/* Header */}
            <div className="p-6 md:p-8 border-b flex justify-between items-center bg-white sticky top-0 z-20">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl shadow-inner"><PackageCheck size={24} /></div>
                 <div>
                    <h3 className="text-xl font-black text-slate-800 leading-none">Arrival Receipt</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{selectedShipment.name}</p>
                 </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-90"><X size={20} className="text-slate-400" /></button>
            </div>

            {/* Body */}
            <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-10 scrollbar-hide pb-40 md:pb-10">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-teal-500 rounded-full" />
                  <h4 className="font-black text-[11px] text-slate-800 uppercase tracking-widest">Shared Batch Logistics</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormInput label="Driver ($)" value={batchData.driverCostTotal} onChange={v => setBatchData({...batchData, driverCostTotal: safeNum(v)})} />
                  <FormInput label="Store ($)" value={batchData.storeCostTotal} onChange={v => setBatchData({...batchData, storeCostTotal: safeNum(v)})} />
                  <FormInput label="Freight Rate" value={batchData.freightRatePerKg} onChange={v => setBatchData({...batchData, freightRatePerKg: safeNum(v)})} isAccent />
                  <FormInput label="Postal ($)" value={batchData.postalCostTotal} onChange={v => setBatchData({...batchData, postalCostTotal: safeNum(v)})} />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                  <h4 className="font-black text-[11px] text-slate-800 uppercase tracking-widest">Owner Wise Receipt</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {arrivalItems.map((item, idx) => {
                    const original = selectedShipment.items.find(o => o.ownerName === item.ownerName);
                    const remaining = original ? round(original.plannedKg - (original.arrivedKg || 0)) : 0;
                    return (
                      <div key={item.id} className="bg-slate-50 border border-slate-100 p-6 rounded-[2.5rem] space-y-4 hover:border-teal-200 transition-all group">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-slate-800 text-base leading-none mb-2">{item.ownerName}</p>
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-xl border ${item.ownerType === 'Partner' ? 'text-teal-600 bg-teal-50 border-teal-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                                {item.ownerType}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1 opacity-60">Surplus</p>
                            <p className="text-sm font-black text-slate-700 leading-none">{remaining.toLocaleString()} KG</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1 relative">
                            <input 
                              type="number" 
                              className="w-full h-14 bg-white border border-slate-200 rounded-xl px-5 text-base font-black focus:border-teal-500 outline-none pr-12" 
                              placeholder="0" 
                              value={item.arrivedKg === 0 ? '' : item.arrivedKg} 
                              onChange={e => {
                                const val = safeNum(e.target.value);
                                setArrivalItems(prev => prev.map((it, i) => i === idx ? { ...it, arrivedKg: val } : it));
                              }} 
                            />
                            <button 
                              onClick={() => setArrivalItems(prev => prev.map((it, i) => i === idx ? { ...it, arrivedKg: remaining } : it))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-teal-600 hover:bg-teal-50 rounded-xl transition-all"
                            >
                              <Zap size={14} fill="currentColor" />
                            </button>
                          </div>
                          {item.ownerType === 'Client' && (
                            <div className="w-24 shrink-0">
                              <input 
                                type="number" 
                                className="w-full h-14 bg-white border border-teal-100 rounded-xl px-4 text-base font-black text-teal-600 focus:border-teal-500 outline-none" 
                                placeholder="Fee"
                                value={item.serviceFeePerKg || ''} 
                                onChange={e => {
                                  const val = safeNum(e.target.value);
                                  setArrivalItems(prev => prev.map((it, i) => i === idx ? { ...it, serviceFeePerKg: val } : it));
                                }} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Footer Action Bar: STICKY ON MOBILE */}
            <div className="p-6 md:p-10 bg-slate-900 border-t sticky bottom-0 z-30">
              <div className="flex items-center justify-between gap-6 max-w-5xl mx-auto">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block opacity-60">Batch Manifest Total</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white leading-none">{totalBatchLoad.toLocaleString()}</span>
                    <span className="text-xs font-bold text-teal-400 uppercase tracking-tighter">KG</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="hidden sm:block px-6 py-4 font-black text-slate-400 text-[10px] uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                  <button onClick={handleSaveBatch} className="bg-teal-500 text-white h-16 px-10 rounded-2xl shadow-2xl shadow-teal-500/20 font-black text-[12px] uppercase tracking-widest hover:bg-teal-600 active:scale-95 transition-all flex items-center gap-3">
                    <Check size={20} /> Finalize Batch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FormInput = ({ label, value, onChange, isAccent }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      type="number" 
      className={`w-full h-14 px-5 border-2 rounded-2xl outline-none text-base font-black transition-all ${isAccent ? 'bg-teal-50 border-teal-100 focus:border-teal-500 text-teal-700' : 'bg-slate-50 border-transparent focus:border-teal-500 focus:bg-white text-slate-800'}`}
      value={value === 0 ? '' : value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

export default ArrivalBatches;
