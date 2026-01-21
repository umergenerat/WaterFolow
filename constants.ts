
import { AppData, Tranche } from './types';

export const DEFAULT_TRANCHES: Tranche[] = [
  { id: '1', min: 0, max: 6, pricePerM3: 2.5 },
  { id: '2', min: 6, max: 12, pricePerM3: 5.0 },
  { id: '3', min: 12, max: 20, pricePerM3: 8.5 },
  { id: '4', min: 20, max: null, pricePerM3: 12.0 },
];

export const INITIAL_DATA: AppData = {
  subscribers: [
    {
      id: 'sub-1',
      fullName: 'محمد العلوي',
      meterNumber: 'M-1001',
      address: 'شارع الحسن الثاني، رقم 45',
      phone: '0600000001',
      status: 'نشط',
      createdAt: '2023-01-01',
    }
  ],
  invoices: [],
  tranches: DEFAULT_TRANCHES,
  fixedCharges: 10.0,
  organizationName: 'إدارة المياه المركزية',
  adminName: 'أحمد المسؤول',
  themeColor: 'blue',
  billingCycle: 'monthly',
  autoNotify: true,
  billingTemplate: 'تحية طيبة السيد(ة) {الاسم}، نخبركم بصدور فاتورة استهلاك الماء رقم {رقم_الفاتورة} بمبلغ {المبلغ} درهم. المرجو الأداء قبل {تاريخ_الاستحقاق}. شكراً.',
  paymentTemplate: 'شكراً لكم السيد(ة) {الاسم}، تم استلام مبلغ {المبلغ} درهم بنجاح مقابل الفاتورة رقم {رقم_الفاتورة}. رقم وصل الأداء: {رقم_الوصل}.',
  authConfig: {
    username: 'aitloutouaomwater@factur.agliz',
    password: '123456AG'
  }
};
