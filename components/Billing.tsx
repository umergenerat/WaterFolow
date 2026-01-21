
import React, { useState, useMemo, useRef } from 'react';
import { AppData, Invoice } from '../types';
import { FilePlus, History, ChevronRight, Calculator, CheckCircle, Share2, Droplets, Printer, Camera, X, RefreshCw, Loader2, Code2, Bell, MessageSquare, MessageCircle, Phone, Check, RotateCcw } from 'lucide-react';
import { calculateTranches } from '../utils/storage';
import { generateNotificationMessage, extractMeterReading } from '../services/geminiService';

interface BillingProps {
  data: AppData;
  setData: (data: AppData) => void;
}

const Billing: React.FC<BillingProps> = ({ data, setData }) => {
  const [selectedSubId, setSelectedSubId] = useState('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [view, setView] = useState<'create' | 'list'>('create');
  const [loading, setLoading] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [notificationChannel, setNotificationChannel] = useState<'whatsapp' | 'sms' | 'none'>(data.autoNotify ? 'whatsapp' : 'none');
  
  // Camera States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedSub = data.subscribers.find(s => s.id === selectedSubId);
  
  const lastInvoice = useMemo(() => {
    return data.invoices
      .filter(i => i.subscriberId === selectedSubId)
      .sort((a, b) => b.readingDate.localeCompare(a.readingDate))[0];
  }, [selectedSubId, data.invoices]);

  const previousIndex = lastInvoice ? lastInvoice.currentIndex : 0;
  const consumption = currentIndex > previousIndex ? currentIndex - previousIndex : 0;
  const calcResults = calculateTranches(consumption, data.tranches, data.fixedCharges);

  // مفعول الفاتورة الحالية للمعاينة والطباعة
  const previewInvoice = useMemo(() => {
    if (!selectedSub) return null;
    return {
      id: 'preview',
      invoiceNumber: `INV-${new Date().getFullYear()}-DRAFT`,
      subscriberId: selectedSubId,
      period: data.billingCycle === 'monthly' ? new Date().toISOString().slice(0, 7) : `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth()/3)+1}`,
      previousIndex,
      currentIndex,
      consumption,
      trancheDetails: calcResults.details,
      fixedCharges: data.fixedCharges,
      totalAmount: calcResults.total,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'غير مؤداة' as const,
      readingDate: new Date().toISOString().split('T')[0]
    };
  }, [selectedSub, selectedSubId, currentIndex, previousIndex, calcResults, data.billingCycle, data.fixedCharges]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOpen(true);
      }
    } catch (err) {
      alert("تعذر الوصول إلى الكاميرا. يرجى التحقق من الصلاحيات.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const captureAndRead = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsProcessingImage(true);
    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      
      const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
      const reading = await extractMeterReading(base64Image);
      
      if (reading !== null) {
        setCurrentIndex(reading);
        stopCamera();
      } else {
        alert("لم نتمكن من قراءة الرقم بوضوح. يرجى المحاولة مرة أخرى أو إدخال القيمة يدوياً.");
      }
    }
    setIsProcessingImage(false);
  };

  const handleNotify = async (invoice: Invoice, channel: 'whatsapp' | 'sms', quiet = false) => {
    if (!quiet) setLoading(true);
    const sub = data.subscribers.find(s => s.id === invoice.subscriberId);
    if (!sub) return;

    try {
      const message = await generateNotificationMessage(invoice, sub, data.billingTemplate);
      const encodedMsg = encodeURIComponent(message);
      
      if (channel === 'whatsapp') {
        const whatsappUrl = `https://wa.me/${sub.phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`;
        window.open(whatsappUrl, '_blank');
      } else {
        const smsUrl = `sms:${sub.phone.replace(/[^0-9]/g, '')}?body=${encodedMsg}`;
        window.location.href = smsUrl;
      }
      
      setData(prev => ({
        ...prev,
        invoices: prev.invoices.map(i => i.id === invoice.id ? { ...i, notificationSent: true } : i)
      }));
    } catch (error) {
      console.error("Notification error:", error);
    }
    
    if (!quiet) setLoading(false);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^0-9]/g, '')}`;
  };

  const handleCancelSelection = () => {
    setSelectedSubId('');
    setCurrentIndex(0);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedSub || currentIndex <= previousIndex) {
      alert('يرجى التأكد من اختيار المشترك وإدخال مؤشر صحيح (أكبر من المؤشر السابق).');
      return;
    }

    if (!previewInvoice) return;

    const newInvoice: Invoice = {
      ...previewInvoice,
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${new Date().getFullYear()}-${data.invoices.length + 1001}`,
    };

    const updatedInvoices = [...data.invoices, newInvoice];
    setData({
      ...data,
      invoices: updatedInvoices
    });

    if (notificationChannel !== 'none') {
      handleNotify(newInvoice, notificationChannel, true);
    }

    alert(`✅ تم إصدار الفاتورة رقم ${newInvoice.invoiceNumber} بنجاح.`);
    handleCancelSelection();
    setView('list');
  };

  const toggleInvoiceSelection = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.focus();
    setTimeout(() => {
        window.print();
    }, 200);
  };

  const inputClasses = "w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold placeholder:text-slate-300 text-sm lg:text-base";

  const renderPrintableInvoice = (inv: Invoice, sub: any) => (
    <div key={inv.id} className="page-break bg-white text-slate-900 border-4 lg:border-8 border-double border-slate-200 rounded-[2rem] lg:rounded-[3rem] relative">
      <div className="flex justify-between items-start border-b-2 border-slate-50 pb-8 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 text-blue-600">
            <Droplets size={48} />
            <span className="text-3xl font-black tracking-tight">فاتورة استهلاك الماء</span>
          </div>
          <p className="text-sm font-bold text-slate-400">المملكة المغربية • {data.organizationName}</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">رقم الفاتورة</p>
          <p className="text-lg font-black text-slate-800 font-mono tracking-tighter">{inv.invoiceNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-8">
        <div>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">بيانات الزبون</h5>
          <p className="font-black text-slate-800 text-2xl mb-1">{sub?.fullName}</p>
          <p className="text-sm font-bold text-slate-500 leading-relaxed">{sub?.address}</p>
          <p className="text-sm font-black text-blue-600 mt-2">{sub?.phone}</p>
        </div>
        <div className="text-left">
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">تفاصيل العداد</h5>
          <p className="font-black text-slate-800 text-xl font-mono">{sub?.meterNumber}</p>
          <p className="text-sm font-bold text-slate-500 mt-1">تاريخ القراءة: {inv.readingDate}</p>
          <p className="text-sm font-bold text-slate-500 mt-1">المؤشر: {inv.previousIndex} ➜ {inv.currentIndex}</p>
          <p className="text-sm font-black text-blue-500 mt-1">دورة الاستهلاك: {inv.period}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 mb-8">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-4">تفاصيل الاستهلاك</th>
              <th className="px-6 py-4">الكمية</th>
              <th className="px-6 py-4">السعر</th>
              <th className="px-6 py-4 text-left">المجموع الجزئي</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold divide-y divide-slate-100">
            {inv.trancheDetails.map((row, i) => (
              <tr key={i}>
                <td className="px-6 py-4">{row.trancheLabel}</td>
                <td className="px-6 py-4 font-mono">{row.quantity} م³</td>
                <td className="px-6 py-4 font-mono">{row.pricePerUnit.toFixed(2)} د</td>
                <td className="px-6 py-4 text-left font-black">{row.total.toFixed(2)} د</td>
              </tr>
            ))}
            <tr className="bg-slate-50/80">
              <td className="px-6 py-4 italic" colSpan={3}>الرسوم والواجبات الثابتة</td>
              <td className="px-6 py-4 text-left font-black">{inv.fixedCharges.toFixed(2)} د</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-end pt-10 gap-8">
        <div className="text-center opacity-30">
          <div className="w-24 h-24 border-4 border-slate-900 rounded-full flex items-center justify-center font-black text-[10px] rotate-12">
            خاتم الإدارة
          </div>
        </div>
        <div className="w-80 bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl text-left">
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">الصافي الواجب أداؤه</p>
          <h3 className="text-5xl font-black font-mono leading-none">{inv.totalAmount.toFixed(2)} <span className="text-xl font-medium opacity-50">درهم</span></h3>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">إدارة الفواتير</h2>
          <p className="text-slate-500 text-xs lg:text-sm font-medium">إصدار وطباعة فواتير الاستهلاك ({data.billingCycle === 'monthly' ? 'نظام شهري' : 'نظام دوري'})</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl lg:rounded-2xl border border-slate-200 w-full sm:w-auto">
          <button 
            onClick={() => setView('create')}
            className={`flex-1 sm:flex-none px-4 lg:px-8 py-2 lg:py-2.5 rounded-lg lg:rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-xs lg:text-sm ${
              view === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FilePlus size={16} lg:size={18} />
            إصدار
          </button>
          <button 
            onClick={() => setView('list')}
            className={`flex-1 sm:flex-none px-4 lg:px-8 py-2 lg:py-2.5 rounded-lg lg:rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-xs lg:text-sm ${
              view === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History size={16} lg:size={18} />
            أرشيف
          </button>
        </div>
      </div>

      {view === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 no-print">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 lg:p-8 rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-black text-slate-800 border-b border-slate-100 pb-4 text-base lg:text-lg">بيانات القراءة</h3>
              <div>
                <label className="block text-xs lg:text-sm font-black text-slate-700 mb-3">اختر المشترك</label>
                <select 
                  className={`${inputClasses}`}
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                >
                  <option value="">-- اختر مشتركاً --</option>
                  {data.subscribers.filter(s => s.status === 'نشط').map(s => (
                    <option key={s.id} value={s.id}>{s.fullName} ({s.meterNumber})</option>
                  ))}
                </select>
              </div>
              <div className="bg-slate-50 p-4 lg:p-6 rounded-2xl space-y-4 border border-slate-100">
                <div className="flex justify-between items-center text-xs lg:text-sm font-bold">
                  <span className="text-slate-500">المؤشر السابق:</span>
                  <span className="text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">{previousIndex} م³</span>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] lg:text-xs font-black text-slate-500 uppercase">المؤشر الحالي:</label>
                    <button 
                      type="button"
                      disabled={!selectedSubId}
                      onClick={startCamera}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-black text-[9px] lg:text-[10px] uppercase bg-blue-50 px-2 py-1 rounded-lg transition-all"
                    >
                      <Camera size={12} />
                      قراءة ذكية
                    </button>
                  </div>
                  <input 
                    type="number"
                    disabled={!selectedSubId}
                    placeholder="0000"
                    className={`${inputClasses} font-mono text-lg lg:text-xl text-center`}
                    value={currentIndex || ''}
                    onChange={(e) => setCurrentIndex(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-400 uppercase">قناة التنبيه بعد الإصدار</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => setNotificationChannel('whatsapp')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${notificationChannel === 'whatsapp' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    <MessageSquare size={16} />
                    <span className="text-[9px] font-black">WhatsApp</span>
                  </button>
                  <button 
                    onClick={() => setNotificationChannel('sms')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${notificationChannel === 'sms' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    <MessageCircle size={16} />
                    <span className="text-[9px] font-black">SMS</span>
                  </button>
                  <button 
                    onClick={() => setNotificationChannel('none')}
                    className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${notificationChannel === 'none' ? 'bg-slate-200 border-slate-400 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    <Check size={16} />
                    <span className="text-[9px] font-black">بدون إشعار</span>
                  </button>
                </div>
              </div>

              <button 
                onClick={handleGenerateInvoice}
                className="w-full bg-slate-900 text-white py-3 lg:py-4 rounded-2xl font-black hover:bg-slate-800 transition-all flex items-center justify-center gap-3 text-base lg:text-lg shadow-xl"
              >
                <CheckCircle size={20} lg:size={24} />
                توليد الفاتورة
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-5 lg:p-10 rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm min-h-[400px] lg:min-h-[600px] flex flex-col relative overflow-hidden">
              {selectedSub && previewInvoice ? (
                <>
                  <div className="flex justify-between items-center mb-6 no-print gap-2">
                    <button 
                      onClick={handleCancelSelection}
                      className="bg-slate-100 text-slate-600 px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-black text-xs lg:text-base flex items-center gap-2 hover:bg-slate-200 transition-all"
                    >
                      <RotateCcw size={18} lg:size={20} />
                      إلغاء الأمر
                    </button>
                    <button 
                      onClick={handlePrint}
                      className="bg-blue-600 text-white px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl font-black text-xs lg:text-base flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                    >
                      <Printer size={18} lg:size={20} />
                      طباعة / حفظ PDF
                    </button>
                  </div>
                  <div className="border border-slate-100 p-4 lg:p-8 rounded-3xl bg-slate-50/20">
                     {renderPrintableInvoice(previewInvoice as Invoice, selectedSub)}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-200">
                  <Droplets size={60} lg:size={80} className="opacity-10 mb-4" />
                  <p className="text-sm lg:text-xl font-black text-slate-400">اختر مشتركاً للمعاينة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
          <div className="p-4 lg:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-50/30 gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto justify-center sm:justify-start">
               <button onClick={() => setSelectedInvoices(data.invoices.map(i => i.id))} className="text-[10px] lg:text-xs font-black text-blue-600 hover:underline">تحديد الكل</button>
               <button onClick={() => setSelectedInvoices([])} className="text-[10px] lg:text-xs font-black text-slate-400 hover:underline">إلغاء التحديد</button>
            </div>
            {selectedInvoices.length > 0 && (
              <button 
                onClick={handlePrint}
                className="w-full sm:w-auto bg-slate-900 text-white px-5 lg:px-6 py-2 rounded-xl font-black text-xs lg:text-sm flex items-center justify-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-1"
              >
                <Printer size={14} lg:size={16} />
                طباعة المحددة ({selectedInvoices.length})
              </button>
            )}
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-[10px] lg:text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4"></th>
                  <th className="px-6 py-4">المرجع</th>
                  <th className="px-6 py-4">المشترك</th>
                  <th className="px-6 py-4 text-center">الفترة</th>
                  <th className="px-6 py-4 text-center">الاستهلاك</th>
                  <th className="px-6 py-4">المجموع</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4">إجراءات التواصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.invoices.slice().reverse().map((inv) => {
                  const sub = data.subscribers.find(s => s.id === inv.subscriberId);
                  const isSelected = selectedInvoices.includes(inv.id);
                  return (
                    <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" checked={isSelected} onChange={() => toggleInvoiceSelection(inv.id)} />
                      </td>
                      <td className="px-6 py-4 font-black font-mono text-blue-600 text-xs lg:text-sm">
                        <div className="flex items-center gap-2">
                           {inv.notificationSent && <Bell size={10} className="text-emerald-500" />}
                           {inv.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 text-xs lg:text-sm">{sub?.fullName}</td>
                      <td className="px-6 py-4 text-center font-bold text-blue-400 text-[10px] lg:text-xs">{inv.period}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-500 text-xs lg:text-sm">{inv.consumption} م³</td>
                      <td className="px-6 py-4 font-black text-slate-900 text-xs lg:text-sm">{inv.totalAmount.toFixed(2)} د</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 lg:px-3 py-1 rounded-full text-[9px] lg:text-[10px] font-black ${
                          inv.status === 'مؤداة' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { setSelectedInvoices([inv.id]); handlePrint(); }} className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg"><Printer size={16} /></button>
                          <button onClick={() => handleNotify(inv, 'whatsapp')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><MessageSquare size={16} /></button>
                          <button onClick={() => handleNotify(inv, 'sms')} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><MessageCircle size={16} /></button>
                          <button onClick={() => sub && handleCall(sub.phone)} className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"><Phone size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-2 lg:p-4">
          <div className="w-full max-w-2xl relative rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-white/10">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-2 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest">
                <RefreshCw size={14} className={isProcessingImage ? 'animate-spin' : 'text-blue-400'} />
                المسح الذكي
              </div>
              <button onClick={stopCamera} className="p-2 bg-white/10 backdrop-blur-md text-white rounded-xl border border-white/10 hover:bg-white/20 transition-all"><X size={20} /></button>
            </div>
            <video ref={videoRef} autoPlay playsInline className="w-full h-[350px] lg:h-[500px] object-cover" />
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
               <div className="w-48 lg:w-64 h-24 lg:h-32 border-4 border-blue-500/50 rounded-2xl lg:rounded-3xl" />
            </div>
            <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6">
              <button disabled={isProcessingImage} onClick={captureAndRead} className={`px-8 lg:px-12 py-3 lg:py-5 rounded-[1.5rem] lg:rounded-[2rem] font-black text-base lg:text-xl transition-all ${isProcessingImage ? 'bg-slate-800 text-slate-500' : 'bg-white text-slate-900 hover:scale-105 shadow-2xl shadow-white/20'}`}>
                {isProcessingImage ? <><Loader2 size={20} className="animate-spin inline ml-2" />جاري...</> : "قراءة الآن"}
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* منطقة الطباعة المخصصة */}
      <div className="print-only">
        {view === 'create' && selectedSub && previewInvoice ? (
          renderPrintableInvoice(previewInvoice as Invoice, selectedSub)
        ) : (
          data.invoices
            .filter(inv => selectedInvoices.includes(inv.id))
            .map(inv => renderPrintableInvoice(inv, data.subscribers.find(s => s.id === inv.subscriberId)))
        )}
      </div>
    </div>
  );
};

export default Billing;
