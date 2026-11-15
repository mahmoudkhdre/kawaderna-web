import { RejectionFailure } from '../../domain/leave/managerRejection';

export const REJECT_LABEL = 'رفض';
export const REJECT_TITLE = 'رفض طلب الإجازة';
export const REJECT_SUMMARY_TITLE = 'ملخص الطلب';
export const REJECT_SUMMARY_LABEL = {
  employee: 'الموظف',
  requestId: 'رقم الطلب',
  version: 'الإصدار',
  leaveType: 'نوع الإجازة',
  startDate: 'تاريخ البدء',
  endDate: 'تاريخ الانتهاء',
  duration: 'المدة',
} as const;
export const REJECT_WARNING ='سيظهر سبب الرفض والتفاصيل التي تكتبها للموظف.';
export const REJECT_CATEGORY_LABEL = 'سبب الرفض';
export const REJECT_DETAILS_LABEL = 'تفاصيل إضافية';
export const REJECT_DETAILS_HINT = 'اختيارية، إلا عند اختيار أخرى. الحد الأقصى ٥٠٠ حرف.';
export const REJECT_CONFIRM = 'تأكيد الرفض';
export const REJECT_BUSY = 'جارٍ تسجيل الرفض…';
export const REJECT_CANCEL = 'إلغاء';
export const REJECT_CLOSE = 'إغلاق نافذة الرفض';
export const REJECT_SUCCESS = 'تم رفض الطلب وتسجيل السبب.';
export const REJECT_REFRESH = 'أغلق النافذة وراجع الطلب من جديد.';
export const REJECT_ERROR: Record<string, string> = {
  [RejectionFailure.CATEGORY_REQUIRED]: 'اختر سببًا واحدًا للرفض.',
  [RejectionFailure.INVALID_CATEGORY]: 'اختر سببًا من القائمة.',
  [RejectionFailure.DETAILS_REQUIRED]: 'اكتب تفاصيل توضح سبب اختيار أخرى.',
  [RejectionFailure.DETAILS_TOO_LONG]: 'يجب ألا تتجاوز التفاصيل ٥٠٠ حرف.',
  [RejectionFailure.STALE_VERSION]: 'تغيّرت نسخة الطلب. أغلق النافذة وراجع الطلب من جديد.',
  [RejectionFailure.UNAUTHORIZED]: 'ليست لديك صلاحية رفض هذا الطلب.',
  [RejectionFailure.NOT_FOUND]: 'لم يعد هذا الطلب متاحًا. أغلق النافذة وراجع القائمة.',
  [RejectionFailure.INVALID_STATE]: 'لم يعد هذا الطلب قابلًا للرفض من المدير.',
  [RejectionFailure.ACKNOWLEDGEMENT_REQUIRED]: 'ينقص الطلب إقرار تنبيه الرصيد ولا يمكن رفضه الآن.',
};
export const REJECT_GENERIC_ERROR = 'تعذر تسجيل الرفض. راجع حالة الطلب ثم أعد المحاولة.';
