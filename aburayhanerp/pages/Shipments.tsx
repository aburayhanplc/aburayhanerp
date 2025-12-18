
import React, { useState, useMemo } from 'react';
import { Plus, Calendar, Trash2, Ship, Archive, ArchiveRestore, Layers, X, UserPlus, AlertCircle } from 'lucide-react';
import { MasterShipment, ShipmentItem } from '../types';
import { getShipmentProgress } from '../services/erpService';

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
    { id: '1', ownerName: businessSettings.partner1, ownerType: 'Partner', plannedKg: 0, arrivedKg: 0 },
    { id: '2', ownerName: businessSettings.partner2, ownerType: 'Partner', plannedKg: 0, arrivedKg: 0 },
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

  const handleDeleteShipment = (id: string) => {
    if (window.confirm("Are you sure you want to PERMANENTLY delete this shipment? All associated arrival batches will be lost.")) {
      setShipments(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleToggleArchive = (id: string) => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, isArchived: !s.isArchived } : s));
  };

  const currentSum = useMemo(() => {
    return (newShipment.items?.reduce((sum, i) => sum + (i.plannedKg || 0), 0) || 0);
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

  const handleRemoveItem = (id: string) => {
    setNewShipment(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== id)
    }));
  };

  const handleUpdateItem = (id: string, updates: Partial<ShipmentItem>) => {
    setNewShipment(prev => ({
      ...prev,
      items: (prev.items || []).map(item => item.id === id ? { ...item, ...updates } : item)
    }));
  };

  const handleSave = () => {
    if (!newShipment.name?.trim()) return alert("Please enter a Shipment Name.");
    if (!newShipment.totalPlannedKg || newShipment.totalPlannedKg <= 0) return alert("Invalid Total Payload.");
    
    // Check for empty owner names
    if (newShipment.items?.some(i => !i.ownerName.trim())) {
      return alert("All owners must have a name.");
    }

    const diff = Math.abs(currentSum - (newShipment.totalPlannedKg || 0));
    if (diff > 0.001) return alert(`Weight mismatch! Assigned: ${currentSum} KG, Target: ${newShipment.totalPlannedKg} KG`);

    const shipment: MasterShipment = {
      id: `ms-${Date.now()}`,
      name: newShipment.name!,
      dispatchDate: newShipment.dispatchDate!,
      status: 'In Transit',
      totalPlannedKg: newShipment.totalPlannedKg!,
      items: newShipment.items!.map(i => ({ ...i, arrivedKg: 0 })),
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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Logistics Hub</h2>
          <p className="text-sm text-slate-500 font-medium">Track and manage master containers</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 p-1 rounded-2xl flex shadow-sm">
            <button 
              onClick={() => setViewMode('Active')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'Active' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setViewMode('Archived')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'Archived' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Archived
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-teal-500 text-white px-6 py-3 rounded-2xl shadow-lg shadow-teal-100 flex items-center gap-2 font-black text-sm hover:bg-teal-600 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span className="hidden md:inline">Create Shipment</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 md:px-0">
        {filteredShipments.length === 0 ? (
          <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
             <Ship size={48} className="mx-auto text-slate-200 mb-4" />
             <p className="text-slate-400 font-bold">No {viewMode.toLowerCase()} shipments found.</p>
          </div>
        ) : (
          filteredShipments.map(shipment => {
            const totalArrived = shipment.items.reduce((sum, i) => sum + i.arrivedKg, 0);
            const totalCosts = shipment.batches.reduce((sum, b) => sum + (b.driverCost + b.storeCost + b.freightCost + b.postalCost), 0);
            const progress = getShipmentProgress(shipment);

            return (
              <div key={shipment.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-teal-200 transition-all group flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                       <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                        shipment.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        shipment.status === 'Partially Arrived' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {shipment.status}
                      </span>
                      {shipment.isArchived && <span className="bg-slate-800 text-white text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest">Archived</span>}
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mt-2 tracking-tight group-hover:text-teal-600 transition-colors truncate">{shipment.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1"><Calendar size={10} /> {shipment.dispatchDate}</p>
                  </div>
                  
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleToggleArchive(shipment.id)}
                      className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                      title={shipment.isArchived ? "Unarchive" : "Archive"}
                    >
                      {shipment.isArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                    </button>
                    <button 
                      onClick={() => handleDeleteShipment(shipment.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Shipment"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6 flex-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      <span>Arrival Progress</span>
                      <span className="text-slate-800">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-teal-500'}`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total Payload</p>
                      <p className="text-base font-black text-slate-800">{shipment.totalPlannedKg.toLocaleString()} <span className="text-xs text-slate-400">KG</span></p>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Running Cost</p>
                      <p className="text-base font-black text-rose-600">${totalCosts.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                      <Layers size={10} /> Vessel Manifest
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {shipment.items.map(i => (
                        <div key={i.id} className="px-3 py-2 bg-slate-50 text-[11px] rounded-xl border border-slate-100 flex items-baseline gap-2">
                          <span className="font-black text-slate-700">{i.ownerName}</span>
                          <span className="text-teal-600 font-bold">{i.arrivedKg}/{i.plannedKg}kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[3rem] md:rounded-[3rem] w-full max-w-4xl h-[92vh] md:h-auto md:max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col border border-white/20">
            <div className="p-8 md:p-10 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center text-white">
                  <Ship size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">New Master Shipment</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Configure container capacity & ownership</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-8 md:p-10 space-y-10 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Container Name / ID</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none font-black transition-all" 
                    placeholder="e.g. AX-2025-001" 
                    value={newShipment.name} 
                    onChange={e => setNewShipment({...newShipment, name: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dispatch Date</label>
                  <input 
                    type="date" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none font-black transition-all" 
                    value={newShipment.dispatchDate} 
                    onChange={e => setNewShipment({...newShipment, dispatchDate: e.target.value})} 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Master Payload (KG)</label>
                  <input 
                    type="number" 
                    className="w-full px-5 py-5 bg-slate-900 text-teal-400 rounded-3xl outline-none font-black text-2xl shadow-inner" 
                    placeholder="0" 
                    value={newShipment.totalPlannedKg || ''} 
                    onChange={e => setNewShipment({...newShipment, totalPlannedKg: Number(e.target.value)})} 
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-teal-500 rounded-full" />
                    <h4 className="font-black text-sm text-slate-800 uppercase tracking-widest">Weight Allocation</h4>
                  </div>
                  <button 
                    onClick={handleAddItem}
                    className="flex items-center gap-2 text-teal-600 bg-teal-50 px-4 py-2 rounded-xl text-xs font-black hover:bg-teal-100 transition-all"
                  >
                    <UserPlus size={14} /> Add Client
                  </button>
                </div>

                <div className="space-y-3">
                  {newShipment.items?.map((item) => (
                    <div key={item.id} className="flex flex-col md:flex-row gap-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 group">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Owner Name</label>
                        <input 
                          type="text" 
                          disabled={item.ownerType === 'Partner'}
                          className={`w-full px-4 py-3 rounded-xl border border-transparent font-black text-sm outline-none transition-all ${item.ownerType === 'Partner' ? 'bg-slate-100 text-slate-500' : 'bg-white focus:ring-2 ring-teal-500'}`}
                          placeholder="Owner Name"
                          value={item.ownerName}
                          onChange={e => handleUpdateItem(item.id, { ownerName: e.target.value })}
                        />
                      </div>
                      <div className="w-full md:w-32 space-y-1 text-center">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                        <div className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-tight border ${item.ownerType === 'Partner' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {item.ownerType}
                        </div>
                      </div>
                      <div className="w-full md:w-48 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Planned KG</label>
                        <input 
                          type="number" 
                          className="w-full px-4 py-3 bg-white rounded-xl border border-transparent font-black text-sm outline-none focus:ring-2 ring-teal-500 transition-all"
                          placeholder="0"
                          value={item.plannedKg || ''}
                          onChange={e => handleUpdateItem(item.id, { plannedKg: Number(e.target.value) })}
                        />
                      </div>
                      {item.ownerType !== 'Partner' && (
                        <div className="flex items-end pb-1 justify-center">
                          <button 
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 md:p-10 bg-slate-50 border-t flex flex-col md:flex-row items-stretch md:items-center justify-between gap-8">
              <div className="flex items-center gap-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Weight</p>
                  <p className="text-2xl font-black text-slate-800">{newShipment.totalPlannedKg?.toLocaleString() || 0} <span className="text-xs text-slate-400 font-bold">KG</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Weight</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-black ${Math.abs(currentSum - (newShipment.totalPlannedKg || 0)) < 0.001 ? 'text-teal-600' : 'text-amber-500'}`}>
                      {currentSum.toLocaleString()} <span className="text-xs font-bold opacity-50">KG</span>
                    </p>
                    {Math.abs(currentSum - (newShipment.totalPlannedKg || 0)) > 0.001 && (
                      <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-lg text-[10px] font-black">
                        <AlertCircle size={10} /> Mismatch
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-xs">Cancel</button>
                <button 
                  onClick={handleSave} 
                  className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] shadow-xl font-black text-sm uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all active:scale-95"
                >
                  Confirm Manifest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipments;
