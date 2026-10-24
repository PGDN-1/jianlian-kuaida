'use strict';
/* 把 ../index.html（唯一真身）+ PWA 资源复制到 renderer/，打包时只打 renderer 里的副本 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');          // 仓库根目录
const src = path.join(root, 'index.html');
const outDir = path.resolve(__dirname, '..', 'renderer');
const out = path.join(outDir, 'index.html');

if (!fs.existsSync(src)) {
  console.error('[copy-renderer] 找不到源文件：' + src);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, out);

/* PWA 资源一并复制：manifest / service worker / 图标（桌面版用不到，但与网页版保持一致） */
['../manifest.webmanifest', '../sw.js', '../icons'].forEach(function (rel) {
  const from = path.resolve(__dirname, rel);
  const to = path.join(outDir, path.basename(rel));
  try {
    if (fs.statSync(from).isDirectory()) fs.cpSync(from, to, { recursive: true });
    else fs.copyFileSync(from, to);
  } catch (e) { /* 资源缺失就跳过 */ }
});

const kb = (Buffer.byteLength(fs.readFileSync(out, 'utf8'), 'utf8') / 1024).toFixed(1);
console.log('[copy-renderer] ' + src + '  ->  ' + out + '  (' + kb + ' KB)');
