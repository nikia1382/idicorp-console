import { Injectable, OnDestroy, signal } from '@angular/core';
import { environment } from '../../../../environment';
import { TOKEN_STORAGE_KEY } from './auth.service';

export type EchoStatus = 'idle' | 'connecting' | 'ready' | 'closed';

export interface EchoMessage {
  id: number;
  direction: 'sent' | 'received';
  text: string;
  at: Date;
}

@Injectable({ providedIn: 'root' })
export class EchoWsService implements OnDestroy {
  private socket: WebSocket | null = null;
  private nextId = 1;

  readonly status = signal<EchoStatus>('idle');
  readonly messages = signal<EchoMessage[]>([]);
  readonly error = signal<string | null>(null);

  connect(): void {
    if (this.socket) return;

    this.error.set(null);
    this.status.set('connecting');

    const ws = new WebSocket(environment.echoWsUrl);
    this.socket = ws;

    ws.onmessage = (event: MessageEvent<string>) => {
      let data: { type?: string; error?: string } | null = null;
      try {
        data = JSON.parse(event.data);
      } catch {
        // پاسخ متنی ساده است، نه JSON
      }

      // پیام آماده‌باش را از پژواک متن جدا می‌کنیم
      if (data?.type === 'ready') {
        this.status.set('ready');
        return;
      }

      this.append('received', event.data);
    };

    ws.onerror = () => {
      if (this.socket === ws) {
        this.error.set('اتصال با سرویس پژواک برقرار نشد.');
      }
    };

    ws.onclose = () => {
      if (this.socket !== ws) return;
      this.socket = null;
      this.status.set('closed');
    };
  }

  send(text: string): void {
    if (!this.socket || this.status() !== 'ready') {
      this.error.set('هنوز به سرویس متصل نیستید.');
      return;
    }

    this.error.set(null);
    this.socket.send(text);
    this.append('sent', text);
  }

  clear(): void {
    this.messages.set([]);
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

  private append(direction: 'sent' | 'received', text: string): void {
    const entry: EchoMessage = { id: this.nextId++, direction, text, at: new Date() };
    this.messages.update((list) => [...list, entry]);
  }
}