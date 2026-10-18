'use strict';
/* 把 ../index.html（唯一真身）复制到 renderer/，打包时只打 renderer 里的副本 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');          // D:\DS工作站\typing-lab
const src = path.join(root, 'index.html');
const outDir = path.resolve(__dirname, '..', 'renderer');
const out = path.join(outDir, 'index.html');

if (!fs.existsSync(src)) {
  console.error('[copy-renderer] 找不到源文件：' + src);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
const html = fs.readFileSync(src, 'utf8');
fs.writeFileSync(out, html, 'utf8');
const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
console.log('[copy-renderer] ' + src + '  ->  ' + out + '  (' + kb + ' KB)');
