import { HttpErrorResponse } from '@angular/common/http';

export interface AppError {
  status: number;
  message: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.',
  404: 'مورد موردنظر پیدا نشد.',
  422: 'اطلاعات واردشده معتبر نیست.',
  503: 'سرویس تسک‌ها در دسترس نیست. کمی بعد دوباره تلاش کنید.',
};

export function toAppError(error: unknown): AppError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return { status: 0, message: 'اتصال به سرور برقرار نشد. اینترنت یا آدرس سرور را بررسی کنید.' };
    }
    return {
      status: error.status,
      message: STATUS_MESSAGES[error.status] ?? 'خطای غیرمنتظره‌ای رخ داد.',
    };
  }
  return { status: -1, message: 'خطای غیرمنتظره‌ای رخ داد.' };
}