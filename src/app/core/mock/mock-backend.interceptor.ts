import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpParams,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { mergeMap, of, throwError, timer } from 'rxjs';
import { Task, TaskInput } from '../models/task.model';
import { checkCaptcha, createCaptcha } from './mock-captcha';
import { mockStore } from './mock-store';

// تأخیر شبیه‌سازی‌شده‌ی شبکه تا حالت‌های بارگذاری هم دیده شوند
const LATENCY_MS = 250;

interface MockResult {
  status: number;
  body?: unknown;
}

interface ValidationIssue {
  type: string;
  loc: (string | number)[];
  msg: string;
}

type TaskMode = 'create' | 'replace' | 'patch';

const STATUS_TEXT: Record<number, string> = {
  401: 'Unauthorized',
  404: 'Not Found',
  405: 'Method Not Allowed',
  422: 'Unprocessable Entity',
};

const ok = (body: unknown, status = 200): MockResult => ({ status, body });
const unauthorized = (detail = 'Unauthorized'): MockResult => ({ status: 401, body: { detail } });
const notFound = (detail = 'Not Found'): MockResult => ({ status: 404, body: { detail } });
const methodNotAllowed: MockResult = { status: 405, body: { detail: 'Method Not Allowed' } };
const invalid = (issues: ValidationIssue[]): MockResult => ({ status: 422, body: { detail: issues } });

/**
 * همان قرارداد API سرور (طبق openapi.json) را داخل مرورگر پیاده می‌کند تا نسخه‌ی
 * منتشرشده بدون بک‌اند کار کند. فقط درخواست‌های /api/ را جواب می‌دهد.
 */
export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  const path = new URL(req.url, location.origin).pathname;
  if (!path.startsWith('/api/')) {
    return next(req);
  }

  return timer(LATENCY_MS).pipe(
    mergeMap(() => {
      const result = handle(req, path);
      if (result.status >= 400) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: result.status,
              statusText: STATUS_TEXT[result.status] ?? 'Error',
              error: result.body,
              url: req.url,
            }),
        );
      }
      return of(new HttpResponse({ status: result.status, body: result.body ?? null, url: req.url }));
    }),
  );
};

function handle(req: HttpRequest<unknown>, path: string): MockResult {
  if (path === '/api/auth/login') {
    if (req.method === 'GET') return ok(createCaptcha());
    if (req.method === 'POST') return login(req.body);
    return methodNotAllowed;
  }

  if (path === '/api/tasks' || path.startsWith('/api/tasks/')) {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? null;
    if (!token || !mockStore.isValidToken(token)) return unauthorized();
    return tasks(req, path, token);
  }

  return notFound();
}

// ───── احراز هویت ─────

function login(body: unknown): MockResult {
  const src = asRecord(body);
  const fields = ['username', 'password', 'salt', 'captcha_answer'] as const;

  const issues: ValidationIssue[] = [];
  for (const field of fields) {
    const value = src[field];
    if (typeof value !== 'string') {
      issues.push({ type: 'missing', loc: ['body', field], msg: 'Field required' });
    } else if (value.length === 0) {
      issues.push({ type: 'string_too_short', loc: ['body', field], msg: 'String should have at least 1 character' });
    }
  }
  if (issues.length) return invalid(issues);

  const { username, password, salt, captcha_answer } = src as Record<(typeof fields)[number], string>;
  // کد امنیتی همیشه مصرف می‌شود، حتی اگر نام کاربری اشتباه باشد
  const captchaOk = checkCaptcha(salt, captcha_answer);
  if (!captchaOk || username !== 'admin' || password !== 'admin') {
    return unauthorized('Invalid credentials');
  }

  return ok({ access_token: mockStore.createSession(), token_type: 'bearer' });
}

// ───── تسک‌ها ─────

function tasks(req: HttpRequest<unknown>, path: string, token: string): MockResult {
  const rest = path.slice('/api/tasks'.length).replace(/^\//, '');

  if (rest === '') {
    if (req.method === 'GET') return listTasks(token, req.params);
    if (req.method === 'POST') return createTask(token, req.body);
    return methodNotAllowed;
  }

  if (!/^\d+$/.test(rest)) {
    return invalid([
      { type: 'int_parsing', loc: ['path', 'task_id'], msg: 'Input should be a valid integer' },
    ]);
  }
  const id = Number(rest);

  switch (req.method) {
    case 'GET':
      return withTask(token, id, (task) => ok(task));
    case 'PUT':
      return updateTask(token, id, req.body, 'replace');
    case 'PATCH':
      return updateTask(token, id, req.body, 'patch');
    case 'DELETE':
      return mockStore.update(token, (session) => {
        const index = session.tasks.findIndex((t) => t.id === id);
        if (index === -1) return notFound('Task not found');
        session.tasks.splice(index, 1);
        return ok(null, 204);
      }) ?? unauthorized();
    default:
      return methodNotAllowed;
  }
}

function listTasks(token: string, params: HttpParams): MockResult {
  const completedParam = params.get('completed');
  const q = params.get('q');

  const issues: ValidationIssue[] = [];
  if (completedParam !== null && completedParam !== 'true' && completedParam !== 'false') {
    issues.push({ type: 'bool_parsing', loc: ['query', 'completed'], msg: 'Input should be a valid boolean' });
  }
  if (q !== null && (q.length < 1 || q.length > 120)) {
    issues.push({ type: 'string_too_long', loc: ['query', 'q'], msg: 'String should have 1 to 120 characters' });
  }
  if (issues.length) return invalid(issues);

  const needle = q?.toLocaleLowerCase('fa');
  return mockStore.update(token, (session) =>
    ok(
      session.tasks.filter((task) => {
        if (completedParam !== null && task.completed !== (completedParam === 'true')) return false;
        if (!needle) return true;
        return (
          task.title.toLocaleLowerCase('fa').includes(needle) ||
          task.description.toLocaleLowerCase('fa').includes(needle)
        );
      }),
    ),
  ) ?? unauthorized();
}

function createTask(token: string, body: unknown): MockResult {
  const { value, issues } = validateTask(body, 'create');
  if (issues.length) return invalid(issues);

  return mockStore.update(token, (session) => {
    const now = new Date().toISOString();
    const task: Task = {
      id: session.nextId++,
      title: value.title ?? '',
      description: value.description ?? '',
      completed: value.completed ?? false,
      created_at: now,
      updated_at: now,
    };
    session.tasks.push(task);
    return ok(task, 201);
  }) ?? unauthorized();
}

function updateTask(token: string, id: number, body: unknown, mode: TaskMode): MockResult {
  const { value, issues } = validateTask(body, mode);
  if (issues.length) return invalid(issues);

  return withTask(token, id, (task) => {
    Object.assign(task, value, { updated_at: new Date().toISOString() });
    return ok(task);
  });
}

function withTask(token: string, id: number, fn: (task: Task) => MockResult): MockResult {
  return mockStore.update(token, (session) => {
    const task = session.tasks.find((t) => t.id === id);
    return task ? fn(task) : notFound('Task not found');
  }) ?? unauthorized();
}

/** قوانین TaskCreate / TaskReplace / TaskPatch در openapi.json. */
function validateTask(body: unknown, mode: TaskMode): { value: Partial<TaskInput>; issues: ValidationIssue[] } {
  const src = asRecord(body);
  const required = mode === 'replace' ? ['title', 'description', 'completed'] : mode === 'create' ? ['title'] : [];
  const value: Partial<TaskInput> = {};
  const issues: ValidationIssue[] = [];

  for (const field of ['title', 'description', 'completed'] as const) {
    const raw = src[field];
    const loc = ['body', field];

    if (raw === undefined || (mode === 'patch' && raw === null)) {
      if (required.includes(field)) issues.push({ type: 'missing', loc, msg: 'Field required' });
      continue;
    }

    if (field === 'completed') {
      if (typeof raw === 'boolean') value.completed = raw;
      else issues.push({ type: 'bool_type', loc, msg: 'Input should be a valid boolean' });
      continue;
    }

    if (typeof raw !== 'string') {
      issues.push({ type: 'string_type', loc, msg: 'Input should be a valid string' });
      continue;
    }

    const max = field === 'title' ? 120 : 2000;
    if (field === 'title' && raw.length < 1) {
      issues.push({ type: 'string_too_short', loc, msg: 'String should have at least 1 character' });
    } else if (raw.length > max) {
      issues.push({ type: 'string_too_long', loc, msg: `String should have at most ${max} characters` });
    } else {
      value[field] = raw;
    }
  }

  return { value, issues };
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}
