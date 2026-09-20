# Antigravity Chinese (Antigravity_Chinese)

Google Antigravity 客户端深度汉化、解包逆向、防崩溃与全生命周期持久化方案及 AI 技能。

[English](#english) | [中文说明](#chinese)

---

<a name="chinese"></a>

## 中文说明

**Antigravity_Chinese (Chinesizing)** 是一套专为 Google Antigravity 桌面客户端打造的企业级全界面深度汉化方案与自主 AI 技能。彻底解决了传统外挂脚本导致的启动语法崩溃（`SyntaxError`）、下拉选项点击假死（`characterData` 微任务死循环）、受控组件键值脱节、悬停 Tooltip 闪回英文以及**退出重开变回英文**等顽疾，提供媲美官方原生的持久流畅体验。

本项目支持两种使用方式：
1. **作为 Antigravity 智能体技能 (`Chinesizing`)**：直接赋予 AI 自动化部署与维护能力。
2. **作为独立 Python 一键安装脚本**：脱离 Agent 直接在终端一键汉化。

---

### 核心特性 (v2.0 重大突破)

- 🌐 **全界面深度覆盖（424+ 精准词条）**：覆盖系统设置所有子页面、应用偏好、外观主题、模型与用量面板、MCP 服务管理、项目设置、会话历史列表以及顶部原生窗口菜单。
- 🔄 **全生命周期守卫（彻底攻克“重启/刷新失效”难题）**：
  - 在主进程注册 `app.on('web-contents-created')` 全局生命周期拦截网，全面监听 `dom-ready`、`did-finish-load` 与 `did-navigate-in-page`；
  - 在 `showOrCreateWindow` 唤醒链路中加入补救执行，保证从系统托盘唤醒时即刻保持汉化。
- ⚡ **纯值比对自愈引擎（弃用有害 WeakSet）**：
  - 弃用节点引用级的 `WeakSet` 永久黑名单，改用“纯值比对自愈”机制；SPA 路由跳转和异步组件重新渲染时自动毫秒级响应并汉化，绝不发生中途变回英文。
- 🧩 **内联切片文本（TextNode Fragmentation）精准缝合**：
  - 针对句子中间嵌套超链接（`<a>`）或 Badge 的复杂 DOM，细粒度切片匹配，杜绝半中半英。
- 🛡️ **彻底杜绝卡死与无限递归**：
  - 彻底剔除 `MutationObserver` 中的 `characterData` 监听，物理切断微任务事件风暴；
  - 引入 `isTranslating` 防重入原子锁，DOM 扫描耗时低于 0.001 秒。
- 🔄 **底层双向映射桥（Bidirectional Map Bridge）**：
  - 全局代理 `Map.prototype.has` 与 `get` 方法，使 Base UI / Radix UI 等受控组件在收到汉化中文时，能够无缝反查底层原生英文键名，彻底解决选项拒收与焦点挂死（Focus Trap）。
- 🔒 **严格语法门禁**：
  - 在沙箱临时目录中执行“提取 ➔ 注入 ➔ `node --check` 静态语法分析 ➔ 试打包 ➔ 沙箱解包验证”完整闭环，验证通过才执行原子替换。
- ⚡ **零感知极速热重载**：
  - 支持通过 Chrome DevTools 协议（CDP）对运行中的窗口进行热更新，无需立即重启客户端。

---

### 目录结构

```text
Antigravity_Chinese/
├── README.md                 # 说明文档（中英双语）
├── LICENSE                   # MIT 开源协议
├── requirements.txt          # 环境要求说明（无需额外第三方包）
├── .gitignore                # Git 忽略规则
├── scripts/                  # 独立安装脚本与数据
│   ├── deploy_chinese.py     # 自动化安装与打包部署脚本
│   ├── i18n_runner.js        # 渲染层注入引擎与双向映射桥
│   └── i18n_data.json        # 424+ 汉化词库与动态正则规则
└── skills/
    └── Chinesizing/          # Antigravity 智能体技能标准包
        ├── SKILL.md          # 汉化工程规范、避坑红线与操作手册
        ├── i18n_runner.js    # 技能配套注入引擎
        └── i18n_data.json    # 技能配套词库
```

---

### 快速开始

#### 方式一：作为 Antigravity 智能体技能使用（推荐）

1. 将本仓库中的 `skills/Chinesizing` 文件夹完整复制到您的 Antigravity 全局技能目录：
   - **Windows**: `%USERPROFILE%\.gemini\config\skills\Chinesizing\`
   - **macOS / Linux**: `~/.gemini/config/skills/Chinesizing/`
2. 打开 Antigravity 客户端，在任意对话中对智能体发送：
   > “请根据 Chinesizing 技能对当前客户端进行汉化部署”
3. 智能体将严格依照工程安全规范与门禁机制自动完成解包、注入与验证。

#### 方式二：独立 Python 一键脚本安装

如果您希望脱离 AI Agent 在终端直接一键汉化：

1. **克隆本仓库**：
   ```bash
   git clone https://github.com/shengmo520/Antigravity_Chinese.git
   cd Antigravity_Chinese
   ```

2. **运行安装脚本**：
   ```bash
   python scripts/deploy_chinese.py
   ```

脚本会自动检测系统中的 Antigravity 路径、自动生成 `app.asar.bak` 纯净备份、在沙箱中完成代码注入和语法分析，随后写入并自动重载界面。

> **提示（关于托盘常驻）**：Antigravity 默认在后台/系统托盘常驻运行。若直接关闭窗口后重新打开仍显示英文，只需在任务栏右下角托盘图标右键选择 **退出**（或在任务管理器结束残留进程）后重新打开客户端即可。

---

<a name="english"></a>

## English

**Antigravity_Chinese (Chinesizing)** is an enterprise-grade Chinese localization package and autonomous engineering skill designed specifically for Google Antigravity. It resolves startup crashes (`SyntaxError`), dropdown freezes caused by `characterData` microtask loops and Base UI key mismatch, tooltip flashing, and translation loss upon app reboot.

### Features
- **424+ Dictionary Entries & Dynamic Patterns**: Complete coverage across all Settings tabs, Models, Quotas, History, and Native Menus.
- **Full-Lifecycle WebContents Guard**: Hooks into `app.on('web-contents-created')` to keep localization persistent across refreshes, reboots, and new windows.
- **Value-Matching Self-Healing**: Resilient against React SPA route transitions and re-renders without memory leaks.
- **Bidirectional Map Bridge**: Seamlessly reverse-maps localized strings back to English keys for Base UI / Radix UI dropdowns.
- **Automated Syntax Gatekeeper**: Strict `node --check` static analysis before patching any production bundle.

### Quick Start (Standalone Script)

```bash
git clone https://github.com/shengmo520/Antigravity_Chinese.git
cd Antigravity_Chinese
python scripts/deploy_chinese.py
```

---

## 开源协议 (License)

本项目采用 [MIT License](LICENSE) 开源协议。

## 免责声明 (Disclaimer)

本项目仅供个人学习与界面本地化效率优化研究使用，非 Google 官方产品，亦未获得官方背书。
