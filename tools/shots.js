#!/usr/bin/env node
/*
 * 工具：为「简练快打 / TypeLab」生成投稿用运行截图。
 *
 * 原理：读取 index.html，在 </body> 前注入一段驱动脚本（直接调用应用的真实
 * 函数：start / sync / openStats / openSettings / openModal 等），再用本地
 * Edge 无头模式截图。截的是应用真实运行画面，不是模拟图。
 *
 * 用法：node tools/shots.js
 * 输出：docs/shots/*.png（1440x900）
 * 依赖：系统已安装 Microsoft Edge（Windows 自带）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const url = require('url');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TMP = path.join(ROOT, '.shots-tmp');
const OUT = path.join(ROOT, 'docs', 'shots');

const EDGE_CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const EDGE = EDGE_CANDIDATES.find((p) => fs.existsSync(p));
if (!EDGE) {
  console.error('找不到 Microsoft Edge，请先安装或修改 EDGE_CANDIDATES');
  process.exit(1);
}

/* ---- 每个画面的驱动脚本（注入到页面里执行） ---- */
const DRIVERS = {
  '01-en-typing': `
    /* 英文看打：输入到一半，故意留一个错字展示标红，喂入实时速度条采样 */
    start();
    var q = cur(), t = strip(q.text);
    var keep = Math.max(3, t.length - 2);
    var pre = t.slice(0, keep);
    $('hidden').value = pre.slice(0, -1) + (pre.slice(-1) === 'a' ? 's' : 'a');
    sync();
    S.t0 = Date.now() - 1600;
    for (var i = 0; i < 12; i++) sparkData.push(26 + i * 2.1 + (i % 3 === 0 ? -5 : 0));
    drawSpark(); renderStats();
  `,
  '02-zh-pinyin': `
    /* 中文拼音：切到中文标签（真实点击，走完整切换逻辑），打前几个音节 */
    document.querySelector('#tabs button[data-tab="zh"]').click();
    var q = cur(), t = strip(q.text);
    $('hidden').value = t.slice(0, Math.max(2, t.length - 2));
    sync();
    S.t0 = Date.now() - 1800;
    for (var i = 0; i < 12; i++) sparkData.push(30 + i * 2.2);
    drawSpark(); renderStats();
  `,
  '03-poem-scroll': `
    /* 诗词跟打：汉字模式；关闭乱序并把最长的一首排到最前，只打 40% 保持在句中 */
    S.shuffle = false; savePrefs();
    POEMS.sort(function (a, b) { return b.text.length - a.text.length; });
    S.zhInput = 'hz';
    document.querySelector('#tabs button[data-tab="poem"]').click();
    var q = cur(), t = strip(q.text);
    $('hidden').value = t.slice(0, Math.max(4, Math.floor(t.length * 0.4)));
    sync();
    if (_rt && _rt.curEl && _rt.curEl.scrollIntoView) {
      try { _rt.curEl.scrollIntoView({ block: 'center' }); } catch (e) {}
    }
  `,
  '04-dark-mode': `
    /* 深色模式 + 英文打字中 */
    setDark('dark');
    start();
    var q = cur(), t = strip(q.text);
    var keep = Math.max(3, t.length - 2);
    var pre = t.slice(0, keep);
    $('hidden').value = pre.slice(0, -1) + (pre.slice(-1) === 'e' ? 'r' : 'e');
    sync();
    S.t0 = Date.now() - 1600;
    for (var i = 0; i < 12; i++) sparkData.push(24 + i * 2.4);
    drawSpark(); renderStats();
  `,
  '05-stats': `
    /* 成绩统计弹窗：预置 14 条历史记录 + 各标签最佳 */
    var now = Date.now(), recs = [];
    var tabs = ['en','en','zh','en','poem','zh','en','zh','en','en','poem','zh','en','zh'];
    for (var i = 0; i < 14; i++) {
      var tab = tabs[i];
      recs.push({
        ts: now - (13 - i) * 7 * 3600e3 - (i % 3) * 600e3,
        tab: tab,
        mode: tab === 'poem' ? 'poem' : 'type',
        src: tab === 'en' ? (i % 4 === 3 ? 'cet4s' : 'cet4') : (tab === 'zh' ? 'zh' : 'poem'),
        cnt: tab === 'en' ? 10 : 20,
        done: 10, total: 10,
        chars: tab === 'en' ? 260 + i * 12 : 210 + i * 9,
        speed: 34 + Math.round(i * 2.1 + (i % 3) * 2),
        acc: 99 - (i % 4) * 2 - (i % 5 === 0 ? 3 : 0),
        sec: 58 + i * 2.2
      });
    }
    save(K.hist, recs);
    save(K.best, {
      en: { speed: 63, acc: 99, ts: now - 86400e3 * 2 },
      zh: { speed: 52, acc: 98, ts: now - 3600e3 * 20 },
      poem: { speed: 41, acc: 96, ts: now - 3600e3 * 6 }
    });
    renderBest();
    openStats();
  `,
  '06-settings': `
    /* 设置弹窗：外观模式 / 键盘音效 / 字号 */
    openSettings();
  `,
  '07-mistakes': `
    /* 错题本弹窗：预置 9 条错题（含跳过/看答案类型） */
    var now = Date.now();
    save(K.miss, [
      { t: 'abandon', hint: 'v. 放弃；抛弃', lang: 'en', kind: 'error', n: 5, ts: now - 3600e3 },
      { t: 'phenomenon', hint: 'n. 现象', lang: 'en', kind: 'error', n: 4, ts: now - 7200e3 },
      { t: 'conscientious', hint: 'adj. 认真的', lang: 'en', kind: 'error', n: 3, ts: now - 9000e3 },
      { t: 'nevertheless', hint: 'adv. 然而', lang: 'en', kind: 'skip', n: 2, ts: now - 12000e3 },
      { t: 'sophisticated', hint: 'adj. 复杂的', lang: 'en', kind: 'reveal', n: 2, ts: now - 15000e3 },
      { t: 'pursuit', hint: 'n. 追求', lang: 'en', kind: 'error', n: 1, ts: now - 18000e3 },
      { t: '人工智能', hint: 'artificial intelligence', lang: 'zh', kind: 'error', n: 3, ts: now - 20000e3 },
      { t: '蒸蒸日上', hint: 'flourishing', lang: 'zh', kind: 'error', n: 2, ts: now - 22000e3 },
      { t: '问渠那得清如许', hint: '观书有感', lang: 'poem', kind: 'error', n: 1, ts: now - 24000e3 }
    ]);
    openModal();
  `,
  '08-share-card': `
    /* 成绩分享卡片：与 shareCard() 相同的 canvas 绘制，改为在页面居中展示 */
    var now = Date.now();
    save(K.hist, [{ ts: now, tab: 'en', mode: 'type', src: 'cet4', cnt: 10, done: 10, total: 10, chars: 412, speed: 68, acc: 97, sec: 63.5 }]);
    save(K.best, { en: { speed: 71, acc: 98, ts: now - 86400e3 } });
    renderBest();
    var r = histAll()[histAll().length - 1];
    var W = 1080, H = 608;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    var bg = effBg(), dark = luma(bg) < 0.52;
    var fg = dark ? shade(bg, .88) : '#1c1c1a';
    var muted = dark ? shade(bg, .60) : '#66665e';
    var accent = dark ? '#63c2a4' : '#2f6f5e';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 10);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = fg; ctx.font = '600 36px ' + CANVAS_SANS;
    ctx.fillText('TypeLab · 打字实验室', 64, 96);
    ctx.font = '24px ' + CANVAS_SANS; ctx.fillStyle = muted;
    ctx.fillText('简练快打 — 单文件离线打字练习', 64, 134);
    ctx.fillStyle = fg; ctx.font = '700 148px ' + CANVAS_SANS;
    ctx.fillText(String(r.speed), 64, 306);
    var spW = ctx.measureText(String(r.speed)).width;
    ctx.font = '600 40px ' + CANVAS_SANS; ctx.fillStyle = accent;
    ctx.fillText('WPM', 64 + spW + 20, 306);
    ctx.font = '30px ' + CANVAS_SANS; ctx.fillStyle = fg;
    ctx.fillText('正确率 ' + r.acc + '% · 用时 ' + r.sec + 's · 完成 ' + r.done + '/' + r.total + ' 题', 64, 374);
    ctx.font = '26px ' + CANVAS_SANS; ctx.fillStyle = muted;
    ctx.fillText('英文 · 看英文打字 · 四级 · ' + new Date(r.ts).toLocaleString('zh-CN'), 64, 422);
    ctx.font = '22px ' + CANVAS_SANS;
    ctx.fillText('github.com/PGDN-1/jianlian-kuaida', 64, H - 52);
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(20,20,18,.55);display:flex;align-items:center;justify-content:center;z-index:80';
    cv.style.cssText = 'width:min(94vw,1080px);height:auto;border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.4)';
    wrap.appendChild(cv); document.body.appendChild(wrap);
  `
};

function shoot(name, driver) {
  const page = HTML.replace('</body>', '<script>\n' + driver + '\n</script>\n</body>');
  const htmlPath = path.join(TMP, name + '.html');
  const pngPath = path.join(OUT, name + '.png');
  fs.writeFileSync(htmlPath, page, 'utf8');

  const fileUrl = url.pathToFileURL(htmlPath).href;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--mute-audio',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--lang=zh-CN',
    '--window-size=1440,900',
    '--virtual-time-budget=6000',
    '--screenshot=' + pngPath,
    fileUrl
  ];
  execFileSync(EDGE, args, { stdio: 'pipe', timeout: 60000 });
  const ok = fs.existsSync(pngPath) && fs.statSync(pngPath).size > 2000;
  console.log((ok ? 'ok  ' : 'FAIL') + '  ' + name + '.png' + (ok ? '  (' + fs.statSync(pngPath).size + ' bytes)' : ''));
  return ok;
}

fs.mkdirSync(TMP, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

/* 用法：node tools/shots.js [画面名...]，不带参数则全部重截 */
const only = process.argv.slice(2);
const names = only.length ? Object.keys(DRIVERS).filter((n) => only.indexOf(n) >= 0) : Object.keys(DRIVERS);
if (!names.length) {
  console.error('没有匹配的画面。可选：' + Object.keys(DRIVERS).join(', '));
  process.exit(1);
}

let allOk = true;
for (const name of names) {
  try {
    allOk = shoot(name, DRIVERS[name]) && allOk;
  } catch (e) {
    console.log('FAIL  ' + name + '  ' + String(e.message).split('\n')[0]);
    allOk = false;
  }
}

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
console.log(allOk ? 'all shots done' : 'some shots failed');
process.exit(allOk ? 0 : 1);
