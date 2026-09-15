# 阶段 2 方案 · MCP 桥 + AI 实时改画布

> 状态：**待确认，未开始写业务代码**  
> 依据：`docs/调研-AI操作UI画布与同类产品.md` · D1/D5 · 产品定位 D2  
> 规范：方案确认 → 实现 → 自检 → 测试 → 文档 → 提交

---

## 1. 目标与非目标

### 目标（做完你能感到什么）

1. 在 **MiMo / Claude Code** 等工具里说「画一个设置页」→ 画布**实时出现**界面  
2. AI 可继续改：加按钮、换主题、连页面——你看着画布变  
3. 不依赖强制登录、不依赖云；本地跑通  

### 非目标（本阶段不做）

- 内置聊天框调模型（OpenAI Key 面板已有草稿能力，另议）  
- 多人协同、云端  
- 完整设计系统 Pack  
- 远程公网 Bridge  

---

## 2. 架构（调研结论落地）

```
MiMo / Claude Code / 其它 AI
        │  MCP (stdio 或本地 HTTP)
        ▼
  Prism MCP Server（Node 小程序，独立包）
        │  本地 WebSocket / HTTP
        ▼
  浏览器里的 Prism 画布（已打开某项目）
        │  监听操作 → 更新 Doc → 自动保存
        ▼
  本地项目文件夹（阶段 1）
```

要点：

| 点 | 选择 | 原因 |
|----|------|------|
| 主通道 | **画布连本地 Bridge**（WS） | 实时；用户在看 |
| AI 入口 | **MCP Server 调 Bridge** | 任意支持 MCP 的工具都能接 |
| 无打开项目时 | Bridge 缓存「待写入设计」或提示用户先打开项目 | 避免静默丢写 |
| 壳 | 仍不强制 Tauri | Bridge 用 `npx`/`node` 起 |

---

## 3. 本地进程怎么跑

提供仓库内脚本：

```
prism-bridge/
  server.mjs          # WebSocket 服务 + 简单 HTTP 健康检查
  mcp-server.mjs      # MCP stdio → 调 Bridge
  package.json        # 可被 npx / node 运行
```

推荐用法：

```bash
# 终端 1（或用户后台常驻）
node prism-bridge/server.mjs
# 默认 ws://127.0.0.1:7331

# AI 工具的 MCP 配置示例（Claude / 兼容端）
{
  "mcpServers": {
    "prism": {
      "command": "node",
      "args": ["F:/Work/Create/UIstore/m3e-canvas/prism-bridge/mcp-server.mjs"]
    }
  }
}
```

端口默认 **7331**（可环境变量 `PRISM_BRIDGE_PORT`）。只绑 `127.0.0.1`。

---

## 4. Bridge 协议（画布 ↔ 桥）

JSON over WebSocket，字段尽量少。

### 4.1 画布 → 桥（注册）

```json
{ "type": "hello", "role": "canvas", "sessionId": "...", "project": { "kind": "fsa", "folderName": "设置页" } }
```

### 4.2 桥 → 画布

```json
{ "type": "patch", "opId": "...", "patch": { /* Partial<Doc> 或命令列表 */ } }
{ "type": "apply", "opId": "...", "doc": { /* 完整 Doc 替换 */ } }
{ "type": "noop", "opId": "...", "reason": "no-canvas" }
```

### 4.3 AI 侧工具（MCP Tools）最小集

| Tool | 作用 |
|------|------|
| `prism_status` | 是否有画布连接、当前项目名、Bridge 是否运行 |
| `prism_get_design` | 读取当前完整 Doc JSON |
| `prism_apply_design` | 写入/合并完整设计（严格 JSON） |
| `prism_set_theme` | 改 paletteKey / dark / shape 等 |
| `prism_add_frame` | 加屏幕（名称、尺寸手机/桌面） |
| `prism_add_part` | 在指定 frame 加部件（kind、label、icon…） |
| `prism_tidy` | 请求画布执行整理（可选，二期） |

`prism_apply_design` 用现有 `isProject` 校验；非法则返回错误给 AI，不写画布。

### 4.4 无画布连接时

- 工具返回明确错误：`Open a project in Prism canvas first`  
- **或** 可选：写入 `prism-bridge/pending-design.json`，用户打开画布后提示「导入 AI 草稿」——**阶段 2.1，本阶段可先只做错误提示**，降低复杂度  

---

## 5. 画布侧改动

1. 连接状态：`connecting | connected | disconnected`（顶栏小指示，可与保存状态并列）  
2. 收到 `patch/apply`：走 `applyDoc` 或等价更新；计入撤销栈（至少可 Ctrl+Z）  
3. 仅当「项目会话中」接受远程写（避免用户没开项目时被写到错误草稿）  
4. 服务未启动：连接指示为断开，不影响本地编辑  

**不改** M3 绘制内核；只加「远程指令入口」。

---

## 6. 实现切片（建议两个提交）

### Slice A — Bridge + 画布监听（无 MCP 也可演示）

- `prism-bridge/server.mjs`：连接管理、转发 patch  
- 画布 WS 客户端 + apply  
- 用简单 HTML/curl/ws 测试：`prism_apply_design` 等价 JSON 推给桥 → 画布变化  

### Slice B — MCP Server

- `mcp-server.mcp`：暴露上表 tools  
- 文档：MiMo / Claude Code 配置示例  
- 冒烟：status / get / apply 在本地通  

---

## 7. 技术约束

| 项 | 约定 |
|----|------|
| Bridge 依赖 | 尽量零或仅 `ws`；或 Node 内置（若可行）——写方案时锁定 |
| 安全 | 只监听 127.0.0.1；不鉴权公网 |
| 与静态导出 | Next 站仍静态；Bridge 独立进程，不进 GitHub Pages |
| 测试 | 纯函数：patch 合并、工具入参校验；Bridge 用 node 脚本 smoke |
| 文档 | `docs/方案-阶段2-MCP桥.md` + README 一节 |

---

## 8. 验收清单

- [ ] `node prism-bridge/server.mjs` 启动成功  
- [ ] 画布显示已连接  
- [ ] 用测试脚本推送一个设置页 Doc → 画布立刻出现  
- [ ] MCP 配置后，AI 调用 `prism_status` 能返回 connected  
- [ ] AI 调用 `prism_apply_design` 合法 JSON → 画布更新并自动保存到项目  
- [ ] 非法 JSON → AI 收到错误，画布不变  
- [ ] 未开画布 → AI 收到明确错误  
- [ ] typecheck / test / build / 文档 / 提交  

---

## 9. 风险

| 风险 | 对策 |
|------|------|
| 用户多标签画布 | 仅最新连接的画布收写；或 hello 带 sessionId |
| MCP 生态差异 | 文档给 Claude Code + 通用 stdio 两种说明 |
| 大 Doc 传输 | 阶段 2 接受整 Doc；后续再做 patch 细粒度 |
| Windows 路径 | 文档用正斜杠示例；脚本 path 用 path 模块 |

---

## 10. 请你确认（可「按推荐做」）

1. **端口 7331、仅本机** — 可以？  
2. **无画布时 AI 报错**（不做 pending 文件）— 可以？  
3. **依赖**：若 Node 内置不满足，允许 bridge 包仅依赖 `ws` — 可以？  

确认后按 Slice A → B 开工，全程按工程规范更新 `PROGRESS.md`。
