
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
    { name: 'Partners', value: stats.totalWeight > 0 ? (shipments.reduce((acc, s) => acc + s.batches.reduce((bAcc, b) => bAcc + b.totalPartnerKg, 0), 0)) : 0 },
    { name: 'Clients', value: stats.totalWeight > 0 ? (shipments.reduce((acc, s) => acc + s.batches.reduce((bAcc, b) => bAcc + b.totalClientKg, 0), 0)) : 0 }
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Operational Overview</h2>
          <p className="text-sm text-slate-500">Real-time performance metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard 
          icon={DollarSign} 
          label="Net Profit" 
          value={`$${stats.netProfit.toLocaleString()}`} 
          trend="+12%" 
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          icon={Weight} 
          label="Total Weight" 
          value={`${stats.totalWeight.toLocaleString()} KG`} 
          trend="+5%" 
          color="bg-blue-50 text-blue-600"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Revenue" 
          value={`$${stats.totalRevenue.toLocaleString()}`} 
          trend="+8%" 
          color="bg-amber-50 text-amber-600"
        />
        <StatCard 
          icon={Package} 
          label="Active" 
          value={shipments.length.toString()} 
          trend="Live" 
          color="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-6">Financial Trends</h3>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="profit" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Profit" />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-6">Weight Split</h3>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-slate-600 font-medium">{d.name}</span>
                </div>
                <span className="font-bold text-slate-800">{d.value.toLocaleString()} KG</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3 md:mb-4">
      <div className={`p-2.5 md:p-3 rounded-xl md:rounded-2xl ${color}`}>
        <Icon size={18} className="md:w-6 md:h-6" />
      </div>
      <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{trend}</span>
    </div>
    <h4 className="text-slate-500 text-[10px] md:text-sm font-bold mb-1 uppercase tracking-tight">{label}</h4>
    <p className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">{value}</p>
  </div>
);

export default Dashboard;
