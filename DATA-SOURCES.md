# 数据来源与授权说明

本项目代码以 MIT 协议开源（见 `LICENSE`），但内置的**词库、音标、词性、诗句**来自不同来源，授权状态各不相同，下面逐项写清楚。

## 1. 四六级词表与长句

- `CET4` / `CET6` / `CET4S` / `CET6S`：本项目自行整理编写。释义、例句均为自己撰写或改写，**不是任何官方大纲或真题的原文**。
- 长句按近十年四六级翻译、写作常见话题自行编写，仅供练习打字使用。

## 2. 牛津核心 3000

- 词头（headword）取自 [Oxford 3000™ 词表](https://www.oxfordlearnersdictionaries.com/wordlist/english/oxford3000/)，整理文件参考开源仓库 [ittuann/The-Oxford-5000-Word-Lists](https://github.com/ittuann/The-Oxford-5000-Word-Lists)。
- **中文释义由本项目自行撰写**，不是牛津官方释义。官方释义、例句、发音均受版权保护，本项目一概未收录。
- 「Oxford」是 Oxford University Press 的商标，本项目与 OUP 无关联，仅作为词表来源说明使用。

## 3. 音标（IPA）

- 牛津核心词中不与四六级重合的部分，音标取自 [open-dict-data/ipa-dict](https://github.com/open-dict-data/ipa-dict)（**MIT 协议**），美式发音优先。
- 四六级词条的音标为手工录入校对。

## 4. 词性（POS）

- 牛津词条的部分词性由 [WordNet 3.1](https://wordnet.princeton.edu/)（Princeton University，**WordNet License**，可自由使用与再分发）按义项数推断，功能词与少量例外手工补齐。
- 可能存在个别词性与牛津词典标注不一致的情况，属数据推断误差，不影响打字练习。

## 5. 中文词语与拼音

- `ZHWORDS` 的词语、英文释义、带声调拼音均为本项目自行整理编写。

## 6. 古诗词

- `POEMS` 收录 72 首唐诗宋词，均为**公有领域**作品（作者逝世逾千年）。
- 英文大意与拼音标注为本项目自行撰写。

## 7. 图标与字体

- 应用图标 `app/build/icon.png`、`icon.ico` 由 `app/build/make_icon.py` 用 Pillow 生成为本项目原创，随 MIT 协议发布。
- 页面不加载任何外部字体或 CDN 资源，全部使用系统字体栈。

## 8. 运行环境

- 桌面版外壳使用 [Electron](https://www.electronjs.org/)（MIT，打包分发包中附带其 LICENSE 文件）。
- 网页版不依赖任何第三方 JS 库。

## 再次分发时请注意

如果你要重新分发本项目（尤其是内置词库的部分），请保留本文件，并注意：牛津词表词头、WordNet、ipa-dict 各自的授权条款适用于对应数据部分；本次 MIT 授权仅覆盖本项目自己编写的代码与文字。
