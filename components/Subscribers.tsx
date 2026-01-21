
import React, { useState, useRef, useMemo } from 'react';
import { Subscriber, AppData } from '../types';
import { Plus, Search, Edit2, Trash2, UserCheck, UserX, Users, Upload, CheckSquare, Square, AlertTriangle, X } from 'lucide-react';

interface SubscribersProps {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
}

const Subscribers: React.FC<SubscribersProps> = ({ data, setData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for the custom Delete Confirmation Modal
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    id?: string;
  }>({ isOpen: false, type: 'single' });

  const [formData, setFormData] = useState<Partial<Subscriber>>({
    status: 'نشط',
    fullName: '',
    meterNumber: '',
    address: '',
    phone: '',
  });

  const filteredSubscribers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return data.subscribers.filter(s => 
      s.fullName.toLowerCase().includes(term) || 
      s.meterNumber.toLowerCase().includes(term) || 
      s.phone.includes(term)
    );
  }, [data.subscribers, searchTerm]);

  const openAddModal = () => {
    setEditingSubId(null);
    setFormData({ status: 'نشط', fullName: '', meterNumber: '', address: '', phone: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (subscriber: Subscriber, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSubId(subscriber.id);
    setFormData({ ...subscriber });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setData((prev) => {
      if (editingSubId) {
        return {
          ...prev,
          subscribers: prev.subscribers.map(s => 
            s.id === editingSubId ? { ...s, ...formData as Subscriber } : s
          )
        };
      } else {
        const id = `sub-${Date.now()}`;
        const newSubscriber: Subscriber = {
          ...formData as Subscriber,
          id,
          createdAt: new Date().toISOString().split('T')[0],
        };
        return {
          ...prev,
          subscribers: [...prev.subscribers, newSubscriber]
        };
      }
    });
    setIsModalOpen(false);
    setEditingSubId(null);
  };

  const toggleStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setData((prev) => ({
      ...prev,
      subscribers: prev.subscribers.map(s => 
        s.id === id ? { ...s, status: s.status === 'نشط' ? 'موقوف' : 'نشط' } : s
      )
    }));
  };

  // Trigger Single Delete Modal
  const triggerDeleteSub = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmation({ isOpen: true, type: 'single', id });
  };

  // Trigger Bulk Delete Modal
  const triggerDeleteSelected = () => {
    if (selectedSubIds.length === 0) return;
    setDeleteConfirmation({ isOpen: true, type: 'bulk' });
  };

  // Execute actual deletion
  const confirmDelete = () => {
    setData((prev) => {
      let updatedSubscribers = [...prev.subscribers];
      let updatedInvoices = [...prev.invoices];

      if (deleteConfirmation.type === 'single' && deleteConfirmation.id) {
        updatedSubscribers = updatedSubscribers.filter(s => s.id !== deleteConfirmation.id);
        updatedInvoices = updatedInvoices.filter(i => i.subscriberId !== deleteConfirmation.id);
        setSelectedSubIds(prevIds => prevIds.filter(sid => sid !== deleteConfirmation.id));
      } else if (deleteConfirmation.type === 'bulk') {
        updatedSubscribers = updatedSubscribers.filter(s => !selectedSubIds.includes(s.id));
        updatedInvoices = updatedInvoices.filter(i => !selectedSubIds.includes(i.subscriberId));
        setSelectedSubIds([]);
      }

      return {
        ...prev,
        subscribers: updatedSubscribers,
        invoices: updatedInvoices
      };
    });
    setDeleteConfirmation({ isOpen: false, type: 'single' });
  };

  const toggleSelectAll = () => {
    if (selectedSubIds.length === filteredSubscribers.length && filteredSubscribers.length > 0) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(filteredSubscribers.map(s => s.id));
    }
  };

  const toggleSelectOne = (id: string, e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedSubIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        let importedSubscribers: Partial<Subscriber>[] = [];
        if (file.name.endsWith('.json')) {
          importedSubscribers = JSON.parse(content);
        } else {
          const lines = content.split('\n');
          importedSubscribers = lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',').map(v => v.trim());
            return { fullName: values[0], meterNumber: values[1], address: values[2], phone: values[3] };
          });
        }

        setData((prev) => {
          const newSubs: Subscriber[] = [];
          importedSubscribers.forEach(s => {
            if (s.fullName && s.meterNumber && !prev.subscribers.some(ex => ex.meterNumber === s.meterNumber)) {
              newSubs.push({
                id: `sub-${Math.random().toString(36).substr(2, 9)}`,
                fullName: s.fullName,
                meterNumber: s.meterNumber,
                address: s.address || '',
                phone: s.phone || '',
                status: 'نشط',
                createdAt: new Date().toISOString().split('T')[0]
              });
            }
          });
          return { ...prev, subscribers: [...prev.subscribers, ...newSubs] };
        });
      } catch (err) {
        alert("❌ خطأ في تنسيق الملف.");
      }
    };
    reader.readAsText(file);
  };

  const inputClasses = "w-full px-4 py-3 bg-white border border-slate-200 text-slate-900 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm lg:text-base";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-slate-800">إدارة المشتركين</h2>
          <p className="text-slate-500 text-xs lg:text-sm font-medium">قاعدة بيانات رقمية شاملة للمنخرطين</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.json" className="hidden" />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-200 font-bold text-sm shadow-sm"
          >
            <Upload size={18} />
            استيراد
          </button>
          
          <button 
            onClick={triggerDeleteSelected}
            disabled={selectedSubIds.length === 0}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm shadow-lg ${
              selectedSubIds.length > 0 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Trash2 size={18} />
            {selectedSubIds.length > 0 ? `حذف المحددين (${selectedSubIds.length})` : 'حذف جماعي'}
          </button>

          <button 
            onClick={openAddModal}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 font-bold text-sm"
          >
            <Plus size={18} />
            إضافة جديد
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="البحث بالاسم، العداد أو الهاتف..." 
              className="w-full pr-11 pl-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs font-bold text-slate-500 whitespace-nowrap bg-slate-100 px-3 py-1.5 rounded-lg">
            النتائج: {filteredSubscribers.length}
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-4 py-4 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-blue-600 transition-colors">
                    {selectedSubIds.length === filteredSubscribers.length && filteredSubscribers.length > 0 
                      ? <CheckSquare size={20} className="text-blue-600" /> 
                      : <Square size={20} />
                    }
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">الاسم الكامل</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">رقم العداد</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">العنوان</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">الهاتف</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">الحالة</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubscribers.map((subscriber) => {
                const isSelected = selectedSubIds.includes(subscriber.id);
                return (
                  <tr 
                    key={subscriber.id} 
                    onClick={() => toggleSelectOne(subscriber.id)}
                    className={`transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}
                  >
                    <td className="px-4 py-4 text-center">
                      <button onClick={(e) => toggleSelectOne(subscriber.id, e)} className="text-slate-400 transition-colors">
                        {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{subscriber.fullName}</td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-blue-600">{subscriber.meterNumber}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600 truncate max-w-[200px]">{subscriber.address}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{subscriber.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${
                        subscriber.status === 'نشط' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {subscriber.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => openEditModal(subscriber, e)}
                          className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => toggleStatus(subscriber.id, e)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        >
                          {subscriber.status === 'نشط' ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button 
                          onClick={(e) => triggerDeleteSub(subscriber.id, e)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSubscribers.length === 0 && (
            <div className="p-16 text-center text-slate-300 flex flex-col items-center">
              <Users size={64} className="opacity-10 mb-4" />
              <p className="font-bold text-slate-400">لا توجد بيانات</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Deletion */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[150] animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-red-50 p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6 animate-bounce">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">تأكيد الحذف النهائي</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                {deleteConfirmation.type === 'single' 
                  ? 'هل أنت متأكد من رغبتك في حذف هذا المشترك؟ سيتم مسح كافة الفواتير والسجلات المرتبطة به نهائياً.'
                  : `هل أنت متأكد من حذف ${selectedSubIds.length} مشتركين دفعة واحدة؟ لا يمكن التراجع عن هذا الإجراء.`
                }
              </p>
            </div>
            <div className="p-6 bg-white flex gap-3">
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-red-200 transition-all active:scale-95"
              >
                نعم، احذف الآن
              </button>
              <button 
                onClick={() => setDeleteConfirmation({ ...deleteConfirmation, isOpen: false })}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                إلغاء الأمر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg my-auto animate-in fade-in zoom-in duration-300">
            <div className={`p-6 text-white rounded-t-[2rem] flex justify-between items-center ${editingSubId ? 'bg-amber-600' : 'bg-blue-600'}`}>
              <h3 className="text-xl font-black">{editingSubId ? 'تعديل المشترك' : 'إضافة مشترك جديد'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-black/10 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الاسم الكامل</label>
                  <input required type="text" placeholder="مثال: أحمد العمراني" className={inputClasses} value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">رقم العداد</label>
                    <input required type="text" placeholder="M-000" className={`${inputClasses} font-mono`} value={formData.meterNumber} onChange={(e) => setFormData({...formData, meterNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الهاتف</label>
                    <input required type="tel" placeholder="06XXXXXXXX" className={inputClasses} value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">العنوان الكامل</label>
                  <textarea required placeholder="أدخل العنوان..." className={`${inputClasses} min-h-[80px]`} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}></textarea>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className={`flex-1 text-white py-3.5 rounded-xl font-black shadow-lg transition-all active:scale-95 ${editingSubId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {editingSubId ? 'تحديث البيانات' : 'حفظ المشترك'}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl font-black hover:bg-slate-200 transition-all">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscribers;
