# Timestamp Helper (Chrome Extension)

简洁的时间戳/时区转换工具，支持多时区列表与双向编辑；可作为 React 页面运行，也可以作为 Chrome 扩展弹窗使用。  
A simple timestamp/timezone helper with multi-timezone lists and bidirectional editing; works as a React page and as a Chrome extension popup.

## 功能 Features
- 输入秒或毫秒时间戳，一键转换为多时区时间。  
  Enter seconds/ms timestamp and convert to multiple time zones in one click.
- 支持行内编辑，自动反算时间戳并同步其他时区。  
  Edit any row to back-calc the base timestamp and sync all zones.
- 预设常用时区，可新增/删除自定义时区，数据存储在 `localStorage`。  
  Preset zones plus add/remove custom zones; data stored in `localStorage`.
- 最近变更高亮 + 轻量 toast 提示。  
  Highlights recent changes and shows lightweight toasts.
- **i18n**：支持中文/英文（随浏览器语言切换）。  
  **i18n**: Chinese/English via browser locale.

## 技术栈 Tech Stack
- React 18 + TypeScript  
- Vite  
- Tailwind-style utility classes via `className`  
- `localStorage` for simple persistence

## 快速开始 (React 页面) Quick Start
```bash
npm install
npm run dev
```
打开终端输出的本地地址（默认 `http://localhost:5173`）查看。  
Open the local URL from the terminal (default `http://localhost:5173`).

## 作为 Chrome 扩展使用 As a Chrome Extension
1. `npm install`（首次） / first time.  
2. `npm run build`，产物在 `dist/`.  
3. 打开 `chrome://extensions`，开启“开发者模式”。  
   Open `chrome://extensions`, enable Developer Mode.  
4. “加载已解压的扩展程序”并选择包含 `manifest.json` 的目录（可指向 dist 或将 dist 拷到根）。  
   “Load unpacked” and select the folder containing `manifest.json` (dist or root with dist files).
5. 点击工具栏图标使用弹窗。  
   Click the toolbar icon to open the popup.

## 代码结构 Code Structure
```
├─ src/                 # React app
│  ├─ App.tsx           # 核心逻辑 core logic
│  ├─ index.css         # 全局样式 styles
│  └─ main.tsx          # 入口 entry
├─ components/          # Toast, ConfirmModal, TimeRow 等 UI
├─ data/                # 预设时区 presets
├─ i18n/                # 文案 strings
├─ services/            # storage 等
├─ utils/               # 时间解析/格式化等工具
├─ popup.html/.css/.js  # 扩展弹窗入口
├─ icons/               # 扩展图标
├─ _locales/            # i18n manifest 文案
├─ manifest.json        # 扩展清单
└─ dist/                # 构建产物 build output
```

## 脚本 Scripts
- `npm run dev`：本地开发 / dev server  
- `npm run build`：生产构建 / production build  
- `npm run preview`：本地预览构建产物 / preview build

## 交互要点 UX Notes
- 行内编辑会反算时间戳并同步所有时区；只有点击“转换”才会刷新。  
  Inline edits back-calc the timestamp and sync zones; “Convert” triggers refresh.
- 预设时区防重复，可新增自定义时区。  
  Presets avoid duplicates; custom zones allowed.
- 高亮最近变更，便于确认操作。  
  Highlights recent changes for clarity.

有改进想法欢迎提交 issue/PR。  
Issues/PRs are welcome.

## 支持 / Support
如觉得工具有帮助，欢迎扫码鼓励（WeChat / Alipay）：

**WeChat**  
<img src="public/pay/wechat.JPG" alt="WeChat Pay" width="140" />

**Alipay**  
<img src="public/pay/ali.JPG" alt="Alipay" width="140" />
