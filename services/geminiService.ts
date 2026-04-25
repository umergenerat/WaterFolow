
import { GoogleGenAI } from "@google/genai";
import { Invoice, Subscriber } from "../types";

const isOffline = () => !navigator.onLine;

/**
 * Replace placeholders in templates
 */
export function formatTemplate(template: string, data: any): string {
  let formatted = template;
  const map: Record<string, any> = {
    '{الاسم}': data.subscriber?.fullName || '',
    '{رقم_العداد}': data.subscriber?.meterNumber || '',
    '{المبلغ}': data.invoice?.totalAmount || '',
    '{رقم_الفاتورة}': data.invoice?.invoiceNumber || '',
    '{رقم_الوصل}': data.invoice?.receiptNumber || '',
    '{قم_الوصل}': data.invoice?.receiptNumber || '',
    '{تاريخ_الاستحقاق}': data.invoice?.dueDate || '',
    '{الاستهلاك}': data.invoice?.consumption || '',
    '{اسم_الجمعية}': data.organizationName || '',
  };

  Object.keys(map).forEach(key => {
    // Fixed: replaceAll is replaced with split().join() to avoid compatibility issues in older environments
    formatted = formatted.split(key).join(map[key]);
  });
  return formatted;
}

export async function generateNotificationMessage(invoice: Invoice, subscriber: Subscriber, customTemplate?: string, organizationName?: string): Promise<string> {
  if (customTemplate) {
    return formatTemplate(customTemplate, { subscriber, invoice, organizationName });
  }

  const identityHeader = organizationName ? `[إشعار رسمي: ${organizationName}]\n\n` : '';
  const identityFooter = organizationName ? `\n\nالمرسل: إدارة ${organizationName}` : '';

  const defaultMsg = `${identityHeader}تحية طيبة السيد(ة) ${subscriber.fullName}، نخبركم بصدور فاتورتكم رقم ${invoice.invoiceNumber} للعداد رقم ${subscriber.meterNumber} بمبلغ ${invoice.totalAmount} درهم.${identityFooter}`;
  
  if (isOffline()) return defaultMsg;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `صغ رسالة واتساب مهنية للمشترك ${subscriber.fullName} لإبلاغه بصدور فاتورته الجديدة رقم ${invoice.invoiceNumber} للعداد رقم ${subscriber.meterNumber} بمبلغ ${invoice.totalAmount} درهم.` + 
      (organizationName ? ` يجب أن تبدأ الرسالة بعبارة "[إشعار رسمي: ${organizationName}]" وتختم بعبارة "المرسل: إدارة ${organizationName}".` : '');
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || defaultMsg;
  } catch (error) {
    return defaultMsg;
  }
}

export async function generatePaymentConfirmation(invoice: Invoice, subscriber: Subscriber, customTemplate?: string, organizationName?: string): Promise<string> {
  if (customTemplate) {
    return formatTemplate(customTemplate, { subscriber, invoice, organizationName });
  }

  const identityHeader = organizationName ? `[إشعار رسمي: ${organizationName}]\n\n` : '';
  const identityFooter = organizationName ? `\n\nالمرسل: إدارة ${organizationName}` : '';

  const defaultMsg = identityHeader + 
    `نؤكد لكم استلام مبلغ ${invoice.totalAmount} درهم بنجاح للسيد(ة) ${subscriber.fullName}.\n` +
    `رقم العداد: ${subscriber.meterNumber}\n` +
    `رقم الفاتورة: ${invoice.invoiceNumber}\n` +
    `رقم الوصل: ${invoice.receiptNumber}\n` +
    `تاريخ الأداء: ${invoice.paymentDate || new Date().toISOString().split('T')[0]}\n\n` +
    `شكراً لكم على التزامكم.` + 
    identityFooter;

  if (isOffline()) return defaultMsg;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      بصفتك المسؤول المالي لنظام تدبير الماء ${organizationName ? `التابع لـ "${organizationName}"` : ''}، 
      صغ رسالة تأكيد أداء رسمية للمشترك ${subscriber.fullName}.
      المعطيات:
      - المبلغ المستلم: ${invoice.totalAmount} درهم.
      - رقم العداد: ${subscriber.meterNumber}.
      - رقم الوصل: ${invoice.receiptNumber}.
      - رقم الفاتورة المعنية: ${invoice.invoiceNumber}.
      يجب أن تكون الرسالة احترافية جداً، وتبدأ بعبارة تثبت هوية الجهة المرسلة ${organizationName ? `(يجب أن تكون: [إشعار رسمي: ${organizationName}])` : ''}.
      أكد في الرسالة أن هذه العملية مسجلة في النظام الرقمي للجمعية وذمة المشترك بريئة من هذا المبلغ.
      ${organizationName ? `اختم الرسالة بعبارة "المرسل: إدارة ${organizationName}".` : ''}`;
      
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || defaultMsg;
  } catch (error) {
    return defaultMsg;
  }
}

export async function generateArrearsReminder(subscriber: Subscriber, totalDebt: number, unpaidCount: number, organizationName?: string): Promise<string> {
  const identityHeader = organizationName ? `[إشعار رسمي: ${organizationName}]\n\n` : '';
  const identityFooter = organizationName ? `\n\nالمرسل: إدارة ${organizationName}` : '';
  
  const defaultMsg = `${identityHeader}تحية طيبة السيد(ة) ${subscriber.fullName}، نذكركم بأن ذمتكم تحتوي على ${unpaidCount} فواتير غير مؤداة بمبلغ إجمالي ${totalDebt} درهم. المرجو التسوية في أقرب وقت.${identityFooter}`;

  if (isOffline()) return defaultMsg;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      بصفتك مسؤول نظام تدبير الماء، صغ رسالة تذكير ودية ومحترمة للمشترك ${subscriber.fullName}.
      المعطيات:
      - إجمالي الديون العالقة: ${totalDebt} درهم.
      - عدد الفواتير غير المؤداة: ${unpaidCount}.
      يجب أن تكون الرسالة حازمة ولكن مهذبة، تحث على الأداء لتجنب انقطاع الخدمة.
      ${organizationName ? `يجب أن تبدأ الرسالة بعبارة "[إشعار رسمي: ${organizationName}]" وتختم بعبارة "المرسل: إدارة ${organizationName}".` : ''}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || defaultMsg;
  } catch (error) {
    return defaultMsg;
  }
}

export async function extractMeterReading(base64Image: string): Promise<number | null> {
  if (isOffline()) {
    console.warn("AI Meter Reading is not available offline.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };
    const textPart = {
      text: "استخرج الرقم الظاهر في عداد المياه (القيمة بالأمتار المكعبة m3). أجب بالرقم فقط."
    };
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, textPart] },
    });
    
    const text = response.text || "";
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  } catch (error) {
    console.error("AI Meter Reading Error:", error);
    return null;
  }
}
