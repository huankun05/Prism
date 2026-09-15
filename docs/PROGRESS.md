# Prism 项目进度

> 仓库：https://github.com/huankun05/Prism.git  
> 基座：m3e-canvas（MIT © lnkiai）  
> 更新规则：每次功能提交后更新本表；方案见 `docs/开发方案.md`，规范见 `docs/工程规范.md`。

## 当前状态

| 项 | 值 |
|----|-----|
| 阶段 | **阶段 0 已完成** |
| 阶段 0 | **已完成**：改名 Prism、默认中文、工程文档、typecheck/test/build 绿、已推送 |
| 阶段 1 本地项目库 | 未开始 |
| 阶段 2 MCP 桥 | 未开始 |
| 阶段 3 个人样式 | 未开始 |
| 阶段 4 资源库 | 未开始 |
| 阶段 5 Pack | 未开始 |
| 阶段 6 同步/登录 | 冻结至前期里程碑后 |
| 阶段 7–8 模板/Tauri | 冻结 |

## 已完成

### 文档与决策

- [x] 产品定位：AI 可读写的设计中间层（非 Figma 克隆）
- [x] 形态：Web 优先 + 本地文件 + MCP Bridge；壳后置（Tauri）
- [x] 产品名：**Prism（棱镜）**
- [x] 多语言：默认中文，保留英文切换；日/韩暂留
- [x] 工程规范、开发方案、调研、组件策略、决策记录

### 阶段 0

- [x] 方案与工程规范
- [x] 包名 `prism-canvas`，仓库指向 huankun05/Prism
- [x] UI/元数据品牌：Prism
- [x] 默认语言 zh（模块默认 + 首次启动偏好解析）
- [x] 项目文件名前缀 `prism`
- [x] README / SECURITY / CONTRIBUTING / agent.md 更新
- [x] `npm run typecheck` 通过
- [x] `npm test` 664 全部通过
- [x] `npm run build` 静态导出成功
- [x] git 远程切换与首次提交推送（`dd21427` → huankun05/Prism main）

## 变更日志

| 日期 | 内容 |
|------|------|
| 2026-09-15 | 立项文档；确定 Prism；启动阶段 0 |
| 2026-09-15 | 阶段 0 实现：品牌、默认中文、规范文档；测试与构建通过 |

## 已知问题 / 技术债

- 分享链接 origin 使用占位（huankun05.github.io/Prism），部署地址稳定后统一
- 原上游长文多语言 README 已替换为 Prism 简版
- localStorage 键名仍为 `m3e:*`（兼容旧草稿；阶段 1 项目库时再考虑迁移）
- `out/` 构建产物不入库
