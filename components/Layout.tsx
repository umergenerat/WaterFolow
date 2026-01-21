
import React, { useState, useEffect } from 'react';
import {
  Droplets,
  Users,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  LayoutDashboard,
  Menu,
  X,
  WifiOff,
  Wifi,
  Code2,
  LogOut
} from 'lucide-react';
import { AppData } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  data: AppData;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, data, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const themeColors: Record<string, string> = {
    blue: 'bg-blue-600 text-blue-700 shadow-blue-100',
    emerald: 'bg-emerald-600 text-emerald-700 shadow-emerald-100',
    purple: 'bg-purple-600 text-purple-700 shadow-purple-100',
    orange: 'bg-orange-500 text-orange-600 shadow-orange-100',
    slate: 'bg-slate-800 text-slate-800 shadow-slate-100'
  };

  const menuItems = [
    { id: 'dashboard', label: 'لوحة القيادة', icon: LayoutDashboard },
    { id: 'subscribers', label: 'المشتركون', icon: Users },
    { id: 'billing', label: 'الفوترة', icon: FileText },
    { id: 'payments', label: 'الاستخلاص', icon: Wallet },
    { id: 'reports', label: 'التقارير', icon: BarChart3 },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const currentColorClass = themeColors[data.themeColor || 'blue'].split(' ')[0];
  const currentTextClass = themeColors[data.themeColor || 'blue'].split(' ')[1];
  const currentBgLightClass = data.themeColor === 'slate' ? 'bg-slate-100' : `bg-${data.themeColor}-50`;

  return (
    <div className="flex min-h-screen bg-slate-50 font-arabic overflow-x-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden no-print" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`w-64 bg-white border-l border-slate-200 fixed top-0 right-0 h-full shadow-sm z-50 flex flex-col transition-transform duration-300 ease-in-out no-print ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`${currentColorClass} p-2 rounded-xl text-white shadow-lg`}>
              {data.logoUrl ? (
                <img src={data.logoUrl} alt="Logo" className="w-6 h-6 object-contain" />
              ) : (
                <Droplets size={24} />
              )}
            </div>
            <h1 className="font-bold text-lg text-slate-800 leading-tight">نظام الماء</h1>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === item.id
                  ? `${currentBgLightClass} ${currentTextClass} font-semibold shadow-sm`
                  : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 mt-8"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </nav>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex-shrink-0 space-y-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[10px] text-slate-400 mb-0.5 font-bold">اسم المسؤول</p>
            <p className="text-xs font-black text-slate-700 uppercase tracking-tighter truncate">{data.adminName || 'مدير النظام'}</p>
          </div>
          <div className="flex items-center justify-center gap-2 py-1 px-2 bg-slate-100/50 rounded-lg">
            <Code2 size={12} className="text-slate-400" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              By <span className="text-slate-600">Aomar AitLoutou</span>
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen transition-all duration-300 lg:mr-64 w-full">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3">
            <button className="p-2 -mr-2 lg:hidden text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium hidden sm:inline text-slate-500">نظام التدبير الرقمي</span>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isOnline ? 'متصل' : 'وضع الأوفلاين'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div className="text-left">
              <p className="text-xs lg:text-sm font-black text-slate-800 truncate max-w-[120px] sm:max-w-none">
                {data.organizationName || 'إدارة المياه'}
              </p>
              <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-widest text-left">مستخدم مسؤول</p>
            </div>
            <div className={`w-8 h-8 lg:w-10 lg:h-10 ${currentColorClass} text-white rounded-xl lg:rounded-2xl flex items-center justify-center font-black shadow-lg shadow-slate-200 rotate-3`}>
              {getInitials(data.adminName || 'AD')}
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 flex-1 w-full max-w-[100vw]">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
