
import React, { useState, useRef } from 'react';
import { AppData, Tranche, BillingCycle, AppSheetConfig, AuthConfig } from '../types';
import {
  Settings as SettingsIcon,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Landmark,
  Building2,
  Palette,
  UserCircle,
  Upload,
  Droplets,
  Check,
  CalendarDays,
  Clock4,
  BellRing,
  MessageSquare,
  Info,
  CloudCog,
  Link,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { testAppSheetConnection, syncToAppSheet } from '../services/appSheetService';

interface SettingsProps {
  data: AppData;
  setData: (data: AppData) => void;
}

const Settings: React.FC<SettingsProps> = ({ data, setData }) => {
  const [tranches, setTranches] = useState<Tranche[]>(data.tranches);
  const [fixedCharges, setFixedCharges] = useState(data.fixedCharges);
  const [organizationName, setOrganizationName] = useState(data.organizationName || '');
  const [adminName, setAdminName] = useState(data.adminName || '');
  const [themeColor, setThemeColor] = useState(data.themeColor || 'blue');
  const [logoUrl, setLogoUrl] = useState(data.logoUrl || '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(data.billingCycle || 'monthly');
  const [autoNotify, setAutoNotify] = useState(data.autoNotify !== undefined ? data.autoNotify : true);
  const [billingTemplate, setBillingTemplate] = useState(data.billingTemplate || '');
  const [paymentTemplate, setPaymentTemplate] = useState(data.paymentTemplate || '');

  // AppSheet Config States
  const [asConfig, setAsConfig] = useState<AppSheetConfig>(data.appSheetConfig || {
    appId: '',
    accessKey: '',
    enabled: false,
    autoSync: false
  });

  // Auth States
  const [authConfig, setAuthConfig] = useState<AuthConfig>(data.authConfig);
  const [showPassword, setShowPassword] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    { id: 'blue', hex: '#3b82f6', label: 'الأزرق' },
    { id: 'emerald', hex: '#10b981', label: 'الأخضر' },
    { id: 'purple', hex: '#8b5cf6', label: 'البنفسجي' },
    { id: 'orange', hex: '#f97316', label: 'البرتقالي' },
    { id: 'slate', hex: '#1e293b', label: 'الرمادي' },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    const result = await testAppSheetConnection(asConfig);
    setIsTesting(false);
    alert(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
  };

  const handleFullSync = async () => {
    if (!window.confirm("هل تريد مزامنة جميع البيانات إلى AppSheet؟")) return;
    setIsSyncing(true);
    try {
      const subsResult = await syncToAppSheet('Subscribers', 'Add', data.subscribers, asConfig);
      const invoicesResult = await syncToAppSheet('Invoices', 'Add', data.invoices, asConfig);

      if (subsResult.success && invoicesResult.success) {
        const newConfig = { ...asConfig, lastSync: new Date().toLocaleString('ar-MA') };
        setAsConfig(newConfig);
        alert(`✅ تمت المزامنة بنجاح!\n${subsResult.message}\n${invoicesResult.message}`);
      } else {
        const errors = [];
        if (!subsResult.success) errors.push(`المشتركون: ${subsResult.message}`);
        if (!invoicesResult.success) errors.push(`الفواتير: ${invoicesResult.message}`);
        alert(`⚠️ حدثت بعض المشاكل:\n${errors.join('\n')}`);
      }
    } catch (error) {
      alert(`❌ فشلت المزامنة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromAppSheet = async () => {
    if (!window.confirm("هل تريد سحب البيانات من AppSheet؟\nتنبيه: قد يستبدل هذا البيانات المحلية.")) return;
    setIsSyncing(true);
    try {
      const { pullFromAppSheet } = await import('../services/appSheetService');

      const subsResult = await pullFromAppSheet('Subscribers', asConfig);
      const invoicesResult = await pullFromAppSheet('Invoices', asConfig);

      if (subsResult.success && invoicesResult.success) {
        const pulledSubscribers = subsResult.data || [];
        const pulledInvoices = invoicesResult.data || [];

        setData({
          ...data,
          subscribers: pulledSubscribers,
          invoices: pulledInvoices
        });

        const newConfig = { ...asConfig, lastSync: new Date().toLocaleString('ar-MA') };
        setAsConfig(newConfig);
        alert(`✅ تم سحب البيانات بنجاح!\nالمشتركون: ${pulledSubscribers.length}\nالفواتير: ${pulledInvoices.length}`);
      } else {
        const errors = [];
        if (!subsResult.success) errors.push(`المشتركون: ${subsResult.message}`);
        if (!invoicesResult.success) errors.push(`الفواتير: ${invoicesResult.message}`);
        alert(`⚠️ حدثت بعض المشاكل:\n${errors.join('\n')}`);
      }
    } catch (error) {
      alert(`❌ فشل سحب البيانات: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = () => {
    setData({
      ...data,
      tranches,
      fixedCharges,
      organizationName,
      adminName,
      themeColor,
      logoUrl,
      billingCycle,
      autoNotify,
      billingTemplate,
      paymentTemplate,
      appSheetConfig: asConfig,
      authConfig: authConfig
    });
    alert('✅ تم حفظ كافة الإعدادات بنجاح.');
  };

  const addTranche = () => {
    const last = tranches[tranches.length - 1];
    const newTranche: Tranche = {
      id: Date.now().toString(),
      min: last ? (last.max || 0) : 0,
      max: null,
      pricePerM3: 0
    };
    setTranches([...tranches, newTranche]);
  };

  const removeTranche = (id: string) => {
    setTranches(tranches.filter(t => t.id !== id));
  };

  const updateTranche = (id: string, field: keyof Tranche, value: any) => {
    setTranches(tranches.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const inputClasses = "w-full px-4 py-2 bg-white border border-slate-200 text-slate-900 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm placeholder:text-slate-300";
  const textareaClasses = "w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm min-h-[100px]";

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">إعدادات النظام الرقمي</h2>
          <p className="text-slate-500 text-sm font-medium">تخصيص الهوية البصرية، الأشطر، والربط مع AppSheet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">

          {/* Account Security Section */}
          <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-3xl border border-red-100 shadow-sm space-y-6">
            <h3 className="font-black text-red-900 flex items-center gap-3 text-lg border-b border-red-100 pb-4">
              <ShieldAlert className="text-red-600" size={24} />
              أمان الحساب (بيانات الدخول)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-wider mr-1">البريد الإلكتروني (اسم المستخدم)</label>
                <div className="relative">
                  <UserCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    className={`${inputClasses} pr-12`}
                    value={authConfig.username}
                    onChange={(e) => setAuthConfig({ ...authConfig, username: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-wider mr-1">كلمة المرور الجديدة</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`${inputClasses} pr-12 pl-12`}
                    value={authConfig.password}
                    onChange={(e) => setAuthConfig({ ...authConfig, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-red-100/30 p-4 rounded-2xl flex gap-3 items-center">
              <Info className="text-red-500 shrink-0" size={16} />
              <p className="text-[10px] font-bold text-red-800 leading-relaxed">
                تغيير هذه البيانات سيؤثر فوراً على الدخول المستقبلي. تأكد من حفظها في مكان آمن.
              </p>
            </div>
          </div>

          {/* AppSheet Integration Panel */}
          <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-3xl border border-indigo-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-indigo-100 pb-4">
              <h3 className="font-black text-indigo-900 flex items-center gap-3 text-lg">
                <CloudCog className="text-indigo-600" size={24} />
                الربط مع AppSheet
              </h3>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${asConfig.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {asConfig.enabled ? 'متصل بالسحابة' : 'غير متصل'}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-black text-indigo-700 mb-2 uppercase tracking-wider mr-1">App ID</label>
                <input
                  type="text"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className={`${inputClasses} border-indigo-100`}
                  value={asConfig.appId}
                  onChange={(e) => setAsConfig({ ...asConfig, appId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-indigo-700 mb-2 uppercase tracking-wider mr-1">Application Access Key</label>
                <input
                  type="password"
                  placeholder="مفتاح الوصول من إعدادات AppSheet"
                  className={`${inputClasses} border-indigo-100 font-mono`}
                  value={asConfig.accessKey}
                  onChange={(e) => setAsConfig({ ...asConfig, accessKey: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => setAsConfig({ ...asConfig, enabled: !asConfig.enabled })}
                className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 ${asConfig.enabled ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-indigo-200 text-indigo-600'}`}
              >
                {asConfig.enabled ? <Check size={18} /> : <Link size={18} />}
                {asConfig.enabled ? 'تعطيل المزامنة' : 'تفعيل المزامنة'}
              </button>

              <button
                disabled={isTesting || !asConfig.appId}
                onClick={handleTestConnection}
                className="px-6 py-2.5 bg-white border border-indigo-200 text-indigo-600 rounded-xl font-black text-sm hover:bg-indigo-50 transition-all disabled:opacity-50"
              >
                {isTesting ? <Loader2 size={18} className="animate-spin" /> : 'اختبار الاتصال'}
              </button>

              <button
                disabled={isSyncing || !asConfig.enabled}
                onClick={handleFullSync}
                className="px-6 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-black text-sm hover:bg-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                دفع إلى AppSheet
              </button>

              <button
                disabled={isSyncing || !asConfig.enabled}
                onClick={handlePullFromAppSheet}
                className="px-6 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-black text-sm hover:bg-emerald-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                سحب من AppSheet
              </button>
            </div>

            {/* Auto-Sync Toggle */}
            {asConfig.enabled && (
              <div className="mt-6 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${asConfig.autoSync ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                      <RefreshCw size={24} />
                    </div>
                    <div>
                      <p className="font-black text-slate-800">مزامنة تلقائية</p>
                      <p className="text-xs font-bold text-slate-500">مزامنة البيانات تلقائياً عند كل تغيير (قد يؤثر على الأداء)</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAsConfig({ ...asConfig, autoSync: !asConfig.autoSync })}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${asConfig.autoSync ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${asConfig.autoSync ? '-translate-x-1' : '-translate-x-6'}`} />
                  </button>
                </div>
                {!asConfig.autoSync && (
                  <div className="mt-4 flex items-start gap-2">
                    <Info className="text-indigo-500 shrink-0 mt-0.5" size={14} />
                    <p className="text-[10px] font-bold text-indigo-700 leading-relaxed">
                      المزامنة التلقائية معطلة. استخدم الأزرار أعلاه للمزامنة يدوياً عند الحاجة.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Billing & Notification Selection */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg border-b border-slate-100 pb-4">
              <Clock4 className="text-blue-600" size={24} />
              نظام الفوترة والتنبيهات
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`p-6 rounded-2xl border-2 transition-all text-right flex flex-col gap-2 ${billingCycle === 'monthly' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex justify-between items-center">
                  <CalendarDays className={billingCycle === 'monthly' ? 'text-blue-600' : 'text-slate-400'} />
                  {billingCycle === 'monthly' && <Check size={20} className="text-blue-600" />}
                </div>
                <span className="font-black text-slate-800">فوترة شهرية</span>
                <span className="text-xs font-bold text-slate-500">إصدار 12 فاتورة في السنة</span>
              </button>

              <button
                onClick={() => setBillingCycle('periodic')}
                className={`p-6 rounded-2xl border-2 transition-all text-right flex flex-col gap-2 ${billingCycle === 'periodic' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex justify-between items-center">
                  <Clock4 className={billingCycle === 'periodic' ? 'text-blue-600' : 'text-slate-400'} />
                  {billingCycle === 'periodic' && <Check size={20} className="text-blue-600" />}
                </div>
                <span className="font-black text-slate-800">فوترة دورية</span>
                <span className="text-xs font-bold text-slate-500">إصدار فواتير حسب الدورات (3 أشهر)</span>
              </button>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-200">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${autoNotify ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                  <BellRing size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-800">تنبيهات تلقائية ذكية</p>
                  <p className="text-xs font-bold text-slate-500">فتح تطبيق WhatsApp فور إصدار الفاتورة أو تأكيد الأداء</p>
                </div>
              </div>
              <button
                onClick={() => setAutoNotify(!autoNotify)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${autoNotify ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoNotify ? '-translate-x-1' : '-translate-x-6'}`} />
              </button>
            </div>
          </div>

          {/* Interface Customization */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg border-b border-slate-100 pb-4">
              <Palette className="text-blue-600" size={24} />
              تخصيص المظهر والهوية
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-black text-slate-700">أيقونة النظام</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Droplets size={24} />
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2"
                  >
                    <Upload size={14} />
                    تغيير الأيقونة
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-black text-slate-700">مظهر النظام (اللون)</label>
                <div className="flex gap-2 flex-wrap">
                  {colors.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setThemeColor(color.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-4 ${themeColor === color.id ? 'border-white ring-2 ring-slate-800 scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {themeColor === color.id && <Check className="text-white" size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-1">
                  <Building2 size={16} /> اسم المؤسسة
                </label>
                <input
                  type="text"
                  className={inputClasses}
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="مثال: جمعية الأمل للماء"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-black text-slate-700 mb-1">
                  <UserCircle size={16} /> اسم المسؤول
                </label>
                <input
                  type="text"
                  className={inputClasses}
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="مثال: أحمد العمراني"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg">
                <Landmark className="text-blue-600" size={24} />
                تعريف الأشطر والرسوم
              </h3>
              <button
                onClick={addTranche}
                className="text-sm font-black text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2"
              >
                <Plus size={18} />
                إضافة شطر
              </button>
            </div>

            <div className="space-y-4">
              {tranches.map((tranche, index) => (
                <div key={tranche.id} className="grid grid-cols-12 gap-4 items-center p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="col-span-1 font-black text-slate-400 text-lg">#{index + 1}</div>
                  <div className="col-span-3">
                    <input type="number" className={inputClasses} value={tranche.min} onChange={(e) => updateTranche(tranche.id, 'min', Number(e.target.value))} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" placeholder="غير محدد" className={inputClasses} value={tranche.max ?? ''} onChange={(e) => updateTranche(tranche.id, 'max', e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                  <div className="col-span-3">
                    <input type="number" step="0.01" className={`${inputClasses} text-blue-600`} value={tranche.pricePerM3} onChange={(e) => updateTranche(tranche.id, 'pricePerM3', Number(e.target.value))} />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button onClick={() => removeTranche(tranche.id)} className="text-slate-300 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-black text-slate-400 uppercase mb-2">الواجب الثابت للفاتورة (درهم)</label>
                <input type="number" step="0.1" className={`${inputClasses} text-xl py-4 h-14`} value={fixedCharges} onChange={(e) => setFixedCharges(Number(e.target.value))} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <h4 className="font-black text-xl mb-6 flex items-center gap-3 relative z-10">
              <ShieldCheck className="text-blue-400" size={28} />
              مركز الحفظ
            </h4>
            <p className="text-slate-400 text-sm font-bold mb-8 leading-relaxed relative z-10">
              يرجى المراجعة بعناية قبل الضغط على حفظ. هذه الإعدادات تؤثر على واجهة النظام وقيم الفواتير الجديدة.
            </p>
            <button
              onClick={handleSave}
              className="w-full bg-blue-600 hover:bg-white hover:text-blue-600 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 relative z-10"
            >
              <Save size={24} />
              حفظ الكل الآن
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
