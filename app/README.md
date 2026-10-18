# 简练快打 · 桌面版（Electron 外壳）

这个目录只是一个**外壳**：页面本体始终是上一层的 `../index.html`，构建时会被复制到 `renderer/index.html`，所以改功能只改 `../index.html` 那一份，不要改 `renderer/` 里的副本。

## 目录

```
app/
├─ main.js                 Electron 主进程：窗口、单实例、窗口位置记忆、数据目录
├─ package.json            依赖与打包配置（electron-builder）
├─ .npmrc                  npm 缓存与镜像都指向 D 盘
├─ scripts/copy-renderer.js  把 ../index.html 复制到 renderer/
├─ build/
│  ├─ make_icon.py         用 Pillow 生成图标
│  ├─ icon.png (1024)      源图
│  └─ icon.ico             打包用（16–256 多尺寸）
├─ renderer/index.html     构建产物（自动生成，勿手改）
└─ node_modules/           ~284 个包
```

## 常用命令

在 `app` 目录下执行。**注意：不能直接用 `D:\DS工作站\...` 这个中文路径构建**——NSIS 的 makensis 在 ANSI 模式下打不开中文路径下的输出文件，WiX 也一样。可行的做法是先用 `subst` 把项目映射成一个纯英文盘符：

```powershell
subst X: "D:\DS工作站\typing-lab"     # 之后用 X:\app 指代本项目
New-Item -ItemType Directory -Force X:\tmp | Out-Null

$env:TEMP='X:\tmp'; $env:TMP='X:\tmp'
$env:ELECTRON_CACHE='D:\DS工作站\.cache\electron'
$env:ELECTRON_BUILDER_CACHE='D:\DS工作站\.cache\electron-builder'
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://npmmirror.com/mirrors/electron-builder-binaries/'
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'

Set-Location X:\app
npx electron-builder --win nsis portable --x64 --config.directories.output=X:\out
```

产物 `X:\out\*.exe` 是英文名（`jianlian-kuaida-setup-1.0.0.exe` / `-portable-1.0.0.exe`），复制到 `X:\dist\` 时再改成中文名：

```powershell
Copy-Item X:\out\jianlian-kuaida-setup-1.0.0.exe    X:\dist\简练快打-安装版-1.0.0.exe
Copy-Item X:\out\jianlian-kuaida-portable-1.0.0.exe X:\dist\简练快打-便携版-1.0.0.exe
```

为什么 `artifactName` 必须用英文：NSIS 打包时输出文件名带中文会直接报 `Can't open output file`。

## 产物

`D:\DS工作站\typing-lab\dist\`

- `简练快打-安装版-1.0.0.exe`：NSIS 安装包，可选安装目录，自带桌面/开始菜单快捷方式
- `简练快打-便携版-1.0.0.exe`：单文件绿色版，双击即用，不写注册表
- `win-unpacked\`：解包目录，调试用

## 数据放在哪

主进程会把 Chromium 的用户数据目录指向 **`D:\DS工作站\typing-lab\app-data`**（不可写时自动回退到系统默认位置）。里面包含：

- `Local Storage\` —— 成绩、错题本、自定义词库、外观设置（就是页面里的 `typelab.*` 键）
- `window-state.json` —— 上次的窗口大小和位置

网页版和桌面版是两套独立数据。搬家方法：网页版里「设置 → 数据备份 → 导出备份」，桌面版里同样位置「导入备份」。

## 已知取舍

- 体积：Electron 自带 Chromium，安装包 ~106MB、装完 ~450MB。要 5–10MB 的版本得换 Tauri，但本机没有 MSVC 链接器和 Rust 工具链，装它们需要管理员权限与数 GB 空间。
- 未做代码签名，首次运行 Windows SmartScreen 会提示「未知发布者」，点「更多信息 → 仍要运行」即可。要消掉这个提示需要买代码签名证书。
- 没有自动更新。升级就是重新下载新版安装包覆盖安装（用户数据在 app-data，不受影响）。
- **验证状态**：安装包、便携版、`win-unpacked` 都已成功产出；`app.asar` 里确认含 `main.js`、`package.json`、`renderer/index.html`；exe 的版本信息为「简练快打 / 1.0.0 / li」，图标已嵌入。但在本机 agent 的沙箱里**无法真正启动 GUI**（Chromium 的 crashpad 报 `not connected`、进程立刻退出，这是沙箱限制，不是应用问题），所以「双击能正常开窗」这一步需要人工确认一次。
