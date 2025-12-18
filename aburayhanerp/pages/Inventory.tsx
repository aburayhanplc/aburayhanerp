
import React from 'react';
import { Boxes, Info, PieChart as PieChartIcon, Scale } from 'lucide-react';
import { MasterShipment } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { round } from '../services/erpService';

interface InventoryProps {
  shipments: MasterShipment[];
}

const COLORS = ['#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

const Inventory: React.FC<InventoryProps> = ({ shipments }) => {
  // Fix: Removed type argument from reduce to resolve "Untyped function calls may not accept type arguments" error. 
  // Typing is handled via explicit parameter typing and initial value casting.
  const stockByOwner = shipments.filter(s => !s.isArchived).reduce((acc: Record<string, any>, s) => {
    s.items.forEach(item => {
      if (!acc[item.ownerName]) {
        acc[item.ownerName] = { 
          name: item.ownerName, 
          type: item.ownerType, 
          arrived: 0, 
          planned: 0,
          remaining: 0
        };
      }
      acc[item.ownerName].arrived = round(acc[item.ownerName].arrived + item.arrivedKg);
      acc[item.ownerName].planned = round(acc[item.ownerName].planned + item.plannedKg);
      acc[item.ownerName].remaining = Math.max(0, round(acc[item.ownerName].planned - acc[item.ownerName].arrived));
    });
    return acc;
  }, {} as Record<string, any>);

  const stockArray = Object.values(stockByOwner);
  const pieDataArrived = stockArray.map((s: any) => ({ name: s.name, value: s.arrived }));
  // Fix: Removed type argument from reduce to resolve "Untyped function calls may not accept type arguments" error.
  const totalInStore = round(stockArray.reduce((sum: number, s: any) => sum + (s.arrived || 0), 0));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="px-2 md:px-0">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Stockpile</h2>
        <p className="text-sm text-slate-500 font-medium">Real-time inventory levels across active vessels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {stockArray.length === 0 ? (
               <div className="col-span-full py-20 bg-white border border-dashed border-slate-200 rounded-[2.5rem] text-center">
                  <Boxes size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active stock detected</p>
               </div>
             ) : stockArray.map((owner: any, idx) => (
               <div key={owner.name} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:border-teal-100 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                          {owner.name.charAt(0)}
                       </div>
                       <div>
                          <p className="font-black text-slate-800 tracking-tight">{owner.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{owner.type}</p>
                       </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Active Vessel</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-bold">Fulfillment</span>
                        <span className="font-black text-slate-800">{owner.planned > 0 ? Math.round((owner.arrived / owner.planned) * 100) : 0}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${owner.planned > 0 ? (owner.arrived / owner.planned) * 100 : 0}%`, backgroundColor: COLORS[idx % COLORS.length] }} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                       <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">In Store</p>
                          <p className="text-base font-black text-slate-800">{owner.arrived.toLocaleString()} <span className="text-[10px] text-slate-400">KG</span></p>
                       </div>
                       <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                          <p className="text-base font-black text-teal-600">{owner.remaining.toLocaleString()} <span className="text-[10px] text-teal-300">KG</span></p>
                       </div>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <PieChartIcon size={20} className="text-teal-500" /> Ownership Split
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDataArrived} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                      {pieDataArrived.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-6">
                {stockArray.map((s: any, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 font-bold">{s.name}</span>
                    </div>
                    <span className="font-black text-slate-800">{s.arrived.toLocaleString()} KG</span>
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-bl-full pointer-events-none" />
              <Scale size={24} className="text-teal-400 mb-4" />
              <h3 className="text-lg font-black mb-1">Global Active Weight</h3>
              <p className="text-3xl font-black text-white">
                {totalInStore.toLocaleString()}
                <span className="text-sm font-bold text-teal-500 ml-1.5 uppercase tracking-widest">KG</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-4 leading-relaxed font-black uppercase tracking-[0.1em]">
                Aggregated from {shipments.filter(s => !s.isArchived).length} non-archived vessels.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
