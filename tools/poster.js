#!/usr/bin/env node
/*
 * 工具：生成投稿封面图（1200x630 @2x = 2400x1260 PNG）。
 * 用 Edge 无头模式渲染一张静态海报页后截图，与 tools/shots.js 同一套路。
 * 用法：node tools/poster.js   输出：docs/shots/cover.png
 */
'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'docs', 'shots');
const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const EDGE = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
if (!EDGE) { console.error('找不到 Microsoft Edge'); process.exit(1); }

const PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; background: #f8f8f6; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; overflow: hidden; }
  .wrap { width: 1200px; height: 630px; padding: 56px 60px; display: flex; gap: 48px; }
  .left { width: 560px; display: flex; flex-direction: column; }
  .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 34px; }
  .logo { width: 40px; height: 40px; border-radius: 10px; background: #2f6f5e; color: #fff; font: 700 22px/40px Georgia, serif; text-align: center; }
  .brand b { font-size: 17px; color: #1c1c1a; letter-spacing: .02em; }
  .brand span { font-size: 13px; color: #66665e; margin-left: 2px; }
  h1 { font-size: 64px; color: #1c1c1a; letter-spacing: .04em; line-height: 1.1; }
  h1 em { font-style: normal; color: #2f6f5e; }
  .tag { margin-top: 16px; font-size: 19px; color: #3f3f38; line-height: 1.55; }
  .chips { margin-top: 26px; display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { font-size: 13px; color: #2f6f5e; background: #e7efe9; border: 1px solid #cfe0d6; border-radius: 999px; padding: 5px 13px; }
  .foot { margin-top: auto; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #66665e; }
  .foot .dot { width: 6px; height: 6px; border-radius: 50%; background: #2f6f5e; }
  .right { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: center; }
  .frame { width: 100%; background: #fff; border-radius: 14px; box-shadow: 0 24px 60px rgba(28, 28, 26, .16); overflow: hidden; border: 1px solid #e6e6de; }
  .bar { height: 34px; background: #f1f1eb; display: flex; align-items: center; gap: 6px; padding: 0 12px; border-bottom: 1px solid #e6e6de; }
  .bar i { width: 9px; height: 9px; border-radius: 50%; background: #d8d8d0; }
  .bar i:first-child { background: #e06c5b; } .bar i:nth-child(2) { background: #e3b341; } .bar i:nth-child(3) { background: #6fb86a; }
  .bar u { margin-left: 10px; font: 11px/34px Consolas, monospace; color: #8c8c84; text-decoration: none; }
  .frame .zoom { width: 100%; height: 330px; overflow: hidden; background: #fff; }
  .frame .zoom img { display: block; width: 1440px; height: 900px; transform: scale(.62); transform-origin: 0 0; margin: -37px 0 0 -37px; }
</style></head><body>
  <div class="wrap">
    <div class="left">
      <div class="brand"><div class="logo">T</div><b>TypeLab</b><span>打字实验室</span></div>
      <h1>简练<em>快打</em></h1>
      <div class="tag">一个 HTML 文件，离线可用的打字练习场<br>中英诗词 · 六种模式 · 成绩统计 · PWA</div>
      <div class="chips">
        <span class="chip">单文件零依赖</span><span class="chip">离线可用</span>
        <span class="chip">中文拼音 / 英文 / 诗词</span><span class="chip">看打 · 听写 · 默写</span>
        <span class="chip">成绩曲线</span><span class="chip">错题本</span>
        <span class="chip">键盘音效</span><span class="chip">深色模式</span>
      </div>
      <div class="foot"><span class="dot"></span>github.com/PGDN-1/jianlian-kuaida<span class="dot"></span>v2.0.0</div>
    </div>
    <div class="right">
      <div class="frame">
        <div class="bar"><i></i><i></i><i></i><u>pgdn-1.github.io/jianlian-kuaida/</u></div>
        <div class="zoom"><img src="01-en-typing.png" alt=""></div>
      </div>
    </div>
  </div>
</body></html>`;

const htmlPath = path.join(SHOTS, '.poster.html');
const pngPath = path.join(SHOTS, 'cover.png');
fs.writeFileSync(htmlPath, PAGE, 'utf8');

execFileSync(EDGE, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--force-device-scale-factor=2',
  '--window-size=1200,630',
  '--virtual-time-budget=4000',
  '--screenshot=' + pngPath,
  url.pathToFileURL(htmlPath).href
], { stdio: 'pipe', timeout: 60000 });

fs.unlinkSync(htmlPath);
const ok = fs.existsSync(pngPath) && fs.statSync(pngPath).size > 5000;
console.log((ok ? 'ok  ' : 'FAIL') + '  cover.png  (' + fs.statSync(pngPath).size + ' bytes)');
process.exit(ok ? 0 : 1);
