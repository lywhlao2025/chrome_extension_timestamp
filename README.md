# Timestamp Helper (Chrome Extension)

简洁的时间戳/时区转换工具，支持多时区列表与双向编辑，可作为 React 页面运行，也可以以 Chrome 扩展弹窗方式使用。

## 功能
- 输入秒或毫秒时间戳，一键转换为多时区时间。
- 支持在任何一行直接编辑时间，自动反算时间戳并同步其他时区。
- 预设常用时区，支持新增/删除自定义时区，数据存储在 `localStorage`。
- 高亮最近变更的输入框，并提供轻量 toast 提示。

## 技术栈
- React 18 + TypeScript
- Vite 构建
- Tailwind 风格的 utility class（通过 `className` 使用）
- 原生 `localStorage` 持久化

## 快速开始（React 页面）
```bash
npm install
npm run dev
```
打开终端输出的本地地址（默认 `http://localhost:5173`）查看。

## 作为 Chrome 扩展使用
1. `npm install`（首次）。
2. 如需构建产物，可执行 `npm run build`，产物在 `dist/`。
3. 打开 Chrome 扩展页面 `chrome://extensions`，开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择项目根目录（包含 `manifest.json`）。
5. 点击工具栏扩展图标，即可使用弹窗版本。

## 代码结构
```
├─ src/                 # React 主应用
│  ├─ App.tsx           # 核心逻辑：解析时间戳、多时区显示与双向编辑
│  ├─ index.css         # 全局样式与高亮
│  └─ main.tsx          # React 入口
├─ popup.html/.css/.js  # Chrome 扩展弹窗版本
├─ manifest.json        # 扩展清单
├─ icons/               # 扩展图标
├─ public/              # 静态资源
├─ vite.config.ts       # Vite 配置
└─ tailwind.config.js   # Tailwind 配置
```

## 脚本
- `npm run dev`：本地开发。
- `npm run build`：生产构建。
- `npm run preview`：本地预览构建产物。

## 交互要点
- 行内编辑会反算时间戳并同步所有时区。
- 预设时区避免重复，可新增自定义时区。
- 最近变更的行会高亮，便于确认操作。

有改进想法欢迎提交 issue/PR。

## 支持 / Support
如觉得工具有帮助，欢迎扫码鼓励（WeChat / Alipay）：

**WeChat**  
<img src="public/pay/wechat.JPG" alt="WeChat Pay" width="140" />

**Alipay**  
<img src="public/pay/ali.JPG" alt="Alipay" width="140" />
