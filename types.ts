
export type SubscriberStatus = 'نشط' | 'موقوف';
export type PaymentStatus = 'مؤداة' | 'غير مؤداة';
export type PaymentMethod = 'نقداً' | 'تحويل بنكي' | 'بطاقة بنكية';
export type BillingCycle = 'monthly' | 'periodic';

export interface AuthConfig {
  username: string;
  password: string;
}

export interface AppSheetConfig {
  appId: string;
  accessKey: string;
  enabled: boolean;
  autoSync?: boolean;
  lastSync?: string;
}

export interface Subscriber {
  id: string;
  fullName: string;
  meterNumber: string;
  address: string;
  phone: string;
  status: SubscriberStatus;
  createdAt: string;
}

export interface Tranche {
  id: string;
  min: number;
  max: number | null;
  pricePerM3: number;
}

export interface TrancheCalculation {
  trancheLabel: string;
  quantity: number;
  pricePerUnit: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  subscriberId: string;
  period: string;
  previousIndex: number;
  currentIndex: number;
  consumption: number;
  trancheDetails: TrancheCalculation[];
  fixedCharges: number;
  totalAmount: number;
  dueDate: string;
  status: PaymentStatus;
  readingDate: string;
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  receiptNumber?: string;
  notificationSent?: boolean;
}

export interface AppData {
  subscribers: Subscriber[];
  invoices: Invoice[];
  tranches: Tranche[];
  fixedCharges: number;
  organizationName: string;
  adminName: string;
  logoUrl?: string;
  themeColor: string;
  billingCycle: BillingCycle;
  autoNotify: boolean;
  billingTemplate: string;
  paymentTemplate: string;
  appSheetConfig?: AppSheetConfig;
  authConfig: AuthConfig;
}
