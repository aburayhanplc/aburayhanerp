
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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
  Image as ImageIcon,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { MasterShipment, FinancialSummary } from './types';
import Dashboard from './pages/Dashboard';
import Shipments from './pages/Shipments';
import ArrivalBatches from './pages/ArrivalBatches';
import Reporting from './pages/Reporting';
import Inventory from './pages/Inventory';
import { apiService, SyncStatus } from './services/apiService';

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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('Offline');
  const [isSyncing, setIsSyncing] = useState(false);
  
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
  const firstLoad = useRef(true);

  // Authoritative Data Load
  const fetchData = async () => {
    setIsSyncing(true);
    const { data, status } = await apiService.getShipments();
    setShipments(data);
    setSyncStatus(status);
    setTimeout(() => setIsSyncing(false), 500);
  };

  useEffect(() => {
    fetchData().then(() => setIsLoading(false));
  }, []);

  // Background Sync (Debounced)
  useEffect(() => {
    if (isLoading || firstLoad.current) {
      firstLoad.current = false;
      return;
    }

    const sync = async () => {
      setIsSyncing(true);
      const status = await apiService.saveShipments(shipments);
      setSyncStatus(status);
      setTimeout(() => setIsSyncing(false), 800);
    };

    const timer = setTimeout(sync, 1500);
    return () => clearTimeout(timer);
  }, [shipments, isLoading]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(businessSettings));
  }, [businessSettings]);

  const stats: FinancialSummary = useMemo(() => {
    return shipments.reduce((acc, ms) => {
      ms.batches.forEach(b => {
        acc.totalRevenue += (b.totalClientRevenue || 0);
        acc.netProfit += (b.netProfit || 0);
        acc.totalWeight += (b.totalArrivedKg || 0);
      });
      return acc;
    }, { totalRevenue: 0, totalPartnerCosts: 0, totalClientCosts: 0, netProfit: 0, totalWeight: 0 });
  }, [shipments]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-teal-500 mx-auto mb-4" size={48} />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-50 flex-col md:flex-row">
        {/* Persistent Sync Status Bar (Top) */}
        <div className={`fixed top-0 left-0 right-0 h-1 z-[60] transition-colors duration-500 ${
          syncStatus === 'Live' ? 'bg-teal-500' : syncStatus === 'Offline' ? 'bg-amber-500' : 'bg-rose-500'
        }`} />

        {/* Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 p-6 flex-col fixed h-full z-30">
          <div className="flex items-center gap-3 mb-10 px-2">
            {businessSettings.logoUrl ? (
              <img src={businessSettings.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-teal-400 font-black text-xl">
                {businessSettings.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-black text-slate-800 leading-none truncate w-32 tracking-tighter">{businessSettings.name}</h1>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus === 'Live' ? 'bg-teal-500 animate-pulse' : syncStatus === 'Offline' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">
                  {syncStatus === 'Live' ? 'Live Cloud' : syncStatus === 'Offline' ? 'Local Mode' : 'Sync Error'}
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1">
            <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
            <SidebarItem to="/shipments" icon={Ship} label="Master Log" />
            <SidebarItem to="/arrivals" icon={PackageCheck} label="Arrivals" />
            <SidebarItem to="/inventory" icon={Boxes} label="Inventory" />
            <SidebarItem to="/reports" icon={FileText} label="Reporting" />
            <SidebarItem to="/settings" icon={Settings} label="Settings" />
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 space-y-3">
             <button 
                onClick={fetchData} 
                disabled={isSyncing}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all text-[9px] font-black uppercase tracking-widest border border-slate-200"
             >
               <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} /> Force Refresh
             </button>
             <div className={`p-4 rounded-2xl flex items-center justify-between transition-colors ${
               syncStatus === 'Live' ? 'bg-teal-50' : 'bg-amber-50'
             }`}>
                <div>
                   <p className="text-[8px] font-black uppercase text-slate-400 mb-0.5 tracking-tighter">Connection</p>
                   <p className={`text-[10px] font-black ${syncStatus === 'Live' ? 'text-teal-600' : 'text-amber-600'}`}>
                      {syncStatus === 'Live' ? 'Neon DB Online' : 'Offline Storage'}
                   </p>
                </div>
                {syncStatus === 'Live' ? <Wifi className="text-teal-500" size={14} /> : <WifiOff className="text-amber-500" size={14} />}
             </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-40">
           <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${syncStatus === 'Live' ? 'bg-teal-500' : 'bg-amber-500'}`} />
             <h1 className="font-black text-slate-800 tracking-tight">{businessSettings.name}</h1>
           </div>
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-50 rounded-lg text-slate-600"><Menu size={20} /></button>
        </header>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-white p-6 shadow-2xl flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navigation</span>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2"><X size={20} /></button>
              </div>
              <nav className="space-y-2 flex-1">
                <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/shipments" icon={Ship} label="Master Log" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/arrivals" icon={PackageCheck} label="Arrivals" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/inventory" icon={Boxes} label="Inventory" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/reports" icon={FileText} label="Reporting" onClick={() => setIsSidebarOpen(false)} />
                <SidebarItem to="/settings" icon={Settings} label="Settings" onClick={() => setIsSidebarOpen(false)} />
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 md:ml-64 p-4 md:p-10 pb-28 md:pb-12 max-w-7xl mx-auto w-full">
          {syncStatus === 'Error' && (
            <div className="mb-6 bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 animate-bounce">
              <AlertCircle className="text-rose-500 shrink-0" size={18} />
              <p className="text-rose-700 text-xs font-black uppercase tracking-tight">Sync Failure: Changes are currently saved only to your device.</p>
            </div>
          )}
          
          <Routes>
            <Route path="/" element={<Dashboard stats={stats} shipments={shipments} />} />
            <Route path="/shipments" element={<Shipments shipments={shipments} setShipments={setShipments} businessSettings={businessSettings} />} />
            <Route path="/arrivals" element={<ArrivalBatches shipments={shipments} setShipments={setShipments} />} />
            <Route path="/inventory" element={<Inventory shipments={shipments} />} />
            <Route path="/reports" element={<Reporting shipments={shipments} setShipments={setShipments} businessSettings={businessSettings} />} />
            <Route path="/settings" element={<SettingsPage settings={businessSettings} setSettings={setBusinessSettings} />} />
          </Routes>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t flex py-3 z-40 px-6 safe-area-bottom">
           <MobileNavItem to="/" icon={LayoutDashboard} label="Pulse" />
           <MobileNavItem to="/shipments" icon={Ship} label="Log" />
           <MobileNavItem to="/arrivals" icon={PackageCheck} label="Cargo" />
           <MobileNavItem to="/reports" icon={FileText} label="Recon" />
        </nav>
      </div>
    </Router>
  );
};

const SidebarItem = ({ to, icon: Icon, label, onClick }: { to: string, icon: any, label: string, onClick?: () => void }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} onClick={onClick} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${active ? 'bg-slate-900 text-white shadow-xl font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}>
      <Icon size={18} />
      <span className="text-sm tracking-tight">{label}</span>
      {active && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </Link>
  );
};

const MobileNavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link to={to} className={`flex flex-col items-center justify-center flex-1 transition-all ${active ? 'text-teal-600 scale-110 font-black' : 'text-slate-400'}`}>
      <Icon size={20} />
      <span className="text-[8px] mt-1.5 uppercase font-black tracking-tighter">{label}</span>
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
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tighter">Enterprise Config</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-lg font-black mb-10 text-slate-800 flex items-center gap-3">
               <Database size={20} className="text-teal-500" /> Identity Matrix
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Entity Name</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none text-base font-black transition-all" value={settings.name} onChange={e => setSettings(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Managing Partner (Ethiopia)</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none text-sm font-black transition-all" value={settings.partner1} onChange={e => setSettings(prev => ({ ...prev, partner1: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Managing Partner (USA)</label>
                <input type="text" className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent focus:border-teal-500 focus:bg-white rounded-2xl outline-none text-sm font-black transition-all" value={settings.partner2} onChange={e => setSettings(prev => ({ ...prev, partner2: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center">
            <h3 className="text-sm font-black mb-8 text-slate-400 uppercase self-start tracking-widest">Official Seal</h3>
            <div className="relative group">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-32 h-32 rounded-3xl object-cover shadow-2xl border-4 border-white" />
              ) : (
                <div className="w-32 h-32 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200"><ImageIcon size={40} /></div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-all rounded-3xl cursor-pointer backdrop-blur-sm">
                 <div className="px-4 py-2 bg-white rounded-xl text-slate-900 font-black text-[10px] uppercase">Update</div>
                 <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
              </label>
            </div>
            <p className="text-[9px] text-slate-400 mt-8 text-center font-black leading-relaxed uppercase tracking-widest">Seal is applied to all PDF Reconciliation Matrix documents</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
