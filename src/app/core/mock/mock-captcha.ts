const WIDTH = 200;
const HEIGHT = 70;
const NOISE_COLORS = ['#c0392b', '#2e86c1', '#8e44ad', '#d68910', '#1e8449'];

// پاسخ هر کد امنیتی با salt خودش نگه داشته می‌شود و فقط یک بار قابل استفاده است
const answers = new Map<string, number>();

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toLatinDigits(text: string): string {
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** یک سؤال ریاضی ساده، مثل سرور واقعی، به‌صورت تصویر JPEG. */
function drawCaptcha(text: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.direction = 'ltr';
  ctx.font = '600 32px Tahoma, sans-serif';
  ctx.textBaseline = 'middle';

  const gap = 3;
  const chars = [...text];
  const total = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width + gap, -gap);
  let x = (WIDTH - total) / 2;

  for (const ch of chars) {
    const w = ctx.measureText(ch).width;
    ctx.save();
    ctx.translate(x + w / 2, HEIGHT / 2 + randomInt(-4, 4));
    ctx.rotate((Math.random() - 0.5) * 0.4);
    ctx.fillStyle = '#5b5b5b';
    ctx.fillText(ch, -w / 2, 0);
    ctx.restore();
    x += w + gap;
  }

  // دایره‌های رنگی روی متن، شبیه نسخه‌ی سرور
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = NOISE_COLORS[i % NOISE_COLORS.length];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(randomInt(20, WIDTH - 20), randomInt(10, HEIGHT - 10), randomInt(10, 24), 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function createCaptcha(): { captcha: string; salt: string } {
  const a = randomInt(10, 99);
  const b = randomInt(1, 9);
  const salt = `captcha-${Date.now().toString(36)}-${randomInt(0, 1e9).toString(36)}`;
  answers.set(salt, a + b);
  return { captcha: drawCaptcha(`${a} + ${b} = ?`), salt };
}

export function checkCaptcha(salt: string, answer: string): boolean {
  const expected = answers.get(salt);
  answers.delete(salt);
  const value = toLatinDigits(answer).trim();
  return expected !== undefined && value !== '' && Number(value) === expected;
}
