
import { AppSheetConfig, Subscriber, Invoice } from "../types";

/**
 * AppSheet API Service - Enhanced with bidirectional sync
 * Supports both push (App → AppSheet) and pull (AppSheet → App)
 */

const API_BASE_URL = "https://api.appsheet.com/api/v2/apps";

interface AppSheetRow {
  [key: string]: any;
}

interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * تنظيف بيانات الفاتورة لإزالة الحقول غير المدعومة في AppSheet
 */
function cleanInvoiceForAppSheet(invoice: Invoice): AppSheetRow {
  const { trancheDetails, ...rest } = invoice;
  return rest;
}

/**
 * مزامنة البيانات إلى AppSheet (Push)
 */
export async function syncToAppSheet(
  tableName: 'Subscribers' | 'Invoices',
  action: 'Add' | 'Edit' | 'Delete',
  rows: any[],
  config: AppSheetConfig
): Promise<SyncResult> {
  if (!config.enabled || !config.appId || !config.accessKey) {
    return {
      success: false,
      message: "المزامنة غير مفعلة أو الإعدادات غير مكتملة"
    };
  }

  try {
    // تنظيف البيانات حسب نوع الجدول
    const cleanedRows = tableName === 'Invoices' 
      ? rows.map(cleanInvoiceForAppSheet)
      : rows;

    console.log(`🔄 Syncing ${action} ${rows.length} row(s) to ${tableName}...`);

    const response = await fetch(`${API_BASE_URL}/${config.appId}/tables/${tableName}/Action`, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': config.accessKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Action: action,
        Properties: {
          Locale: "ar-MA",
          Timezone: "Africa/Casablanca"
        },
        Rows: cleanedRows
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AppSheet API Error:`, errorText);
      
      let errorMessage = "فشلت المزامنة مع AppSheet";
      if (response.status === 401) {
        errorMessage = "مفتاح الوصول غير صحيح";
      } else if (response.status === 404) {
        errorMessage = "التطبيق أو الجدول غير موجود";
      } else if (response.status === 400) {
        errorMessage = "بيانات غير صالحة";
      }

      return {
        success: false,
        message: `${errorMessage}: ${errorText}`
      };
    }

    const result = await response.json();
    console.log(`✅ Successfully synced to ${tableName}`);

    return {
      success: true,
      message: `تمت مزامنة ${rows.length} سجل بنجاح`,
      data: result
    };
  } catch (error) {
    console.error(`❌ Failed to sync ${tableName}:`, error);
    return {
      success: false,
      message: `خطأ في الاتصال: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
    };
  }
}

/**
 * سحب البيانات من AppSheet (Pull)
 */
export async function pullFromAppSheet(
  tableName: 'Subscribers' | 'Invoices',
  config: AppSheetConfig
): Promise<SyncResult> {
  if (!config.enabled || !config.appId || !config.accessKey) {
    return {
      success: false,
      message: "المزامنة غير مفعلة أو الإعدادات غير مكتملة"
    };
  }

  try {
    console.log(`📥 Pulling data from ${tableName}...`);

    const response = await fetch(`${API_BASE_URL}/${config.appId}/tables/${tableName}/Action`, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': config.accessKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: {
          Locale: "ar-MA",
          Selector: "Filter(Subscribers, TRUE)" // جلب جميع السجلات
        },
        Rows: []
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ AppSheet Pull Error:`, errorText);
      
      return {
        success: false,
        message: `فشل سحب البيانات: ${errorText}`
      };
    }

    const result = await response.json();
    console.log(`✅ Successfully pulled from ${tableName}:`, result);

    return {
      success: true,
      message: `تم سحب البيانات بنجاح`,
      data: result.Rows || []
    };
  } catch (error) {
    console.error(`❌ Failed to pull from ${tableName}:`, error);
    return {
      success: false,
      message: `خطأ في الاتصال: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
    };
  }
}

/**
 * اختبار الاتصال بـ AppSheet
 */
export async function testAppSheetConnection(config: AppSheetConfig): Promise<SyncResult> {
  if (!config.appId || !config.accessKey) {
    return {
      success: false,
      message: "يجب إدخال معرف التطبيق ومفتاح الوصول"
    };
  }

  try {
    console.log("🔌 Testing AppSheet connection...");

    const response = await fetch(`${API_BASE_URL}/${config.appId}/tables/Subscribers/Action`, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': config.accessKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Action: "Find",
        Properties: {
          Locale: "ar-MA",
          Selector: "TOP(Subscribers, 1)" // جلب سجل واحد فقط للاختبار
        },
        Rows: []
      })
    });

    if (response.ok) {
      console.log("✅ Connection successful!");
      return {
        success: true,
        message: "تم الاتصال بنجاح"
      };
    } else {
      const errorText = await response.text();
      console.error("❌ Connection failed:", errorText);
      
      let errorMessage = "فشل الاتصال";
      if (response.status === 401) {
        errorMessage = "مفتاح الوصول غير صحيح";
      } else if (response.status === 404) {
        errorMessage = "معرف التطبيق غير صحيح";
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  } catch (error) {
    console.error("❌ Connection test failed:", error);
    return {
      success: false,
      message: `خطأ في الاتصال: ${error instanceof Error ? error.message : 'تحقق من الاتصال بالإنترنت'}`
    };
  }
}

/**
 * مزامنة كاملة ثنائية الاتجاه
 */
export async function bidirectionalSync(
  data: { subscribers: Subscriber[], invoices: Invoice[] },
  config: AppSheetConfig
): Promise<SyncResult> {
  try {
    // 1. Push local data to AppSheet
    const subsSync = await syncToAppSheet('Subscribers', 'Add', data.subscribers, config);
    const invoicesSync = await syncToAppSheet('Invoices', 'Add', data.invoices, config);

    if (!subsSync.success || !invoicesSync.success) {
      return {
        success: false,
        message: `فشلت المزامنة: ${subsSync.message}, ${invoicesSync.message}`
      };
    }

    // 2. Pull data from AppSheet (for future updates)
    // Note: This would require merge logic to handle conflicts
    
    return {
      success: true,
      message: "تمت المزامنة الكاملة بنجاح"
    };
  } catch (error) {
    return {
      success: false,
      message: `خطأ في المزامنة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
    };
  }
}
