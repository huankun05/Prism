# Prism 文档索引

> 仓库：https://github.com/huankun05/Prism  
> 更新纪律：方案/决策/进度先于或随代码提交；见 `工程规范.md`。

## 快速入口

| 文档 | 何时看 |
|------|--------|
| [PROGRESS.md](./PROGRESS.md) | **当前状态、下一步、变更日志** |
| [工程规范.md](./工程规范.md) | 动代码前的流程与红线 |
| [product/DECISIONS.md](./product/DECISIONS.md) | 产品决策（形态、同步、多设备…） |
| [product/开发方案.md](./product/开发方案.md) | 总路线（阶段 0–8） |
| [方案-下一阶段.md](./方案-下一阶段.md) | **马上要做什么** |

## 已完成阶段方案

| 阶段 | 文档 |
|------|------|
| 0 底座 | 见 PROGRESS（品牌/中文） |
| 1 项目库 | [方案-阶段1](./方案-阶段1-本地项目库.md) · [调研](./调研-本地项目库.md) |
| 2 Bridge/MCP | [方案-阶段2](./方案-阶段2-MCP桥.md) · [prism-bridge/README](../prism-bridge/README.md) |

## 专项方案与规范

| 文档 | 内容 |
|------|------|
| [方案-多设备适配](./方案-多设备适配.md) | 手机/平板/桌面：风格一套、结构分家族 |
| [../public/design-system.md](../public/design-system.md) | 生成与画布共用的设计系统（间距/色/密度/设备） |
| [product/调研-AI操作UI画布](./product/调研-AI操作UI画布与同类产品.md) | 同类产品与 AI 操作画布 |
| [product/开源UI与组件策略](./product/开源UI与组件策略.md) | 组件从哪来、怎么做出好结果 |

## 本地怎么跑

```powershell
# 终端 1 · Bridge
cd F:\Work\Create\UIstore\m3e-canvas\prism-bridge
npm start

# 终端 2 · 画布
cd F:\Work\Create\UIstore\m3e-canvas
npm run dev
```

浏览器打开项目后，左侧 **AI** 可用风格预设；Bridge 灯绿后外部 MCP 可改画布。
