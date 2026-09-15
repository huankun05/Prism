# Prism Bridge

本地桥：浏览器画布 ↔ MCP / AI 工具。只监听 `127.0.0.1:7331`。

## 启动

```bash
# 终端 1：桥
cd prism-bridge
npm install
npm start
# → http://127.0.0.1:7331  ws://127.0.0.1:7331/ws
```

```bash
# 终端 2：画布
cd ..   # 仓库根目录（含 package.json）
npm run dev
```

浏览器打开项目后，顶栏 Bridge 指示灯应为绿色。

## 冒烟（无需 MCP）

```bash
node demo-apply.mjs
```

画布应立刻出现「设置」示例页。

## MCP 配置示例（Claude Code / 兼容）

```json
{
  "mcpServers": {
    "prism": {
      "command": "node",
      "args": ["F:/Work/Create/UIstore/m3e-canvas/prism-bridge/mcp-server.mjs"]
    }
  }
}
```

然后对 AI 说：用 prism_add_frame / prism_add_part / prism_apply_design 画一个设置页。

## HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/health` | 健康检查 |
| GET | `/v1/status` | 画布是否连接 |
| GET | `/v1/design` | 当前缓存设计 |
| POST | `/v1/apply` | `{ "design": Doc }` 推到画布 |
| POST | `/v1/command` | 自定义命令 |

## 环境变量

- `PRISM_BRIDGE_PORT` 默认 `7331`
