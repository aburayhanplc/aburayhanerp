
import React, { useState } from 'react';
import { PackageCheck, ArrowRight, X, Check, Scale } from 'lucide-react';
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
    driverCost: 0,
    storeCost: 0,
    freightCost: 0,
    postalCost: 0,
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
      serviceFeePerKg: item.ownerType === 'Client' ? 2.5 : 0
    })));
    setIsModalOpen(true);
  };

  const handleSaveBatch = () => {
    if (!selectedShipment) return;

    for (const item of arrivalItems) {
      const original = selectedShipment.items.find(i => i.ownerName === item.ownerName);
      if (original) {
        const remaining = round(original.plannedKg - original.arrivedKg);
        if (safeNum(item.arrivedKg) > remaining + 0.001) {
          alert(`Error: ${item.ownerName} cannot exceed remaining ${remaining.toLocaleString()} KG`);
          return;
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
          return match ? { ...orig, arrivedKg: round(orig.arrivedKg + safeNum(match.arrivedKg)) } : orig;
        });
        
        const totalArrived = round(updatedItems.reduce((sum, i) => sum + i.arrivedKg, 0));
        const status = totalArrived >= s.totalPlannedKg - 0.1 ? 'Completed' : 'Partially Arrived';
        
        return {
          ...s,
          items: updatedItems,
          batches: [...s.batches, calculatedBatch],
          status: status as any
        };
      }
      return s;
    }));

    setIsModalOpen(false);
    setBatchData({ driverCost: 0, storeCost: 0, freightCost: 0, postalCost: 0, batchDate: new Date().toISOString().split('T')[0] });
  };

  const totalBatchLoad = round(arrivalItems.reduce((sum, i) => sum + safeNum(i.arrivedKg), 0));

  return (
    <div className="space-y-6">
      <div className="px-2 md:px-0">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Cargo Arrival</h2>
        <p className="text-sm text-slate-500 font-medium">Record arrivals for specific master vessels</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shipments.filter(s => !s.isArchived).map(s => {
          const arrived = round(s.items.reduce((sum, i) => sum + i.arrivedKg, 0));
          const remaining = round(s.totalPlannedKg - arrived);
          const progress = Math.min(100, Math.round((arrived / s.totalPlannedKg) * 100));

          return (
            <div key={s.id} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all h-full">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight truncate">{s.name}</h3>
                    <p className="text-[10px] text-slate-400 font-black mt-1 uppercase tracking-widest">{s.dispatchDate}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight border shrink-0 ${
                    s.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
                    <p className="text-sm font-black text-slate-800">{progress}%</p>
                  </div>
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div className="h-full bg-teal-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Stock Left</p>
                    <p className="text-base font-black text-slate-800">{remaining.toLocaleString()} <span className="text-[10px] text-slate-400">KG</span></p>
                  </div>
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Batches</p>
                    <p className="text-base font-black text-teal-600">{s.batches.length}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => openBatchModal(s)}
                disabled={s.status === 'Completed'}
                className={`w-full mt-6 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  s.status === 'Completed' 
                    ? 'bg-slate-100 text-slate-300 border border-slate-200' 
                    : 'bg-teal-500 text-white shadow-lg shadow-teal-100/50 hover:bg-teal-600 active:scale-95'
                }`}
              >
                Record Arrival <ArrowRight size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {isModalOpen && selectedShipment && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-4xl h-[92vh] md:h-auto md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-300">
            {/* Header */}
            <div className="px-6 py-5 md:p-8 border-b flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><PackageCheck size={20} /></div>
                 <div>
                    <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-none">New Batch</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{selectedShipment.name}</p>
                 </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={20} className="text-slate-400" /></button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-8 scrollbar-hide">
              <section className="space-y-4">
                <div className="flex items-center gap-2"><div className="w-1.5 h-4 bg-teal-500 rounded-full" /><h4 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Shared Logistics Costs</h4></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  {[
                    { key: 'driverCost', label: 'Driver ($)' },
                    { key: 'storeCost', label: 'Store ($)' },
                    { key: 'freightCost', label: 'Freight ($)' },
                    { key: 'postalCost', label: 'Postal ($)' }
                  ].map(cost => (
                    <div key={cost.key} className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{cost.label}</label>
                      <input 
                        type="number" 
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-xl md:rounded-2xl outline-none text-sm font-black transition-all" 
                        value={(batchData as any)[cost.key] || ''} 
                        onChange={e => setBatchData({...batchData, [cost.key]: e.target.value})} 
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2"><div className="w-1.5 h-4 bg-amber-500 rounded-full" /><h4 className="font-black text-[10px] text-slate-800 uppercase tracking-widest">Owner Weight Arrival</h4></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {arrivalItems.map((item, idx) => {
                    const original = selectedShipment.items.find(o => o.ownerName === item.ownerName);
                    const remaining = original ? round(original.plannedKg - original.arrivedKg) : 0;
                    return (
                      <div key={item.id} className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                          <div className="min-w-0">
                            <p className="font-black text-slate-800 text-sm truncate">{item.ownerName}</p>
                            <span className={`text-[8px] uppercase font-black tracking-widest mt-1 block ${item.ownerType === 'Partner' ? 'text-teal-500' : 'text-amber-500'}`}>{item.ownerType}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Limit</p>
                            <p className="text-xs font-black text-slate-600">{remaining.toLocaleString()} KG</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Arrived KG</label>
                            <input 
                              type="number" 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black focus:ring-2 ring-teal-500 outline-none" 
                              placeholder="0" 
                              value={item.arrivedKg || ''} 
                              onChange={e => {
                                const items = [...arrivalItems];
                                items[idx].arrivedKg = e.target.value as any;
                                setArrivalItems(items);
                              }} 
                            />
                          </div>
                          {item.ownerType === 'Client' && (
                            <div className="w-24 space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Fee/KG</label>
                              <input 
                                type="number" 
                                className="w-full bg-teal-50/50 border border-teal-100 rounded-xl px-4 py-2.5 text-sm font-black text-teal-600 focus:ring-2 ring-teal-500 outline-none" 
                                value={item.serviceFeePerKg} 
                                onChange={e => {
                                  const items = [...arrivalItems];
                                  items[idx].serviceFeePerKg = e.target.value as any;
                                  setArrivalItems(items);
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

            {/* Compressed Mobile Footer */}
            <div className="px-6 py-4 md:p-6 bg-slate-900 border-t shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Total Payload</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg md:text-2xl font-black text-white">{totalBatchLoad.toLocaleString()}</span>
                    <span className="text-[9px] font-bold text-teal-500">KG</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="px-4 py-2 font-black text-slate-400 text-[10px] uppercase tracking-widest hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveBatch} 
                    className="bg-teal-500 text-white px-5 py-2.5 rounded-xl md:rounded-2xl shadow-lg shadow-teal-500/20 font-black text-[10px] uppercase tracking-widest hover:bg-teal-600 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Check size={14} /> Finalize Batch
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

export default ArrivalBatches;
