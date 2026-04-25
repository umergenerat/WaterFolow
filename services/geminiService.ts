
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

  const defaultMsg = `تحية طيبة، نخبركم بصدور فاتورتكم رقم ${invoice.invoiceNumber} بمبلغ ${invoice.totalAmount} درهم.` + (organizationName ? `\n\nالمرسل: ${organizationName}` : '');
  
  if (isOffline()) return defaultMsg;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `صغ رسالة واتساب مهنية للمشترك ${subscriber.fullName} لإبلاغه بصدور فاتورته الجديدة رقم ${invoice.invoiceNumber} بمبلغ ${invoice.totalAmount} درهم.` + (organizationName ? ` أضف في نهاية الرسالة أن المرسل هو "${organizationName}".` : '');
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

  const defaultMsg = (organizationName ? `[إشعار رسمي: ${organizationName}]\n\n` : '') + 
    `نؤكد لكم استلام مبلغ ${invoice.totalAmount} درهم بنجاح للسيد(ة) ${subscriber.fullName}.\n` +
    `رقم الوصل: ${invoice.receiptNumber}\n` +
    `تاريخ الأداء: ${invoice.paymentDate || new Date().toISOString().split('T')[0]}\n\n` +
    `شكراً لكم على التزامكم.` + 
    (organizationName ? `\n\nالمرسل: إدارة ${organizationName}` : '');

  if (isOffline()) return defaultMsg;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      بصفتك المسؤول المالي لنظام تدبير الماء ${organizationName ? `التابع لـ "${organizationName}"` : ''}، 
      صغ رسالة تأكيد أداء رسمية للمشترك ${subscriber.fullName}.
      المعطيات:
      - المبلغ المستلم: ${invoice.totalAmount} درهم.
      - رقم الوصل: ${invoice.receiptNumber}.
      - رقم الفاتورة المعنية: ${invoice.invoiceNumber}.
      يجب أن تكون الرسالة احترافية جداً، وتبدأ بعبارة تثبت هوية الجهة المرسلة ${organizationName ? `(مثل: إشعار رسمي من ${organizationName})` : ''}.
      أكد في الرسالة أن هذه العملية مسجلة في النظام الرقمي للجمعية وذمة المشترك بريئة من هذا المبلغ.`;
      
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
  const defaultMsg = `تحية طيبة السيد(ة) ${subscriber.fullName}، نذكركم بأن ذمتكم تحتوي على ${unpaidCount} فواتير غير مؤداة بمبلغ إجمالي ${totalDebt} درهم. المرجو التسوية في أقرب وقت.` + (organizationName ? `\n\nالمرسل: ${organizationName}` : '');

  if (isOffline()) return defaultMsg;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      بصفتك مسؤول نظام تدبير الماء، صغ رسالة تذكير ودية ومحترمة للمشترك ${subscriber.fullName}.
      المعطيات:
      - إجمالي الديون العالقة: ${totalDebt} درهم.
      - عدد الفواتير غير المؤداة: ${unpaidCount}.
      يجب أن تكون الرسالة حازمة ولكن مهذبة، تحث على الأداء لتجنب انقطاع الخدمة.` + (organizationName ? `\nأضف في نهاية الرسالة أن المرسل هو "${organizationName}".` : '');
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
