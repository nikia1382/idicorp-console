// خروجی build را به‌صورت یک commit تازه در شاخه‌ی gh-pages همان مخزن origin منتشر می‌کند.
// پیش از اجرا: npm run build:pages
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join('dist', 'idicorp-console', 'browser');
if (!existsSync(join(outDir, '404.html'))) {
  console.error('Build output is missing. Run "npm run build:pages" first.');
  process.exit(1);
}

const git = (args, cwd = '.') => execFileSync('git', args, { cwd, stdio: 'inherit' });
const remote = execFileSync('git', ['remote', 'get-url', 'origin']).toString().trim();
const source = execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();

// مخزن موقت داخل پوشه‌ی خروجی؛ بعد از انتشار پاک می‌شود
rmSync(join(outDir, '.git'), { recursive: true, force: true });
try {
  git(['init', '-q', '-b', 'gh-pages'], outDir);
  git(['add', '-A'], outDir);
  git(['commit', '-q', '-m', `Deploy ${source} to GitHub Pages`], outDir);
  git(['push', '--force', remote, 'gh-pages'], outDir);
  console.log('Published to the gh-pages branch.');
} finally {
  rmSync(join(outDir, '.git'), { recursive: true, force: true });
}
