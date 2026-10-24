'use strict';
/*
 * 生成 PWA / 站点图标（零依赖，只用到 Node 内置 zlib）
 *   icons/icon-192.png            任意用途
 *   icons/icon-512.png            任意用途
 *   icons/icon-maskable-512.png   Android 自适应图标（图形控制在中央 80% 安全区内）
 *   icons/icon-180.png            iOS apple-touch-icon
 *   icons/icon.svg                矢量版（favicon / manifest）
 * 用法：node tools/make-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve(__dirname, '..', 'icons');
const BG = [0x2f, 0x6f, 0x5e];   // --accent 深绿
const FG = [0xff, 0xff, 0xff];   // 白
const BAR = [0x7f, 0xd7, 0xb2];  // 亮绿

/* ---------- 最小 PNG 编码器 ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const row = y * (1 + w * 4);
    raw[row] = 0; // filter: none
    rgba.copy(raw, row + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- 像素画布 ---------- */
function canvas(size) {
  const px = Buffer.alloc(size * size * 4);
  return {
    size,
    set(x, y, c) {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      const i = (y * size + x) * 4;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
    },
    rect(x0, y0, w, h, c) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c);
    },
    roundRect(x0, y0, w, h, r, c) {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          const cx = Math.min(Math.max(x, x0 + r), x0 + w - r);
          const cy = Math.min(Math.max(y, y0 + r), y0 + h - r);
          const dx = x - cx, dy = y - cy;
          if (dx * dx + dy * dy <= r * r + 1) this.set(x, y, c);
        }
      }
    },
    glyph(cols, ox, oy, s, c) { // 位图字符：cols 为字符串数组
      for (let r = 0; r < cols.length; r++) {
        for (let q = 0; q < cols[r].length; q++) {
          if (cols[r][q] === '1') this.rect(ox + q * s, oy + r * s, s, s, c);
        }
      }
    },
    px
  };
}

/* 5x7 位图 "T" 和光标竖条 */
const T_GLYPH = [
  '11111',
  '00100',
  '00100',
  '00100',
  '00100',
  '00100',
  '00100'
];
const CARET = ['1', '1', '1', '1', '1', '1'];

function drawIcon(size, opts) {
  const cv = canvas(size);
  const R = Math.round(size * (opts.rounded ? 0.22 : 0));
  if (opts.rounded) cv.roundRect(0, 0, size, size, R, BG);
  else cv.rect(0, 0, size, size, BG);

  /* 图形控制在中央 safeRatio 范围内 */
  const safe = Math.round(size * opts.safe);
  const inner = size - safe * 2;
  const gs = Math.floor(inner / 9);           // 位图像素边长
  const gw = 5 * gs, gh = 7 * gs;
  const ox = Math.round((size - gw) / 2);
  const oy = Math.round(safe + (inner - gh - gs * 2) / 2);
  cv.glyph(T_GLYPH, ox, oy, gs, FG);
  /* 光标竖条 */
  cv.glyph(CARET, ox + gw + gs, oy + gs, gs, BAR);
  return encodePng(size, size, cv.px);
}

fs.mkdirSync(OUT, { recursive: true });
const files = [
  ['icon-192.png', 192, { rounded: true, safe: 0 }],
  ['icon-512.png', 512, { rounded: true, safe: 0 }],
  ['icon-maskable-512.png', 512, { rounded: false, safe: 0.10 }],
  ['icon-180.png', 180, { rounded: true, safe: 0 }]
];
for (const [name, size, opts] of files) {
  fs.writeFileSync(path.join(OUT, name), drawIcon(size, opts));
  console.log('[make-icons] ' + name + ' (' + size + 'x' + size + ')');
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="简练快打">
  <rect width="512" height="512" rx="112" fill="#2f6f5e"/>
  <text x="236" y="352" font-family="Georgia,'Times New Roman',serif" font-size="320" font-weight="700" fill="#ffffff" text-anchor="middle">T</text>
  <rect x="352" y="240" width="34" height="170" rx="14" fill="#7fd7b2"/>
</svg>
`;
fs.writeFileSync(path.join(OUT, 'icon.svg'), svg, 'utf8');
console.log('[make-icons] icon.svg');
console.log('[make-icons] done -> ' + OUT);
