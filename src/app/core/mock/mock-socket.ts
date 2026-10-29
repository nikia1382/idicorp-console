import { mockStore } from './mock-store';

// تأخیر شبیه‌سازی‌شده‌ی شبکه برای هر پیام
const LATENCY_MS = 120;
// سرور واقعی اگر توکن ظرف یک ثانیه نرسد اتصال را می‌بندد
const AUTH_DEADLINE_MS = 1000;

const CONNECTING = 0;
const OPEN = 1;
const CLOSED = 3;

/** سمت «سرور» یک اتصال: پیام می‌فرستد و می‌تواند اتصال را ببندد. */
interface Peer {
  send(payload: string | object): void;
  close(code?: number): void;
}

interface MockServer {
  connected(peer: Peer): void;
  received(peer: Peer, data: string): void;
}

/** بخشی از API WebSocket که سرویس‌ها استفاده می‌کنند. */
class MockWebSocket {
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  readyState = CONNECTING;

  private readonly peer: Peer = {
    send: (payload) => {
      const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
      setTimeout(() => {
        if (this.readyState === OPEN) this.onmessage?.(new MessageEvent('message', { data }));
      }, LATENCY_MS);
    },
    // بعد از پیام‌های در صف بسته می‌شود
    close: (code = 1000) => setTimeout(() => this.finish(code), LATENCY_MS),
  };

  constructor(private readonly server: MockServer) {
    setTimeout(() => {
      if (this.readyState !== CONNECTING) return;
      this.readyState = OPEN;
      this.onopen?.(new Event('open'));
      this.server.connected(this.peer);
    }, LATENCY_MS);
  }

  send(data: string): void {
    if (this.readyState !== OPEN) {
      throw new DOMException('WebSocket is not open.', 'InvalidStateError');
    }
    setTimeout(() => {
      if (this.readyState === OPEN) this.server.received(this.peer, String(data));
    }, LATENCY_MS);
  }

  close(code = 1000): void {
    this.finish(code);
  }

  private finish(code: number): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    setTimeout(() => this.onclose?.(new CloseEvent('close', { code, wasClean: true })));
  }
}

function parseJson(data: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(data);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** همان قوانینی که سرور برای درخواست ماشین‌حساب دارد؛ برای ورودی نامعتبر null. */
function calculate(msg: Record<string, unknown> | null): number | null {
  const numbers = msg?.['numbers'];
  if (!Array.isArray(numbers) || numbers.length === 0 || numbers.length > 100) return null;
  if (!numbers.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1e12)) {
    return null;
  }

  const values = numbers as number[];
  const [first, ...rest] = values;
  let result: number;
  switch (msg?.['operation']) {
    case 'add':
      result = values.reduce((a, b) => a + b, 0);
      break;
    case 'subtract':
      result = rest.reduce((a, b) => a - b, first);
      break;
    case 'multiply':
      result = values.reduce((a, b) => a * b, 1);
      break;
    case 'divide':
      if (rest.some((n) => n === 0)) return null;
      result = rest.reduce((a, b) => a / b, first);
      break;
    default:
      return null;
  }
  return Number.isFinite(result) ? result : null;
}

function calculatorServer(): MockServer {
  let authenticated = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;

  const reject = (peer: Peer) => {
    peer.send({ error: 'Unauthorized' });
    peer.close(1008);
  };

  return {
    connected(peer) {
      deadline = setTimeout(() => {
        if (!authenticated) reject(peer);
      }, AUTH_DEADLINE_MS);
    },
    received(peer, data) {
      const msg = parseJson(data);

      if (!authenticated) {
        clearTimeout(deadline);
        const token = msg?.['token'];
        if (typeof token === 'string' && mockStore.isValidToken(token)) {
          authenticated = true;
          peer.send({ type: 'ready' });
        } else {
          reject(peer);
        }
        return;
      }

      const result = calculate(msg);
      // در این خطا سرور اتصال را باز نگه می‌دارد
      peer.send(result === null ? { error: 'Invalid calculator request' } : { result });
    },
  };
}

function echoServer(): MockServer {
  return {
    connected(peer) {
      peer.send({ type: 'ready' });
    },
    received(peer, data) {
      peer.send(data);
    },
  };
}

/** جایگزین new WebSocket(url) برای ws/calculator و ws/echo. */
export function openMockSocket(url: string): WebSocket {
  const server = url.endsWith('/ws/calculator') ? calculatorServer() : echoServer();
  return new MockWebSocket(server) as unknown as WebSocket;
}
