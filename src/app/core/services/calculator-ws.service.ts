import { Injectable, OnDestroy, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { openMockSocket } from '../mock/mock-socket';
import { TOKEN_STORAGE_KEY } from './auth.service';

export type CalcOperation = 'add' | 'subtract' | 'multiply' | 'divide';
export type ConnectionStatus = 'idle' | 'connecting' | 'ready' | 'closed';

interface ServerMessage {
  type?: string;
  result?: number;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CalculatorWsService implements OnDestroy {
  private socket: WebSocket | null = null;

  readonly status = signal<ConnectionStatus>('idle');
  readonly result = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  connect(): void {
    if (this.socket) return;

    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      this.status.set('closed');
      this.error.set('نشست شما معتبر نیست. لطفاً دوباره وارد شوید.');
      return;
    }

    this.error.set(null);
    this.result.set(null);
    this.status.set('connecting');

    const ws = environment.mockBackend
      ? openMockSocket(environment.calculatorWsUrl)
      : new WebSocket(environment.calculatorWsUrl);
    this.socket = ws;

    // سرور مهلت یک‌ثانیه‌ای دارد، پس توکن را بلافاصله بعد از اتصال می‌فرستیم
    ws.onopen = () => ws.send(JSON.stringify({ token }));

    ws.onmessage = (event: MessageEvent<string>) => this.handleMessage(event.data);

    ws.onerror = () => {
      if (this.socket === ws) {
        this.error.set('اتصال با سرویس ماشین‌حساب برقرار نشد.');
      }
    };

    ws.onclose = () => {
      if (this.socket !== ws) return;
      this.socket = null;
      this.status.set('closed');
    };
  }

  compute(operation: CalcOperation, numbers: number[]): void {
    if (!this.socket || this.status() !== 'ready') {
      this.error.set('هنوز به سرویس متصل نیستید.');
      return;
    }

    this.error.set(null);
    this.result.set(null);
    this.socket.send(JSON.stringify({ operation, numbers }));
  }

  disconnect(): void {
    const ws = this.socket;
    this.socket = null;
    ws?.close();
    this.status.set('idle');
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private handleMessage(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      this.error.set('پاسخ نامعتبر از سرور دریافت شد.');
      return;
    }

    if (msg.type === 'ready') {
      this.status.set('ready');
      return;
    }

    if (typeof msg.result === 'number') {
      this.result.set(msg.result);
      return;
    }

    if (msg.error === 'Unauthorized') {
      this.error.set('احراز هویت انجام نشد. دوباره وارد شوید.');
      return;
    }

    // در این خطا سرور اتصال را باز نگه می‌دارد
    if (msg.error === 'Invalid calculator request') {
      this.error.set('درخواست نامعتبر است. ورودی‌ها را بررسی کنید.');
    }
  }
}