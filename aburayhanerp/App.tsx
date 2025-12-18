
import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
// Fixed missing ImageIcon by importing Image as ImageIcon from lucide-react
import { 
  LayoutDashboard, 
  Ship, 
  PackageCheck, 
  FileText, 
  Settings, 
  ChevronRight,
  Menu,
  X,
  Boxes,
  Loader2,
  CloudCheck,
  CloudOff,
  Database,
  Image as ImageIcon
} from 'lucide-react';
import { MasterShipment, FinancialSummary } from './types';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import ArrivalBatches from './pages/ArrivalBatches';
import Reporting from './pages/Reporting';
import Inventory from './pages/Inventory';
import { apiService } from './services/apiService';

interface BusinessSettings {
  name: string;
  logoUrl: string | null;
  partner1: string;
  partner2: string;
  currency: string;
}

const STORAGE_KEY_SETTINGS = 'aburayhan_erp_settings';

const App: React.FC = () => {
  const [shipments, setShipments] = useState<MasterShipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return saved ? JSON.parse(saved) : {
      name: 'AbuRayhan Export',
      logoUrl: null,
      partner1: 'AbuRayhan (Ethiopia)',
      partner2: 'Tamaam (USA)',
      currency: 'USD ($)'
    };
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize Data & Connection Check
  useEffect(() => {
    const init = async () => {
      try {
        const data = await apiService.getShipments();
        setShipments(data);
        const isOnline = await apiService.checkConnection();
        setDbConnected(isOnline);
      } catch (error) {
        console.error("Initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Block tab close if syncing is in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSyncing) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSyncing]);

  // Reactive Sync Logic
  useEffect(() => {
    if (isLoading) return;

    const sync = async () => {
      setIsSyncing(true);
      const success = await apiService.saveShipments(shipments);
      if (success) setDbConnected(true);
      // Give UI some "breathing room" for the success animation
      setTimeout(() => setIsSyncing(false), 1000);
    };

    const timer = setTimeout(sync, 800);
    return () => clearTimeout(timer);
  }, [shipments, isLoading]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(businessSettings));
  }, [businessSettings]);

  const stats: FinancialSummary = useMemo(() => {
    return shipments.reduce((acc, ms) => {
      ms.batches.forEach(b => {
        acc.totalRevenue += b.totalClientRevenue;
        acc.totalClientCosts += b.totalClientCosts;
        acc.netProfit += b.netProfit;
        acc.totalWeight += b.totalPartnerKg + b.totalClientKg;
      });
      return acc;
    }, { totalRevenue: 0, totalPartnerCosts: 0, totalClientCosts: 0, netProfit: 0, totalWeight: 0 });
  }, [shipments]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Accessing Secure Records...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 flex-col md:flex-row">
        {/* Persistent Sync Overlay */}
        <div className={`fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50 transition-all duration-500 ${isSyncing ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-90 pointer-events-none'}`}>
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex items-center gap-3 shadow-2xl border border-white/10">
            <Loader2 className="animate-spin text-teal-400" size={16} />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Syncing to Cloud...</span>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 p-6 flex-col fixed h-full z-30">
          <div className="flex items-center gap-3 mb-10 px-2">
            {businessSettings.logoUrl ? (
              <img src={businessSettings.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover shadow-md" />
            ) : (
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {businessSettings.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-800 leading-none truncate w-32">{businessSettings.name}</h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${dbConnected ? 'bg-teal-500' : 'bg-rose-500'}`} />
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                  {dbConnected ? 'Live Connection' : 'Local Only'}
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-2 flex-1">
            <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <SidebarItem to="/shipments" icon={Ship} label="Logistics" />
            <SidebarItem to="/arrivals" icon={PackageCheck} label="Arrivals" />
            <SidebarItem to="/inventory" icon={Boxes} label="Inventory" />
            <SidebarItem to="/reports" icon={FileText} label="Reports" />
            <SidebarItem to="/settings" icon={Settings} label="Settings" />
          </nav>

          <div className="mt-auto p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
             <div className="flex items-center justify-between mb-3">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Database status</span>
               {dbConnected ? <CloudCheck className="text-teal-500" size={14} /> : <CloudOff className="text-rose-400" size={14} />}
             </div>
             <p className="text-xs font-bold text-slate-600 mb-1">{dbConnected ? 'Neon Production' : 'Browser Storage'}</p>
             <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${dbConnected ? 'w-full bg-teal-500' : 'w-1/3 bg-amber-400'}`} />
             </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {businessSettings.logoUrl ? (
              <img src={businessSettings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                {businessSettings.name.charAt(0)}
              </div>
            )}
            <h1 className="font-bold text-slate-800 text-sm truncate w-32">{businessSettings.name}</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 bg-slate-50 rounded-xl">
            <Menu size={20} />
          </button>
        </header>

        {/* Mobile Slide-over Menu */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-64 bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-10">
                <div className="p-2 bg-slate-50 rounded-xl"><Database size={18} className="text-teal-500" /></div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 bg-slate-50 rounded-xl"><X size={20} /></button>
              </div>
              <nav className="space-y-3">
                <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/shipments" icon={Ship} label="Logistics" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/arrivals" icon={PackageCheck} label="Arrivals" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/inventory" icon={Boxes} label="Inventory" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/reports" icon={FileText} label="Reports" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/settings" icon={Settings} label="Settings" onClick={() => setIsSidebarOpen(false)} />
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard stats={stats} shipments={shipments} businessSettings={businessSettings} />} />
            <Route path="/shipments" element={<Shipments shipments={shipments} setShipments={setShipments} businessSettings={businessSettings} />} />
            <Route path="/arrivals" element={<ArrivalBatches shipments={shipments} setShipments={setShipments} />} />
            <Route path="/inventory" element={<Inventory shipments={shipments} />} />
            <Route path="/reports" element={<Reporting shipments={shipments} setShipments={setShipments} businessSettings={businessSettings} />} />
            <Route path="/settings" element={<SettingsPage settings={businessSettings} setSettings={setBusinessSettings} />} />
          </Routes>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 flex px-2 py-1 z-40 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.05)]">
           <MobileNavItem to="/" icon={LayoutDashboard} label="Home" />
           <MobileNavItem to="/shipments" icon={Ship} label="Vessels" />
           <MobileNavItem to="/arrivals" icon={PackageCheck} label="Cargo" />
           <MobileNavItem to="/inventory" icon={Boxes} label="Stock" />
           <MobileNavItem to="/reports" icon={FileText} label="Logs" />
        </nav>
      </div>
    </Router>
  );
};

const SidebarItem = ({ to, icon: Icon, label, onClick }: { to: string, icon: any, label: string, onClick?: () => void }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
        active 
          ? 'bg-teal-500 text-white shadow-xl shadow-teal-100 font-black' 
          : 'text-slate-500 hover:bg-slate-50 font-bold'
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      <span className="text-sm tracking-tight">{label}</span>
      {active && <ChevronRight size={16} className="ml-auto" />}
    </Link>
  );
};

const MobileNavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 ${
        active ? 'text-teal-600 scale-105' : 'text-slate-400'
      }`}
    >
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[9px] font-black mt-1 uppercase tracking-widest">{label}</span>
    </Link>
  );
};

const SettingsPage = ({ settings, setSettings }: { settings: BusinessSettings, setSettings: React.Dispatch<React.SetStateAction<BusinessSettings>> }) => {
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 px-2 md:px-0">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight">Enterprise Config</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black mb-8 text-slate-800 flex items-center gap-2">
               <Database size={20} className="text-teal-500" /> Business Identity
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Company Name</label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none text-base font-black transition-all" 
                  value={settings.name} 
                  onChange={e => setSettings(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Managing Partner A</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none text-sm font-black transition-all" value={settings.partner1} onChange={e => setSettings(prev => ({ ...prev, partner1: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Managing Partner B</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none text-sm font-black transition-all" value={settings.partner2} onChange={e => setSettings(prev => ({ ...prev, partner2: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
            <h3 className="text-lg font-black mb-8 text-slate-800 self-start">Official Seal</h3>
            <div className="relative group">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-32 h-32 rounded-3xl object-cover shadow-2xl border-4 border-white" />
              ) : (
                <div className="w-32 h-32 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                  <ImageIcon size={40} />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-3xl cursor-pointer">
                 <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl text-white">Update</div>
                 <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
            <p className="text-[10px] text-slate-400 mt-6 text-center font-bold leading-relaxed uppercase tracking-widest">
              Visible on internal reconciliation reports
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
