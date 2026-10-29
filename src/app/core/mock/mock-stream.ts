import { mockStore } from './mock-store';

const LATENCY_MS = 250;
const CHUNK_DELAY_MS = 70;
// عمداً فرد است تا گاهی یک حرف فارسی (دو بایت) بین دو تکه بشکند، مثل شبکه‌ی واقعی
const CHUNK_BYTES = 9;

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(id);
      reject(abortError());
    };
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** جایگزین fetch برای POST /api/echo/stream: همان متن را تکه‌تکه برمی‌گرداند. */
export async function mockEchoStream(text: string, token: string, signal?: AbortSignal): Promise<Response> {
  await wait(LATENCY_MS, signal);

  if (!mockStore.isValidToken(token)) {
    return new Response(JSON.stringify({ detail: 'Unauthorized' }), { status: 401 });
  }

  const bytes = new TextEncoder().encode(text);
  let offset = 0;

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        await wait(CHUNK_DELAY_MS, signal);
      } catch (e) {
        controller.error(e);
        return;
      }
      if (offset >= bytes.length) {
        controller.close();
        return;
      }
      controller.enqueue(bytes.slice(offset, offset + CHUNK_BYTES));
      offset += CHUNK_BYTES;
    },
  });

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
