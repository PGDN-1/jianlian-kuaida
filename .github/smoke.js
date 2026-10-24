// 简练快打 · 冒烟测试
// 在 GitHub Actions（ubuntu + node 22 + jsdom）里加载 index.html，确认页面能跑起来、
// 各词库数据没有在改动中丢失、内置长句里的每个单词都能查到释义。
// v2.0 起新增：整组练习的集成测试（模拟击键打完一组，检查历史成绩落库）、
//             增量渲染复用 DOM 的断言、v2 功能存在性检查。
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e && e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/typing-lab/',
  virtualConsole: vc,
});
const w = dom.window;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function fail(msg) {
  console.error('FAIL: ' + msg);
  process.exit(1);
}

(async () => {
  await sleep(800);

  if (errors.length) fail('页面运行时报错：' + errors.join(' | '));

  const n = expr => w.eval(expr);

  const checks = [
    ['四级词库', n('CET4.length'), 900],
    ['六级词库', n('CET6.length'), 900],
    ['牛津词库', n('OXFORD.length'), 2900],
    ['补充词库', n('EXTRA.length'), 150],
    ['长句（四级）', n('CET4S.length'), 200],
    ['长句（六级）', n('CET6S.length'), 200],
    ['音标词性表', n('Object.keys(LEX).length'), 4000],
  ];
  for (const [name, got, min] of checks) {
    if (!(got >= min)) fail(`${name} 只有 ${got} 条，少于预期的 ${min}`);
    console.log(`ok  ${name}: ${got}`);
  }

  const sources = [...w.document.getElementById('source').options].map(o => o.textContent);
  if (sources.length !== 5) fail('词库下拉框应该有 5 项，实际：' + sources.join(' | '));
  console.log('ok  下拉框: ' + sources.join(' | '));

  // 牛津词必须全部有音标和词性
  const missing = n('OXFORD.filter(function(x){return !ipaOf(x.t) || !posOf(x.t);}).map(function(x){return x.t;}).slice(0,5)');
  if (missing.length) fail('牛津词缺音标/词性：' + missing.join(','));
  console.log('ok  牛津词音标词性全覆盖');

  // 内置长句里的每个单词都要能查到（变形也要能还原）
  const unresolved = n(`(function(){
    var toks = {}, all = CET4S.concat(CET6S), bad = [];
    all.forEach(function (s) {
      String(s.t).split(/\\s+/).forEach(function (t) {
        if (!/[A-Za-z]/.test(t) || toks[t]) return;
        toks[t] = 1;
        if (wordInfo(t).miss) bad.push(t);
      });
    });
    return bad;
  })()`);
  if (unresolved.length) fail('长句里有查不到的词：' + unresolved.slice(0, 10).join(', '));
  console.log('ok  长句单词全部可查（含复数/过去式等变形）');

  // 诗词拼音与中文词库
  if (n('ZHWORDS.length') < 60) fail('中文词语太少: ' + n('ZHWORDS.length'));
  const noPy = n('POEMS.filter(function(p){return !p.py;}).length');
  if (noPy) console.log('warn 有 ' + noPy + ' 首诗词没有拼音数据');
  else console.log('ok  诗词拼音全覆盖');

  /* ---------- v2.0：新功能存在性 ---------- */
  const v2fns = ['sndPlay', 'setSnd', 'pushHistory', 'histAll', 'shareCard', 'drawSpark', 'paintStats', 'openStats', 'effBg', 'setDark'];
  for (const fn of v2fns) {
    if (n('typeof ' + fn) !== 'function') fail('v2 函数缺失: ' + fn);
  }
  console.log('ok  v2 函数齐全: ' + v2fns.join(', '));

  if (!/rel="manifest"/.test(html)) fail('缺少 manifest 链接');
  if (!w.document.getElementById('statsBtn')) fail('缺少「成绩」按钮');
  if (!w.document.getElementById('spark')) fail('缺少实时速度条');
  if (!Array.isArray(n('histAll()')) || n('histAll().length') !== 0) fail('历史成绩初始应为空数组');
  if (n('SND.on') !== false) fail('键盘音效应默认关闭');
  console.log('ok  manifest / 成绩按钮 / 速度条 / 音效默认关');

  /* ---------- v2.0：增量渲染复用 DOM ---------- */
  n("S.tab='en'; S.source.en='cet4'; S.mode.en='type'; S.count.en=5; start();");
  await sleep(60);
  const firstSpan = w.document.querySelector('#target .ch');
  if (!firstSpan) fail('首题没有渲染出字符');
  const firstText = n('strip(S.qs[0].text)');
  if (!firstText.length) fail('首题文本为空');
  // 输入第一个字符
  w.eval(`$('hidden').value = ${JSON.stringify(firstText.charAt(0))}`);
  w.document.getElementById('hidden').dispatchEvent(new w.Event('input', { bubbles: true }));
  await sleep(30);
  const spanAfter = w.document.querySelector('#target .ch');
  if (spanAfter !== firstSpan) fail('增量渲染失效：击键后 DOM 被整体重建');
  if (w.document.querySelectorAll('#target .ch.ok').length !== 1) fail('打对一个字符后 .ok 应为 1');
  // 再输入一个字符，仍然复用
  w.eval(`$('hidden').value = ${JSON.stringify(firstText.slice(0, 2))}`);
  w.document.getElementById('hidden').dispatchEvent(new w.Event('input', { bubbles: true }));
  await sleep(30);
  if (w.document.querySelector('#target .ch') !== firstSpan) fail('增量渲染失效：第二个字符后 DOM 被重建');
  console.log('ok  增量渲染：击键后复用同一批 DOM 节点');

  /* ---------- v2.0：模拟打完一整组，历史成绩应落库 ---------- */
  n("S.tab='en'; S.source.en='cet4'; S.mode.en='type'; S.count.en=5; S.shuffle=false; start();");
  await sleep(60);
  for (let k = 0; k < 5; k++) {
    const txt = n(`strip(S.qs[S.i].text)`);
    if (!txt || !txt.length) fail(`第 ${k + 1} 题没有文本`);
    w.eval(`$('hidden').value = ${JSON.stringify(txt)}`);
    w.document.getElementById('hidden').dispatchEvent(new w.Event('input', { bubbles: true }));
    await sleep(420);
  }
  await sleep(700);
  if (n('S.phase') !== 'done') fail('五题后应进入 done 阶段，实际: ' + n('S.phase'));
  const hist = n('histAll()');
  if (hist.length !== 1) fail('历史成绩应为 1 条，实际: ' + hist.length);
  const rec = hist[0];
  if (rec.done !== 5 || rec.total !== 5) fail('历史记录题数不对: ' + JSON.stringify(rec));
  if (typeof rec.speed !== 'number' || typeof rec.acc !== 'number') fail('历史记录速度/正确率缺失');
  if (rec.tab !== 'en' || rec.src !== 'cet4') fail('历史记录分类/词库不对');
  if (n('S.errs') !== 0) fail('全对应零错误，实际: ' + n('S.errs'));
  console.log('ok  集成测试：打完 5 题一组，历史成绩正确落库（速度 ' + rec.speed + ' / 正确率 ' + rec.acc + '%）');

  /* ---------- v2.0：设置弹窗可打开（音效/深色） ---------- */
  n('openSettings()');
  await sleep(50);
  if (!w.document.getElementById('setSndOn')) fail('设置弹窗缺少音效开关');
  if (!w.document.getElementById('setDarkSeg')) fail('设置弹窗缺少外观模式');
  n('setDark("dark")');
  if (n('effBg()') !== '#1b1b18') fail('深色模式背景应为 #1b1b18');
  n('setDark("light")');
  if (n('effBg()') !== '#f8f8f6') fail('浅色模式背景应为 #f8f8f6');
  n('setSnd(true, 0.5)');
  if (n('SND.on') !== true || n('SND.vol') !== 0.5) fail('音效开关/音量设置失败');
  n('closeModal()');
  console.log('ok  设置弹窗：外观模式切换 / 音效开关');

  /* ---------- v2.0：成绩弹窗可渲染 ---------- */
  n('openStats()');
  await sleep(50);
  if (!w.document.getElementById('histBody')) fail('成绩弹窗缺少主体');
  if (!w.document.querySelector('#histBody .sum')) fail('成绩弹窗缺少汇总');
  if (!w.document.querySelector('#histBody .hist')) fail('成绩弹窗缺少最近成绩列表');
  n('closeModal()');
  console.log('ok  成绩弹窗：汇总 + 最近成绩渲染');

  if (errors.length) fail('运行后期出现报错：' + errors.join(' | '));

  console.log('all checks passed');
  process.exit(0);
})().catch(e => fail(e && e.stack || String(e)));
