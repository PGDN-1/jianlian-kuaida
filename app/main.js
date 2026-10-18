'use strict';
/*
 * 简练快打 —— Electron 外壳
 * 职责：开一个没有地址栏的窗口、记住窗口大小位置、把用户数据放在 D 盘、单实例。
 * 页面本身仍然是 ../index.html 那一份（构建时复制到 renderer/），不含任何 Node 能力。
 */
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

/* ---------- 1. 用户数据目录：优先落在 D 盘 ---------- */
const DATA_DIRS = [
  'D:\\DS工作站\\typing-lab\\app-data',
  path.join(app.getPath('userData'))
];
function pickUserData() {
  for (let i = 0; i < DATA_DIRS.length; i++) {
    const dir = DATA_DIRS[i];
    try {
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, '.writable');
      fs.writeFileSync(probe, '1');
      fs.unlinkSync(probe);
      app.setPath('userData', dir);
      return dir;
    } catch (e) { /* 换下一个 */ }
  }
  return app.getPath('userData');
}
const USER_DATA = pickUserData();

/* ---------- 2. 单实例 ---------- */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  let win = null;

  const stateFile = () => path.join(USER_DATA, 'window-state.json');
  function loadState() {
    try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')) || {}; } catch (e) { return {}; }
  }
  function saveState(w) {
    try {
      if (!w || w.isDestroyed() || w.isMinimized() || w.isFullScreen()) return;
      const b = w.getNormalBounds();
      fs.writeFileSync(stateFile(), JSON.stringify(b));
    } catch (e) { /* 忽略 */ }
  }

  function createWindow() {
    const st = loadState();
    win = new BrowserWindow({
      width: st.width || 1200,
      height: st.height || 840,
      x: st.x,
      y: st.y,
      minWidth: 760,
      minHeight: 560,
      backgroundColor: '#0f1116',
      title: '简练快打',
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false
      }
    });

    Menu.setApplicationMenu(null);
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    win.once('ready-to-show', () => { win.show(); });
    win.on('resize', () => saveState(win));
    win.on('move', () => saveState(win));
    win.on('close', () => saveState(win));

    /* 外链一律走系统浏览器 */
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => {
      if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); }
    });

    /* F12 打开开发者工具，F11 全屏，方便排查问题 */
    win.webContents.on('before-input-event', (e, input) => {
      if (input.type !== 'keyDown') return;
      if (input.key === 'F12') { win.webContents.toggleDevTools(); e.preventDefault(); }
      if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    });

    win.on('closed', () => { win = null; });
  }

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('second-instance', () => {
    if (!win) { createWindow(); return; }
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
