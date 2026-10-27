import { Injectable } from '@angular/core';
import { environment } from '../../../../environment';
import { TOKEN_STORAGE_KEY } from './auth.service';

/**
 * بدنه‌ی متنی را به سرور می‌فرستد و تکه‌های پاسخ را همان لحظه صدا می‌زند.
 * هر تکه یک رشته‌ی UTF-8 است. چون ممکن است یک کاراکتر فارسی بین دو تکه
 * بشکند، از TextDecoder با stream: true استفاده می‌کنیم.
 */
@Injectable({ providedIn: 'root' })
export class StreamService {
  async echo(
    text: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      throw new Error('نشست شما معتبر نیست. لطفاً دوباره وارد شوید.');
    }

    const response = await fetch(`${environment.apiBaseUrl}/api/echo/stream`, {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: text,
    });

    if (response.status === 401) {
      throw new Error('احراز هویت انجام نشد. دوباره وارد شوید.');
    }
    if (!response.ok) {
      throw new Error(`خطای سرور (${response.status}).`);
    }
    if (!response.body) {
      throw new Error('پاسخی از سرور دریافت نشد.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }

    // باقی‌مانده‌ی بایت‌های ناقص را هم تخلیه می‌کنیم
    const tail = decoder.decode();
    if (tail) onChunk(tail);
  }
}