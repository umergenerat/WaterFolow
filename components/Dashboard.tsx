
import React, { useMemo, useState } from 'react';
import { AppData, Invoice } from '../types';
import { 
  Users, 
  Droplet, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp,
  BarChart3,
  Heart,
  BellRing,
  Share2,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { generateArrearsReminder } from '../services/geminiService';

interface DashboardProps {
  data: AppData;
}

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [loadingReminderId, setLoadingReminderId] = useState<string | null>(null);

  // 1. حساب الإحصائيات الأساسية
  const totalSubscribers = data.subscribers.length;
  const unpaidInvoices = data.invoices.filter(i => i.status === 'غير مؤداة');
  const totalUnpaidAmount = unpaidInvoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalRevenue = data.invoices
    .filter(i => i.status === 'مؤداة')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalConsumption = data.invoices.reduce((acc, curr) => acc + curr.consumption, 0);

  // 2. كشف الفواتير التي قاربت على تاريخ الاستحقاق (أو تجاوزته) للتنبيه الذكي
  const dueAlerts = useMemo(() => {
    const today = new Date();
    return data.invoices
      .filter(inv => inv.status === 'غير مؤداة')
      .map(inv => {
        const dueDate = new Date(inv.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...inv, diffDays };
      })
      .filter(inv => inv.diffDays <= 3) // تنبيه قبل 3 أيام أو متأخرة
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 5); // عرض أهم 5 تنبيهات
  }, [data.invoices]);

  const handleQuickReminder = async (invoice: Invoice) => {
    const sub = data.subscribers.find(s => s.id === invoice.subscriberId);
    if (!sub) return;
    
    setLoadingReminderId(invoice.id);
    const subInvoices = data.invoices.filter(i => i.subscriberId === sub.id && i.status === 'غير مؤداة');
    const totalDebt = subInvoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
    
    const message = await generateArrearsReminder(sub, totalDebt, subInvoices.length);
    const whatsappUrl = `https://wa.me/${sub.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setLoadingReminderId(null);
  };

  const growthRate = useMemo(() => {
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newThisMonth = data.subscribers.filter(s => s.createdAt.startsWith(thisMonthStr)).length;
    if (totalSubscribers === 0) return 0;
    return Math.round((newThisMonth / totalSubscribers) * 100);
  }, [data.subscribers]);

  const consumptionChartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    data.invoices.forEach(inv => {
      grouped[inv.period] = (grouped[inv.period] || 0) + inv.consumption;
    });
    return Object.entries(grouped)
      .map(([period, consumption]) => ({ period, consumption }))
      .sort((a, b) => a.period.localeCompare(b.period))
      .slice(-6);
  }, [data.invoices]);

  const stats = [
    { name: 'إجمالي المشتركين', value: totalSubscribers, color: '#3b82f6', icon: Users, suffix: '' },
    { name: 'فواتير معلقة', value: unpaidInvoices.length, color: '#ef4444', icon: AlertCircle, suffix: '' },
    { name: 'فواتير مؤداة', value: data.invoices.filter(i => i.status === 'مؤداة').length, color: '#22c55e', icon: CheckCircle2, suffix: '' },
  ];

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 flex flex-col min-h-full">
      
      {/* شبكة البطاقات العلوية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between hover:border-blue-200 transition-colors">
          <div>
            <p className="text-slate-500 text-xs lg:text-sm font-medium mb-1">إجمالي المشتركين</p>
            <h3 className="text-2xl lg:text-3xl font-bold text-slate-800">{totalSubscribers}</h3>
            <p className="text-[10px] lg:text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
              <TrendingUp size={12} />
              +{growthRate}% نمو قاعدي
            </p>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between hover:border-emerald-200 transition-colors">
          <div>
            <p className="text-slate-500 text-xs lg:text-sm font-medium mb-1">المداخيل المحصلة</p>
            <h3 className="text-2xl lg:text-3xl font-bold text-slate-800">{totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] lg:text-xs text-slate-400 mt-2 font-bold uppercase tracking-tight">درهم مغربي</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between hover:border-red-200 transition-colors">
          <div>
            <p className="text-slate-500 text-xs lg:text-sm font-medium mb-1">ديون عالقة</p>
            <h3 className="text-2xl lg:text-3xl font-bold text-red-600">{totalUnpaidAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] lg:text-xs text-slate-400 mt-2 font-bold uppercase">{unpaidInvoices.length} فواتير قيد الانتظار</p>
          </div>
          <div className="bg-red-50 text-red-600 p-3 rounded-xl">
            <AlertCircle size={20} />
          </div>
        </div>

        <div className="bg-white p-5 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between hover:border-blue-200 transition-colors">
          <div>
            <p className="text-slate-500 text-xs lg:text-sm font-medium mb-1">إجمالي الاستهلاك</p>
            <h3 className="text-2xl lg:text-3xl font-bold text-slate-800">{totalConsumption.toLocaleString()}</h3>
            <p className="text-[10px] lg:text-xs text-blue-600 mt-2 font-black uppercase">متر مكعب (M³)</p>
          </div>
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <Droplet size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* الرسم البياني الحقيقي */}
        <div className="lg:col-span-2 bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="text-blue-600" size={20} />
              تطور الاستهلاك الفعلي
            </h4>
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md uppercase">آخر 6 فترات</span>
          </div>
          
          <div className="h-64">
            {consumptionChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consumptionChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Cairo'}}
                  />
                  <Bar dataKey="consumption" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <BarChart3 size={48} className="opacity-10 mb-2" />
                <p className="text-xs font-bold">لا توجد بيانات فوترة كافية للعرض</p>
              </div>
            )}
          </div>
        </div>

        {/* تنبيهات الاستحقاق التلقائية */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-black text-slate-800 flex items-center gap-2 text-sm">
              <BellRing className="text-amber-500" size={18} />
              تنبيهات الاستحقاق الذكية
            </h4>
            {data.autoNotify && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">فعالة</span>}
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[320px] custom-scrollbar">
            {dueAlerts.length > 0 ? (
              dueAlerts.map(alert => {
                const sub = data.subscribers.find(s => s.id === alert.subscriberId);
                return (
                  <div key={alert.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-100 transition-all group">
                    <div>
                      <p className="text-xs font-black text-slate-800">{sub?.fullName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar size={10} className="text-slate-400" />
                        <span className={`text-[10px] font-bold ${alert.diffDays < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                          {alert.diffDays < 0 ? `متأخرة بـ ${Math.abs(alert.diffDays)} أيام` : `تستحق خلال ${alert.diffDays} أيام`}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleQuickReminder(alert)}
                      disabled={loadingReminderId === alert.id}
                      className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 disabled:opacity-50"
                    >
                      {loadingReminderId === alert.id ? <TrendingUp size={14} className="animate-spin" /> : <Share2 size={14} />}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <BellRing size={40} className="mb-2" />
                <p className="text-[10px] font-black uppercase">لا توجد تنبيهات عاجلة</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100">
             <p className="text-[10px] font-bold text-slate-400 text-center leading-relaxed">
               يتم عرض الفواتير التي تقترب من تاريخ الاستحقاق لتسهيل عملية التواصل السريع.
             </p>
          </div>
        </div>
      </div>

      {/* Developer Footer */}
      <footer className="mt-auto pt-8 pb-4 flex flex-col items-center gap-2 border-t border-slate-100 opacity-60">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          <span>Developed with</span>
          <Heart size={10} className="text-red-500 fill-red-500" />
          <span>By</span>
        </div>
        <div className="text-sm font-black text-slate-800 tracking-tighter uppercase">
           Aomar AitLoutou
        </div>
        <p className="text-[9px] font-bold text-slate-300">© {new Date().getFullYear()} WaterFlow Management System v2.1</p>
      </footer>
    </div>
  );
};

export default Dashboard;
