
import React, { useMemo } from 'react';
import { AppData } from '../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { TrendingUp, Wallet, Droplet, Clock } from 'lucide-react';

interface ReportsProps {
  data: AppData;
}

const Reports: React.FC<ReportsProps> = ({ data }) => {
  // حساب الإحصائيات المالية الكلية
  const financialStats = useMemo(() => {
    const totalInvoiced = data.invoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalCollected = data.invoices
      .filter(i => i.status === 'مؤداة')
      .reduce((acc, curr) => acc + curr.totalAmount, 0);
    const totalPending = totalInvoiced - totalCollected;
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;

    return { totalInvoiced, totalCollected, totalPending, collectionRate };
  }, [data.invoices]);

  // تجميع البيانات حسب الفترات بشكل دقيق
  const periodicData = useMemo(() => {
    const periods: Record<string, { period: string, collected: number, consumption: number, total: number }> = {};
    
    data.invoices.forEach(inv => {
      const p = inv.period;
      if (!periods[p]) periods[p] = { period: p, collected: 0, consumption: 0, total: 0 };
      
      periods[p].total += inv.totalAmount;
      periods[p].consumption += inv.consumption;
      if (inv.status === 'مؤداة') {
        periods[p].collected += inv.totalAmount;
      }
    });

    // فرز الفترات زمنياً لضمان صحة الرسم البياني
    return Object.values(periods).sort((a, b) => a.period.localeCompare(b.period));
  }, [data.invoices]);

  const COLORS = ['#10b981', '#ef4444'];
  const pieData = [
    { name: 'المداخيل المحصلة', value: financialStats.totalCollected },
    { name: 'الديون العالقة', value: financialStats.totalPending },
  ];

  const chartLabel = data.billingCycle === 'monthly' ? 'تطور المداخيل الشهرية' : 'تطور المداخيل حسب الدورات';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">مركز التقارير والتحليلات الرقمية</h2>
          <p className="text-slate-500 text-sm font-medium">نظرة شاملة على الأداء المالي والتشغيلي ({data.billingCycle === 'monthly' ? 'نظام شهري' : 'نظام دوري'})</p>
        </div>
        <div className="bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">نسبة التحصيل الإجمالية</p>
          <div className="flex items-center gap-4">
             <span className="text-3xl font-black text-emerald-600">{financialStats.collectionRate.toFixed(1)}%</span>
             <div className="w-32 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${financialStats.collectionRate}%` }}
                ></div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
             <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner"><Wallet size={24} /></div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المبالغ المحصلة</p>
               <p className="text-2xl font-black text-slate-800">{financialStats.totalCollected.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-400">د</span></p>
             </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
             <div className="p-4 bg-red-50 text-red-600 rounded-2xl shadow-inner"><Clock size={24} /></div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الديون العالقة</p>
               <p className="text-2xl font-black text-red-600">{financialStats.totalPending.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-400">د</span></p>
             </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
             <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-inner"><Droplet size={24} /></div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الاستهلاك المسجل</p>
               <p className="text-2xl font-black text-slate-800">{data.invoices.reduce((acc, curr) => acc + curr.consumption, 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">م³</span></p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <h4 className="font-black text-slate-800 mb-8 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-600" />
            {chartLabel}
          </h4>
          <div className="h-72">
            {periodicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={periodicData}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Cairo'}} />
                  <Area 
                    type="monotone" 
                    dataKey="collected" 
                    name="المحصل"
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorCollected)" 
                    strokeWidth={4} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    name="المفوتر"
                    stroke="#cbd5e1" 
                    fill="transparent" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <TrendingUp size={48} className="opacity-10 mb-2" />
                <p className="text-xs font-bold">لا توجد سجلات تاريخية بعد</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h4 className="font-black text-slate-800 mb-8 w-full text-right border-b border-slate-50 pb-4">تحليل التدفقات النقدية</h4>
          <div className="h-64 w-full">
            {financialStats.totalInvoiced > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    animationBegin={200}
                    animationDuration={1500}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Cairo'}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-200">
                <div className="w-32 h-32 rounded-full border-8 border-slate-50 flex items-center justify-center font-black">0%</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 w-full mt-6">
             <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex flex-col items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mb-1"></div>
                <span className="text-[10px] font-black text-emerald-700 uppercase">محصل فعلي</span>
                <span className="text-xs font-bold text-slate-600">%{financialStats.collectionRate.toFixed(1)}</span>
             </div>
             <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex flex-col items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 mb-1"></div>
                <span className="text-[10px] font-black text-red-700 uppercase">ديون عالقة</span>
                <span className="text-xs font-bold text-slate-600">%{(100 - financialStats.collectionRate).toFixed(1)}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
