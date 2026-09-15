# Prism 项目进度

> 仓库：https://github.com/huankun05/Prism.git  
> 基座：m3e-canvas（MIT © lnkiai）  
> 更新规则：每次功能提交后更新本表。

## 当前状态

| 项 | 值 |
|----|-----|
| 阶段 | **阶段 2 已实现（提交中）** |
| 阶段 0 | **已完成** |
| 阶段 1 本地项目库 | **已完成** |
| 阶段 2 MCP 桥 | **已实现**：本地 WS Bridge + 画布实时应用 + MCP 工具 + demo 脚本 |
| 阶段 3 个人样式 | 未开始 |
| 阶段 4 资源库 | 未开始 |
| 阶段 5 Pack | 未开始 |
| 阶段 6–8 | 冻结 |

## 阶段 1 已交付

- [x] 方案（调研修订）：`docs/方案-阶段1-本地项目库.md`、`docs/调研-本地项目库.md`
- [x] `lib/storage/*`：types / detect / handleCache / workspace / fallback / migrate
- [x] 项目库 UI：`components/ProjectLibrary.tsx`
- [x] `page.tsx`：库 ↔ 画布会话
- [x] Editor：`initialDoc` / `persistDoc` 自动保存（500ms 防抖）+ 返回项目库 + 保存状态
- [x] 单测：storage types + fallback 共 13 例；全库 **677** 绿
- [x] typecheck + build 通过

### 行为摘要

| 能力 | 行为 |
|------|------|
| Chromium | 选工作区文件夹；子文件夹=项目；`design.json` + `meta.json` |
| 其它浏览器 | 浏览器草稿最近列表 + 导入 JSON |
| 自动保存 | 编辑后约 500ms 写回；失败显示错误 |
| 旧草稿 | 检测 `m3e:doc`，提示导入为项目 |
| 句柄 | IndexedDB 缓存工作区目录 handle |

## 阶段 2 已交付

- [x] `prism-bridge/server.mjs`：127.0.0.1:7331，WS 画布 + HTTP apply/status
- [x] `prism-bridge/mcp-server.mjs`：MCP stdio 工具集
- [x] `prism-bridge/demo-apply.mjs`：一键推设置页样例
- [x] 画布：`lib/bridge.ts` + Editor 连接/撤销/应用/状态灯
- [x] 文档 `prism-bridge/README.md`、方案 `docs/方案-阶段2-MCP桥.md`
- [x] typecheck / test(677) / build 通过

## 已知限制（阶段 1 可接受）

- 重命名在 FSA 下为「复制新目录 + 删旧目录」（API 无 move）
- 无封面缩略图、无搜索
- Safari/Firefox 无文件夹工作区（按调研降级）
- 分享链接 origin 仍为占位

## 变更日志

| 日期 | 内容 |
|------|------|
| 2026-09-15 | 阶段 0 完成并推送 |
| 2026-09-15 | 阶段 1 本地项目库实现；测试与构建通过 |
| 2026-09-15 | 阶段 2 Bridge + 画布实时应用 + MCP 工具；测试与构建通过 |
| 2026-09-15 | 页面级 Bridge 自动建项目；设计系统 v0.1 + MCP 注入；重绘任务中心示例 |

## 下一步

1. 人工验收：起 bridge → 开画布 → `node demo-apply.mjs` → 画布变化  
2. 配置 MCP 后用 AI 试 `prism_status` / `prism_add_part`  
3. 视验收修缺陷；再考虑阶段 3 个人样式或体验打磨（用户已标记项目库/编辑器偏素）  
