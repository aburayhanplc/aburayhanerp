
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Ship, Layers, X, UserPlus, Scale, AlertCircle, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { MasterShipment, ShipmentItem } from '../types';
import { getShipmentProgress, round, safeNum } from '../services/erpService';

interface ShipmentsProps {
  shipments: MasterShipment[];
  setShipments: React.Dispatch<React.SetStateAction<MasterShipment[]>>;
  businessSettings: {
    partner1: string;
    partner2: string;
  };
}

const Shipments: React.FC<ShipmentsProps> = ({ shipments, setShipments, businessSettings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'Active' | 'Archived'>('Active');
  
  const getInitialItems = () => [
    { id: '1', ownerName: businessSettings.partner1 || 'Partner 1', ownerType: 'Partner', plannedKg: 0, arrivedKg: 0 },
    { id: '2', ownerName: businessSettings.partner2 || 'Partner 2', ownerType: 'Partner', plannedKg: 0, arrivedKg: 0 },
  ] as ShipmentItem[];

  const [newShipment, setNewShipment] = useState<Partial<MasterShipment>>({
    name: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    status: 'Draft',
    totalPlannedKg: 0,
    items: getInitialItems()
  });

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => viewMode === 'Archived' ? s.isArchived : !s.isArchived);
  }, [shipments, viewMode]);

  const currentSum = useMemo(() => {
    return round(newShipment.items?.reduce((sum, i) => sum + safeNum(i.plannedKg), 0) || 0);
  }, [newShipment.items]);

  const handleAddItem = () => {
    setNewShipment(prev => ({
      ...prev,
      items: [
        ...(prev.items || []),
        { id: `owner-${Date.now()}`, ownerName: '', ownerType: 'Client', plannedKg: 0, arrivedKg: 0 }
      ]
    }));
  };

  const handleUpdateItem = (id: string, updates: Partial<ShipmentItem>) => {
    setNewShipment(prev => ({
      ...prev,
      items: (prev.items || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const handleRemoveItem = (id: string) => {
    setNewShipment(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== id)
    }));
  };

  const handleSave = () => {
    const nameStr = String(newShipment.name || '').trim();
    const targetPayload = safeNum(newShipment.totalPlannedKg);
    const items = newShipment.items || [];

    // Validation
    if (!nameStr) {
      alert("Validation Failed: Please enter a Vessel or Shipment Name.");
      return;
    }
    if (targetPayload <= 0) {
      alert("Validation Failed: Total Target Payload must be greater than 0.");
      return;
    }
    if (items.some(i => !String(i.ownerName).trim())) {
      alert("Validation Failed: One or more manifest owners are missing names.");
      return;
    }

    // Relaxed tolerance (0.1kg) to avoid float mismatch frustration
    const diff = Math.abs(currentSum - targetPayload);
    if (diff > 0.1) {
      const fix = confirm(`Weight Mismatch: Total assigned is ${currentSum}kg, but target is ${targetPayload}kg.\n\nWould you like to auto-balance the remaining ${round(targetPayload - currentSum)}kg to the last owner and save?`);
      if (fix) {
        autoBalance();
        // Recalculate sum locally for final save
        const balancedItems = newShipment.items?.map((item, idx, arr) => {
          if (idx === arr.length - 1) {
             const others = arr.slice(0, -1).reduce((s, i) => s + safeNum(i.plannedKg), 0);
             return { ...item, plannedKg: round(targetPayload - others) };
          }
          return item;
        }) || [];
        
        saveShipment(nameStr, targetPayload, balancedItems);
      }
      return;
    }

    saveShipment(nameStr, targetPayload, items);
  };

  const saveShipment = (name: string, target: number, items: ShipmentItem[]) => {
    const shipment: MasterShipment = {
      id: `ms-${Date.now()}`,
      name: name,
      dispatchDate: String(newShipment.dispatchDate || new Date().toISOString().split('T')[0]),
      status: 'In Transit',
      totalPlannedKg: target,
      items: items.map(i => ({ 
        ...i, 
        ownerName: String(i.ownerName).trim(),
        plannedKg: round(safeNum(i.plannedKg)),
        arrivedKg: 0 
      })),
      batches: [],
      isArchived: false
    };

    setShipments(prev => [...prev, shipment]);
    setIsModalOpen(false);
    setNewShipment({
      name: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      status: 'Draft',
      totalPlannedKg: 0,
      items: getInitialItems()
    });
  };

  const autoBalance = () => {
    if (!newShipment.items || newShipment.items.length === 0) return;
    const target = safeNum(newShipment.totalPlannedKg);
    const othersSum = round(newShipment.items.slice(0, -1).reduce((sum, i) => sum + safeNum(i.plannedKg), 0));
    const remainder = Math.max(0, round(target - othersSum));
    
    const lastItem = newShipment.items[newShipment.items.length - 1];
    handleUpdateItem(lastItem.id, { plannedKg: remainder });
  };

  return (
    <div className="space-y-4 md:space-y-6 pb-24 animate-in fade-in duration-300 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter">Master Log</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Global Logistics Ledger</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="bg-white border border-slate-200 p-1 rounded-2xl flex shadow-sm flex-1 md:flex-none">
            <button 
              onClick={() => setViewMode('Active')}
              className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'Active' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setViewMode('Archived')}
              className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'Archived' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}
            >
              Archive
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white h-14 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2 font-black text-xs uppercase hover:bg-teal-600 active:scale-95 transition-all shrink-0"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">New Manifest</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredShipments.length === 0 ? (
          <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
             <Ship size={48} className="text-slate-200 mb-4" />
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No vessels registered in {viewMode}</p>
          </div>
        ) : (
          filteredShipments.map(shipment => {
            const progress = getShipmentProgress(shipment);
            return (
              <div key={shipment.id} className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col hover:shadow-xl hover:border-teal-200 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="min-w-0">
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border block w-fit mb-2 ${
                      shipment.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {shipment.status}
                    </span>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none group-hover:text-teal-600 transition-colors truncate">{shipment.name}</h3>
                    <p className="text-[9px] text-slate-400 font-black uppercase mt-2">{shipment.dispatchDate}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, isArchived: !s.isArchived } : s))} className="p-2.5 bg-slate-50 text-slate-400 hover:text-amber-500 rounded-xl transition-all"><Ship size={16} /></button>
                    <button onClick={() => { if(confirm("Permanently delete this vessel records?")) setShipments(prev => prev.filter(s => s.id !== shipment.id)) }} className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-2">
                      <span>Cargo Status</span>
                      <span className="text-teal-600">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div className="h-full bg-teal-500 transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Manifest</p>
                      <p className="text-lg font-black text-slate-800">{shipment.totalPlannedKg.toLocaleString()} <span className="text-[10px] opacity-40">KG</span></p>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Items</p>
                      <p className="text-lg font-black text-teal-600">{shipment.items.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal - Improved for Mobile Firing */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white rounded-t-[2.5rem] md:rounded-[3rem] w-full max-w-4xl h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-20 duration-500 shadow-2xl border border-white/10">
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b flex justify-between items-center bg-white sticky top-0 z-[110]">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl shadow-inner"><Ship size={24} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 leading-none">Record Shipment</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Manifest Allocation</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all active:scale-90"><X size={20} className="text-slate-400" /></button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-10 flex-1 overflow-y-auto space-y-10 scrollbar-hide pb-40 md:pb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput label="Shipment Reference" placeholder="e.g. AB-V001" value={newShipment.name || ''} onChange={v => setNewShipment({...newShipment, name: v})} />
                <FormInput label="Dispatch Date" type="date" value={newShipment.dispatchDate || ''} onChange={v => setNewShipment({...newShipment, dispatchDate: v})} />
                <div className="md:col-span-2">
                  <FormInput label="Total Target Payload (KG)" type="number" placeholder="Enter Total Weight" value={newShipment.totalPlannedKg === 0 ? '' : newShipment.totalPlannedKg} onChange={v => setNewShipment({...newShipment, totalPlannedKg: safeNum(v)})} isLarge />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[11px] text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-teal-500 rounded-full" />
                    Weight Distribution
                  </h4>
                  <button onClick={handleAddItem} className="flex items-center gap-1.5 text-teal-600 bg-teal-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-100 transition-all"><UserPlus size={14} /> Add Owner</button>
                </div>

                <div className="space-y-3">
                  {newShipment.items?.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row gap-3 p-4 bg-slate-50 border border-slate-100 rounded-[2rem] group hover:border-teal-200 transition-all">
                      <div className="flex-1">
                        <input type="text" disabled={item.ownerType === 'Partner'} className="w-full h-12 bg-white border border-slate-200 rounded-xl px-5 text-sm font-black focus:border-teal-500 outline-none transition-all disabled:opacity-50" placeholder="Owner Name" value={item.ownerName} onChange={e => handleUpdateItem(item.id, { ownerName: e.target.value })} />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-24 shrink-0">
                          <span className={`h-12 flex items-center justify-center rounded-xl text-[9px] font-black uppercase tracking-widest border ${item.ownerType === 'Partner' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                            {item.ownerType}
                          </span>
                        </div>
                        <div className="flex-1 sm:w-36 relative">
                          <input type="number" className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 text-sm font-black focus:border-teal-500 outline-none transition-all text-right pr-10" placeholder="0" value={item.plannedKg === 0 ? '' : item.plannedKg} onChange={e => handleUpdateItem(item.id, { plannedKg: safeNum(e.target.value) })} />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">KG</span>
                        </div>
                        {item.ownerType !== 'Partner' && (
                          <button onClick={() => handleRemoveItem(item.id)} className="h-12 w-12 flex items-center justify-center bg-white text-slate-300 hover:text-rose-500 rounded-xl border border-slate-200 transition-all"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 md:p-10 bg-slate-900 border-t sticky bottom-0 z-[120] pointer-events-auto">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-5xl mx-auto">
                <div className="flex gap-8 w-full sm:w-auto">
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Goal Payload</p>
                    <p className="text-2xl font-black text-white leading-none">{safeNum(newShipment.totalPlannedKg).toLocaleString()} <span className="text-xs text-teal-400 opacity-50">KG</span></p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Allocated</p>
                    <div className="flex items-center gap-2">
                       <p className={`text-2xl font-black leading-none ${Math.abs(currentSum - safeNum(newShipment.totalPlannedKg)) < 0.1 ? 'text-teal-400' : 'text-amber-400'}`}>
                         {currentSum.toLocaleString()} <span className="text-xs opacity-30">KG</span>
                       </p>
                       <button onClick={autoBalance} className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 active:scale-90 transition-all"><Scale size={16} /></button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto pointer-events-auto">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-white transition-all">Cancel</button>
                  <button 
                    type="button"
                    onClick={handleSave} 
                    className="flex-[2] sm:flex-none bg-teal-500 text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase shadow-2xl shadow-teal-500/30 active:scale-95 transition-all hover:bg-teal-400 flex items-center justify-center gap-2 cursor-pointer pointer-events-auto min-h-[60px]"
                  >
                    <CheckCircle2 size={18} /> Submit Manifest
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

const FormInput = ({ label, isLarge, value, onChange, ...props }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      {...props} 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none font-black transition-all ${isLarge ? 'text-2xl text-teal-600 py-6' : 'text-base'}`} 
    />
  </div>
);

export default Shipments;
