/**
 * Prism local bridge — binds 127.0.0.1 only.
 * Canvas connects over WebSocket; MCP agents use HTTP.
 */
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PRISM_BRIDGE_PORT || 7331);
const HOST = "127.0.0.1";

/** @type {import("ws").WebSocket | null} */
let canvas = null;
/** @type {object | null} */
let lastDesign = null;
let canvasMeta = { projectName: null, connectedAt: null };

const json = (res, status, body) => {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(data);
};

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const canvasAlive = () => !!canvas && canvas.readyState === 1;

function sendToCanvas(message) {
  if (!canvasAlive()) return false;
  canvas.send(JSON.stringify(message));
  return true;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/health") {
    json(res, 200, { ok: true, canvas: canvasAlive(), projectName: canvasMeta.projectName });
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/status") {
    json(res, 200, {
      ok: true,
      canvasConnected: canvasAlive(),
      projectName: canvasMeta.projectName,
      hasDesign: !!lastDesign,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/v1/design") {
    if (!lastDesign) {
      json(res, 404, { ok: false, error: "no-design", message: "No design cached. Open a project in the Prism canvas." });
      return;
    }
    json(res, 200, { ok: true, design: lastDesign });
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/apply") {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      json(res, 400, { ok: false, error: "bad-json", message: "Body must be JSON." });
      return;
    }
    const design = payload?.design ?? payload;
    if (!design || typeof design !== "object" || !Array.isArray(design.groups) || !Array.isArray(design.frames)) {
      json(res, 400, { ok: false, error: "invalid-design", message: "design must include groups[] and frames[] (Prism Doc)." });
      return;
    }
    if (!canvasAlive()) {
      json(res, 409, {
        ok: false,
        error: "no-canvas",
        message: "Open a project in the Prism canvas first (keep the tab open).",
      });
      return;
    }
    lastDesign = design;
    const ok = sendToCanvas({ type: "apply", opId: payload?.opId ?? String(Date.now()), design });
    if (!ok) {
      json(res, 500, { ok: false, error: "send-failed", message: "Failed to send to canvas." });
      return;
    }
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/command") {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      json(res, 400, { ok: false, error: "bad-json" });
      return;
    }
    if (!canvasAlive()) {
      json(res, 409, { ok: false, error: "no-canvas", message: "Open a project in the Prism canvas first." });
      return;
    }
    sendToCanvas({ type: "command", opId: payload?.opId ?? String(Date.now()), command: payload?.command ?? payload });
    json(res, 200, { ok: true });
    return;
  }

  json(res, 404, { ok: false, error: "not-found" });
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  /* one live canvas at a time — latest wins */
  if (canvas && canvas !== ws) {
    try {
      canvas.close(4000, "replaced");
    } catch {}
  }
  canvas = ws;
  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      if (msg.type === "hello") {
        canvasMeta = {
          projectName: msg.project?.folderName ?? msg.project?.name ?? null,
          connectedAt: Date.now(),
        };
        if (msg.design) lastDesign = msg.design;
        ws.send(JSON.stringify({ type: "hello-ack", ok: true }));
        return;
      }
      if (msg.type === "design") {
        lastDesign = msg.design;
        return;
      }
    } catch {
      /* ignore non-json */
    }
  });
  ws.on("close", () => {
    if (canvas === ws) {
      canvas = null;
      canvasMeta = { projectName: null, connectedAt: null };
    }
  });
  ws.on("error", () => {});
});

server.listen(PORT, HOST, () => {
  console.log(`[prism-bridge] http://${HOST}:${PORT}  ws://${HOST}:${PORT}/ws`);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    try {
      wss.close();
      server.close();
    } catch {}
    process.exit(0);
  });
}
