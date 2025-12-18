
import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { TrendingUp, Weight, DollarSign, Package } from 'lucide-react';
import { FinancialSummary, MasterShipment } from '../types';

interface DashboardProps {
  stats: FinancialSummary;
  shipments: MasterShipment[];
  businessSettings?: {
    name: string;
    logoUrl: string | null;
  };
}

const COLORS = ['#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899'];

const Dashboard: React.FC<DashboardProps> = ({ stats, shipments }) => {
  const chartData = shipments.flatMap(s => 
    s.batches.map(b => ({
      name: b.batchDate.split('-').slice(1).join('/'),
      profit: b.netProfit,
      revenue: b.totalClientRevenue,
      weight: b.totalPartnerKg + b.totalClientKg
    }))
  ).slice(-5);

  const pieData = [
    { name: 'Partners', value: Math.round(shipments.reduce((acc, s) => acc + s.batches.reduce((bAcc, b) => bAcc + b.totalPartnerKg, 0), 0)) },
    { name: 'Clients', value: Math.round(shipments.reduce((acc, s) => acc + s.batches.reduce((bAcc, b) => bAcc + b.totalClientKg, 0), 0)) }
  ];

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 px-2 md:px-0 pb-24 md:pb-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Enterprise Pulse</h2>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Real-time logistics analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard icon={DollarSign} label="Batch Profit" value={`$${stats.netProfit.toLocaleString()}`} trend="Live" color="bg-teal-50 text-teal-600" />
        <StatCard icon={Weight} label="Total Weight" value={`${Math.round(stats.totalWeight).toLocaleString()} KG`} trend="Sum" color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={TrendingUp} label="Gross Revenue" value={`$${stats.totalRevenue.toLocaleString()}`} trend="Client" color="bg-amber-50 text-amber-600" />
        <StatCard icon={Package} label="Containers" value={shipments.length.toString()} trend="Active" color="bg-slate-900 text-teal-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Financial Trajectory</h3>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                <Bar dataKey="profit" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Net Profit" />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Weight Segment</h3>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value" stroke="none">
                  {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px', fontSize: '10px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-4">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-[10px] font-black uppercase">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-slate-500">{d.name}</span>
                </div>
                <span className="text-slate-800">{d.value.toLocaleString()} KG</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-teal-200 transition-all">
    <div className="flex items-center justify-between mb-6">
      <div className={`p-2.5 rounded-xl ${color}`}><Icon size={18} /></div>
      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{trend}</span>
    </div>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 truncate">{label}</p>
      <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tighter leading-none">{value}</p>
    </div>
  </div>
);

export default Dashboard;
