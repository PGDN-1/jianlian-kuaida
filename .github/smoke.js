// 简练快打 · 冒烟测试
// 在 GitHub Actions（ubuntu + node 22 + jsdom）里加载 index.html，确认页面能跑起来、
// 各词库数据没有在改动中丢失、内置长句里的每个单词都能查到释义。
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

  console.log('all checks passed');
  process.exit(0);
})().catch(e => fail(e && e.stack || String(e)));
