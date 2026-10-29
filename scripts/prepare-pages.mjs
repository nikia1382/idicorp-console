// خروجی build را برای GitHub Pages آماده می‌کند.
// - 404.html: GitHub Pages برای مسیرهایی مثل /tasks این فایل را برمی‌گرداند تا مسیریاب Angular کار کند.
// - .nojekyll: جلوی پردازش Jekyll را می‌گیرد تا همه‌ی فایل‌ها همان‌طور منتشر شوند.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join('dist', 'idicorp-console', 'browser');
const index = join(outDir, 'index.html');

if (!existsSync(index)) {
  console.error(`index.html not found in ${outDir}. Run the build first.`);
  process.exit(1);
}

copyFileSync(index, join(outDir, '404.html'));
writeFileSync(join(outDir, '.nojekyll'), '');
console.log(`GitHub Pages files ready in ${outDir}`);
