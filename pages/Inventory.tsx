
import React from 'react';
import { Boxes, PieChart as PieChartIcon, Scale, TrendingUp } from 'lucide-react';
import { MasterShipment } from '../types';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { round } from '../services/erpService';

interface InventoryProps {
  shipments: MasterShipment[];
}

const COLORS = ['#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

const Inventory: React.FC<InventoryProps> = ({ shipments }) => {
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
  const totalInStore = round(stockArray.reduce((sum: number, s: any) => sum + (s.arrived || 0), 0) as number);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 pb-24 md:pb-12 px-2 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Stockpile</h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Live Inventory per Owner</p>
        </div>
        <div className="bg-teal-50 text-teal-600 p-2.5 rounded-xl"><Boxes size={20} /></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {stockArray.length === 0 ? (
               <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Store is empty</p>
               </div>
             ) : stockArray.map((owner: any, idx) => (
               <div key={owner.name} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:border-teal-200 transition-all">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                          {owner.name.charAt(0)}
                       </div>
                       <div className="min-w-0">
                          <p className="font-black text-slate-800 tracking-tight truncate">{owner.name}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{owner.type}</p>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[9px] font-black uppercase mb-2">
                        <span className="text-slate-400">Arrived Stock</span>
                        <span className="text-slate-800">{owner.planned > 0 ? Math.round((owner.arrived / owner.planned) * 100) : 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full transition-all duration-1000" 
                          style={{ width: `${owner.planned > 0 ? (owner.arrived / owner.planned) * 100 : 0}%`, backgroundColor: COLORS[idx % COLORS.length] }} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                       <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">In Store</p>
                          <p className="text-lg font-black text-slate-800 leading-none">{owner.arrived.toLocaleString()} <span className="text-[10px] opacity-40">KG</span></p>
                       </div>
                       <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[8px] font-black text-slate-400 uppercase mb-1">To Come</p>
                          <p className="text-lg font-black text-teal-600 leading-none">{owner.remaining.toLocaleString()} <span className="text-[10px] opacity-40">KG</span></p>
                       </div>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <PieChartIcon size={14} className="text-teal-500" /> Share Distribution
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieDataArrived} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value" stroke="none">
                      {pieDataArrived.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', fontSize: '10px'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-bl-full pointer-events-none group-hover:bg-teal-500/20 transition-all" />
              <Scale size={24} className="text-teal-400 mb-4" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Global Store</h3>
              <p className="text-4xl font-black text-white tracking-tighter">
                {totalInStore.toLocaleString()}
                <span className="text-sm font-bold text-teal-500 ml-2 uppercase">KG</span>
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
