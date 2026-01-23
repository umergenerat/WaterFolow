
import React, { useState } from 'react';
import { Download, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { AppSheetConfig, Subscriber, Invoice } from '../types';
import { importAllFromAppSheet } from '../services/appSheetService';

interface AppSheetDataImporterProps {
    config: AppSheetConfig;
    onImportSuccess: (data: { subscribers: Subscriber[], invoices: Invoice[] }) => void;
}

const AppSheetDataImporter: React.FC<AppSheetDataImporterProps> = ({ config, onImportSuccess }) => {
    const [isImporting, setIsImporting] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [importStats, setImportStats] = useState<{ subscribers: number, invoices: number } | null>(null);

    const handleImport = async () => {
        if (!config.enabled) {
            setStatus('error');
            setMessage('يجب تفعيل المزامنة أولاً');
            return;
        }

        setIsImporting(true);
        setStatus('idle');
        setMessage('جارٍ الاتصال بـ AppSheet...');

        try {
            const result = await importAllFromAppSheet(config);

            if (result.success) {
                setStatus('success');
                setMessage('تم استيراد البيانات بنجاح!');
                setImportStats({
                    subscribers: result.subscribers.length,
                    invoices: result.invoices.length
                });

                // Call parent callback
                onImportSuccess({
                    subscribers: result.subscribers,
                    invoices: result.invoices
                });
            } else {
                setStatus('error');
                setMessage(result.error || 'فشل في استيراد البيانات');
            }
        } catch (error: any) {
            setStatus('error');
            setMessage(error.message || 'حدث خطأ غير متوقع');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border border-blue-100">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h4 className="font-black text-blue-900 text-base mb-1 flex items-center gap-2">
                        <Download size={20} className="text-blue-600" />
                        استيراد البيانات من AppSheet
                    </h4>
                    <p className="text-xs font-bold text-blue-600">
                        سحب المشتركين والفواتير من السحابة إلى التطبيق
                    </p>
                </div>
            </div>

            <button
                onClick={handleImport}
                disabled={isImporting || !config.enabled}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isImporting ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        جارٍ الاستيراد...
                    </>
                ) : (
                    <>
                        <RefreshCw size={18} />
                        استيراد الآن
                    </>
                )}
            </button>

            {/* Status Messages */}
            {status !== 'idle' && (
                <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${status === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                    }`}>
                    {status === 'success' ? (
                        <Check size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                        <p className={`font-black text-sm ${status === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                            {message}
                        </p>
                        {importStats && status === 'success' && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="bg-white p-2 rounded-lg">
                                    <p className="text-xs font-bold text-slate-500">المشتركين</p>
                                    <p className="text-lg font-black text-emerald-600">{importStats.subscribers}</p>
                                </div>
                                <div className="bg-white p-2 rounded-lg">
                                    <p className="text-xs font-bold text-slate-500">الفواتير</p>
                                    <p className="text-lg font-black text-emerald-600">{importStats.invoices}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!config.enabled && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-amber-800">
                        يجب تفعيل المزامنة في قسم "الربط مع AppSheet" أولاً
                    </p>
                </div>
            )}
        </div>
    );
};

export default AppSheetDataImporter;
