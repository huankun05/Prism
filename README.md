<p align="center">
  <img src="app/icon.svg" width="72" alt="Prism" />
</p>

<h1 align="center">Prism</h1>

<p align="center">
  <strong>用组件拼界面；让 AI 直接改画布；导出多套技术栈提示词。</strong><br/>
  <em>An AI-operable UI design canvas — sketch semantic screens, edit them with MCP agents, export coding prompts.</em>
</p>

<p align="center">
  <a href="https://github.com/huankun05/Prism"><img alt="Repo" src="https://img.shields.io/badge/repo-huankun05%2FPrism-6750A4?logo=github&logoColor=white" /></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61DAFB" />
  <img alt="i18n" src="https://img.shields.io/badge/i18n-zh%20%7C%20en-AADDFF" />
</p>

## 这是什么

Prism 是一个**浏览器里的 UI 设计画布**，强调三件事：

1. **语义组件** — 按钮、顶栏、列表、表单……不是像素涂鸦  
2. **AI 可操作** — 外部 AI 工具通过协议生成/修改设计 JSON，画布打开即预览  
3. **面向实现** — 一键整理布局，导出给 AI 编程工具的提示词（Android / Web）

> 定位不是「另一个 Figma」，而是 **AI 时代的设计中间层**。

## 开发

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm test
npm run build      # 静态导出到 ./out
```

静态站点部署。若放在 GitHub Pages 项目站点，请在构建时设置 `NEXT_PUBLIC_BASE_PATH=/Prism`。`.github/workflows/deploy.yml` 会在推送到 `main` 时自动完成。

## 文档与工程

- **文档索引：** [docs/README.md](docs/README.md)  
- **进度 / 下一步：** [docs/PROGRESS.md](docs/PROGRESS.md) · [docs/方案-下一阶段.md](docs/方案-下一阶段.md)  
- **流程：** 方案 → 实现 → 自检 → 测试 → 文档 → 提交（[docs/工程规范.md](docs/工程规范.md)）  
- **设计系统：** [public/design-system.md](public/design-system.md)  
- **Bridge / MCP：** [prism-bridge/README.md](prism-bridge/README.md)  

## 路线（摘要）

| 阶段 | 内容 |
|------|------|
| 0 | 底座：跑通、改名 Prism、默认中文 |
| 1 | 本地项目库 |
| 2 | MCP Bridge + AI 实时改画布 |
| 3 | 个人样式层 |
| 4 | 图标/组件资源库 |
| 5 | 多设计系统 Pack |
| 6+ | 自控同步、模板、桌面壳（后置） |

完整方案见 [docs/开发方案.md](docs/product/开发方案.md)。

## 多语言

- 默认：**中文**  
- 保留：English 切换  
- 暂留：日本語 / 한국어（文案仍在，翻译扩展暂缓）

## 致谢与许可

- 基座来自 [m3e-canvas](https://github.com/lnkiai/m3e-canvas)（**MIT © lnkiai**）。本仓库为衍生项目，保留 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。  
- Loading 指示器相关形状/动画模型来自 [material-components-android](https://github.com/material-components/material-components-android)（Apache-2.0）等，详见 NOTICE。  
- 图标：[Material Symbols](https://fonts.google.com/icons)（Apache-2.0）。

Prism 本项目代码：MIT。
