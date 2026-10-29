import { Task } from '../models/task.model';

const STORAGE_KEY = 'idi_mock_backend';

// مثل سرور واقعی، داده‌های نشستی که یک ساعت بی‌استفاده بماند پاک می‌شود
const SESSION_TTL_MS = 60 * 60 * 1000;

export interface MockSession {
  nextId: number;
  tasks: Task[];
  touchedAt: number;
}

type MockState = Record<string, MockSession>;

// اگر localStorage در دسترس نباشد (مثلاً حالت خصوصی)، داده فقط در حافظه می‌ماند
let memoryState: MockState = {};

function readState(): MockState {
  let state: MockState;
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as MockState;
  } catch {
    state = memoryState;
  }

  const now = Date.now();
  for (const [token, session] of Object.entries(state)) {
    if (now - session.touchedAt > SESSION_TTL_MS) delete state[token];
  }
  return state;
}

function writeState(state: MockState): void {
  memoryState = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ذخیره نشد؛ نسخه‌ی حافظه کافی است
  }
}

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'mock.' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** وضعیت «سرور» شبیه‌سازی‌شده: هر توکن، فهرست تسک‌های خودش را دارد. */
export const mockStore = {
  createSession(): string {
    const state = readState();
    const token = randomToken();
    state[token] = { nextId: 1, tasks: [], touchedAt: Date.now() };
    writeState(state);
    return token;
  },

  isValidToken(token: string | null | undefined): boolean {
    return !!token && Object.hasOwn(readState(), token);
  },

  /** تغییرات روی نشست را ذخیره می‌کند. برای توکن نامعتبر null برمی‌گرداند. */
  update<T>(token: string, fn: (session: MockSession) => T): T | null {
    const state = readState();
    if (!Object.hasOwn(state, token)) return null;
    const session = state[token];

    const result = fn(session);
    session.touchedAt = Date.now();
    writeState(state);
    return result;
  },
};
