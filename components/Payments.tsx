
import React, { useState, useMemo } from 'react';
import { AppData, Invoice, PaymentMethod } from '../types';
import { Wallet, Printer, CheckCircle, Search, CreditCard, Banknote, Landmark, Droplets, BellRing, AlertTriangle, Share2, Check, MessageSquare, Phone, MessageCircle } from 'lucide-react';
import { generateArrearsReminder, generatePaymentConfirmation } from '../services/geminiService';

interface PaymentsProps {
  data: AppData;
  setData: (data: AppData) => void;
}

const Payments: React.FC<PaymentsProps> = ({ data, setData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقداً');
  const [loadingReminder, setLoadingReminder] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [notificationChannel, setNotificationChannel] = useState<'whatsapp' | 'sms' | 'none'>(data.autoNotify ? 'whatsapp' : 'none');

  const unpaidInvoices = useMemo(() => {
    return data.invoices.filter(inv => 
      inv.status === 'غير مؤداة' && 
      (inv.invoiceNumber.includes(searchTerm) || 
       data.subscribers.find(s => s.id === inv.subscriberId)?.fullName.includes(searchTerm))
    );
  }, [data.invoices, data.subscribers, searchTerm]);

  const selectedInvoice = useMemo(() => 
    data.invoices.find(i => i.id === selectedInvoiceId), 
  [selectedInvoiceId, data.invoices]);

  const subscriberDebtInfo = useMemo(() => {
    if (!selectedInvoice) return null;
    const subInvoices = data.invoices.filter(i => i.subscriberId === selectedInvoice.subscriberId && i.status === 'غير مؤداة');
    const totalDebt = subInvoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
    return {
      totalDebt,
      count: subInvoices.length,
      subscriber: data.subscribers.find(s => s.id === selectedInvoice.subscriberId)
    };
  }, [selectedInvoice, data.invoices, data.subscribers]);

  const handlePay = () => {
    if (!selectedInvoice) return;
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;
    
    const updatedInvoice = { 
      ...selectedInvoice, 
      status: 'مؤداة' as const, 
      paymentDate: new Date().toISOString().split('T')[0], 
      paymentMethod, 
      receiptNumber 
    };

    setData({
      ...data,
      invoices: data.invoices.map(inv => 
        inv.id === selectedInvoice.id ? updatedInvoice : inv
      )
    });

    if (notificationChannel !== 'none') {
      handleNotifyPayment(updatedInvoice, notificationChannel);
    }

    alert(`✅ تم تسجيل الأداء بنجاح.\nرقم الوصل: ${receiptNumber}`);
    setSelectedInvoiceId(null);
  };

  const handleNotifyPayment = async (invoice: Invoice, channel: 'whatsapp' | 'sms') => {
    const sub = data.subscribers.find(s => s.id === invoice.subscriberId);
    if (!sub) return;

    try {
      const message = await generatePaymentConfirmation(invoice, sub, data.paymentTemplate);
      const encodedMsg = encodeURIComponent(message);
      
      if (channel === 'whatsapp') {
        const whatsappUrl = `https://wa.me/${sub.phone.replace(/[^0-9]/g, '')}?text=${encodedMsg}`;
        window.open(whatsappUrl, '_blank');
      } else {
        const smsUrl = `sms:${sub.phone.replace(/[^0-9]/g, '')}?body=${encodedMsg}`;
        window.location.href = smsUrl;
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("تعذر إرسال التنبيه. يرجى التحقق من اتصال الإنترنت.");
    }
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^0-9]/g, '')}`;
  };

  const handleSendReminder = async () => {
    if (!subscriberDebtInfo?.subscriber) return;
    setLoadingReminder(true);
    try {
      const message = await generateArrearsReminder(
        subscriberDebtInfo.subscriber, 
        subscriberDebtInfo.totalDebt, 
        subscriberDebtInfo.count
      );
      const whatsappUrl = `https://wa.me/${subscriberDebtInfo.subscriber.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } finally {
      setLoadingReminder(false);
    }
  };

  const toggleReceiptSelection = (id: string) => {
    setSelectedReceipts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrintReceipts = () => {
    if (selectedReceipts.length === 0) {
      alert("المرجو تحديد وصولات للطباعة");
      return;
    }
    window.focus();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const renderPrintableReceipt = (inv: Invoice) => {
    const sub = data.subscribers.find(s => s.id === inv.subscriberId);
    return (
      <div key={inv.id} className="page-break bg-white text-slate-900 border-4 lg:border-8 border-double border-slate-900 max-w-2xl mx-auto rounded-[2rem] lg:rounded-[3rem]">
        <div className="text-center mb-12">
          <Droplets className="mx-auto mb-4 text-slate-900" size={48} />
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase">وصل أداء رقمي</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">{data.organizationName}</p>
        </div>
        
        <div className="space-y-8 mb-12">
          <div className="grid grid-cols-2 gap-8 border-y-2 border-slate-100 py-8">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المرجع التسلسلي للوصل</p>
                <p className="text-2xl font-black text-emerald-600 font-mono">{inv.receiptNumber}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">السيد(ة) المشترك(ة)</p>
                <p className="text-xl font-black">{sub?.fullName}</p>
              </div>
            </div>
            <div className="text-left space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">تاريخ الأداء</p>
                <p className="text-xl font-black font-mono">{inv.paymentDate}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المبلغ المستخلص</p>
                <p className="text-4xl font-black font-mono">{inv.totalAmount.toFixed(2)} <span className="text-lg opacity-40">درهم</span></p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-500">طريقة الدفع: {inv.paymentMethod}</p>
            <p className="text-xs font-bold text-slate-400 mt-1">مقابل الفاتورة: {inv.invoiceNumber}</p>
          </div>
        </div>

        <div className="text-center space-y-6">
          <div className="inline-block p-4 border-2 border-slate-900 rounded-3xl transform rotate-3">
             <p className="text-xs font-black uppercase tracking-widest">خاتم النظام الرقمي</p>
             <p className="text-[8px] opacity-40 uppercase">Digital Receipt Confirmed</p>
          </div>
          <div className="pt-8 text-[10px] font-bold text-slate-400 leading-relaxed text-center">
            تطوير عمر أيت لوتو Aomar Aitloutou
          </div>
        </div>
      </div>
    );
  };

  const inputClasses = "w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold placeholder:text-slate-400 shadow-inner text-sm lg:text-base";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">تحصيل المستحقات والديون</h2>
          <p className="text-slate-500 text-xs lg:text-sm font-medium">إدارة الاستخلاص وتوليد الوصولات</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 no-print">
        <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px] lg:h-[700px]">
          <div className="p-4 lg:p-6 border-b border-slate-100 bg-slate-50/30">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} lg:size={20} />
              <input type="text" placeholder="البحث بالاسم أو الفاتورة..." className={inputClasses} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {unpaidInvoices.length > 0 ? unpaidInvoices.map((inv) => {
              const isActive = selectedInvoiceId === inv.id;
              const sub = data.subscribers.find(s => s.id === inv.subscriberId);
              return (
                <div key={inv.id} onClick={() => setSelectedInvoiceId(inv.id)} className={`p-5 rounded-2xl border transition-all cursor-pointer ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-slate-100 hover:border-blue-200'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-sm lg:text-lg truncate">{sub?.fullName}</span>
                    <span className={`font-mono text-[10px] lg:text-sm px-2 py-1 rounded-lg ${isActive ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>{inv.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold opacity-80">
                    <span>{inv.consumption} م³</span>
                    <span className="text-sm lg:text-lg font-black">{inv.totalAmount.toFixed(2)} د</span>
                  </div>
                </div>
              )
            }) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                <CheckCircle size={48} className="mb-2" />
                <p className="text-xs font-bold">لا توجد فواتير عالقة</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 lg:p-8 rounded-2xl lg:rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-auto lg:h-[700px]">
          {selectedInvoice && subscriberDebtInfo ? (
            <div className="space-y-6 overflow-y-auto custom-scrollbar">
              <div className={`p-6 rounded-3xl border-2 shadow-sm ${subscriberDebtInfo.count > 1 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-black text-slate-800 text-lg">وضعية الديون</h4>
                    <p className="text-sm font-bold text-slate-500">{subscriberDebtInfo.subscriber?.fullName}</p>
                  </div>
                  {subscriberDebtInfo.count > 1 ? <AlertTriangle className="text-amber-500" size={32} /> : <CheckCircle className="text-emerald-500" size={32} />}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-white/60 p-4 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400">الفواتير</p>
                    <p className="text-2xl font-black text-slate-800">{subscriberDebtInfo.count}</p>
                  </div>
                  <div className="bg-white/60 p-4 rounded-2xl text-left">
                    <p className="text-[10px] font-black text-slate-400">الإجمالي</p>
                    <p className="text-2xl font-black text-red-600 font-mono">{subscriberDebtInfo.totalDebt.toFixed(2)} د</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-400 uppercase">طريقة الدفع</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['نقداً', 'تحويل بنكي', 'بطاقة بنكية'] as PaymentMethod[]).map(method => (
                    <button key={method} onClick={() => setPaymentMethod(method)} className={`py-3 rounded-xl border-2 font-bold text-xs transition-all ${paymentMethod === method ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-400 uppercase">خيار التنبيه بعد الأداء</label>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setNotificationChannel('whatsapp')} className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${notificationChannel === 'whatsapp' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <MessageSquare size={16} /> <span className="text-[9px] font-black">WhatsApp</span>
                  </button>
                  <button onClick={() => setNotificationChannel('sms')} className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${notificationChannel === 'sms' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <MessageCircle size={16} /> <span className="text-[9px] font-black">SMS</span>
                  </button>
                  <button onClick={() => setNotificationChannel('none')} className={`py-2 px-1 rounded-xl border flex flex-col items-center gap-1 transition-all ${notificationChannel === 'none' ? 'bg-slate-200 border-slate-400 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    <Check size={16} /> <span className="text-[9px] font-black">بدون إشعار</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 space-y-6 text-center">
                <h4 className="font-black text-slate-800">الفاتورة رقم {selectedInvoice.invoiceNumber}</h4>
                <div className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white">
                  <div className="text-4xl font-black font-mono">{selectedInvoice.totalAmount.toFixed(2)} <span className="text-lg opacity-30">درهم</span></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handlePay} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"><Check size={24} />تأكيد الأداء</button>
                  <button onClick={() => subscriberDebtInfo.subscriber && handleCall(subscriberDebtInfo.subscriber.phone)} title="اتصال هاتفي" className="p-4 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-all"><Phone size={24} /></button>
                </div>
                <button onClick={handleSendReminder} disabled={loadingReminder} className="w-full bg-white text-emerald-600 border border-emerald-100 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all"><Share2 size={16} />إرسال تذكير بالديون (WhatsApp)</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-100 min-h-[200px]">
              <Wallet size={100} className="opacity-10" />
              <p className="text-xl font-black text-slate-300 mt-8">اختر فاتورة للمعالجة</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200 shadow-sm overflow-hidden no-print">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
          <h3 className="font-black text-slate-700">تاريخ العمليات (الخلاص)</h3>
          {selectedReceipts.length > 0 && (
            <button onClick={handlePrintReceipts} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-black flex items-center gap-2 shadow-lg text-sm">
              <Printer size={18} /> طباعة المحددة ({selectedReceipts.length})
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm min-w-[700px]">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                <th className="px-6 py-5"></th>
                <th className="px-6 py-5">رقم الوصل</th>
                <th className="px-6 py-5">المشترك</th>
                <th className="px-6 py-5">التاريخ</th>
                <th className="px-6 py-5 text-left">المبلغ</th>
                <th className="px-6 py-5">إجراءات التواصل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.invoices.filter(i => i.status === 'مؤداة').slice().reverse().map(inv => {
                const sub = data.subscribers.find(s => s.id === inv.subscriberId);
                return (
                  <tr key={inv.id} className={`hover:bg-slate-50 transition-colors ${selectedReceipts.includes(inv.id) ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-6 py-4">
                      <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-emerald-600" checked={selectedReceipts.includes(inv.id)} onChange={() => toggleReceiptSelection(inv.id)} />
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-emerald-600">{inv.receiptNumber}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{sub?.fullName}</td>
                    <td className="px-6 py-4 text-slate-500 font-bold">{inv.paymentDate}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-left">{inv.totalAmount.toFixed(2)} د</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => { setSelectedReceipts([inv.id]); handlePrintReceipts(); }} className="p-1.5 text-slate-400 hover:text-slate-900 bg-slate-50 rounded-lg"><Printer size={16} /></button>
                        <button onClick={() => handleNotifyPayment(inv, 'whatsapp')} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><MessageSquare size={16} /></button>
                        <button onClick={() => handleNotifyPayment(inv, 'sms')} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"><MessageCircle size={16} /></button>
                        <button onClick={() => sub && handleCall(sub.phone)} className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"><Phone size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="print-only">
        {data.invoices
          .filter(inv => selectedReceipts.includes(inv.id))
          .map(inv => renderPrintableReceipt(inv))}
      </div>
    </div>
  );
};

export default Payments;
