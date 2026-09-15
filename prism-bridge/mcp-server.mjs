/**
 * Prism MCP server (stdio JSON-RPC, MCP tools subset).
 * Talks to the local bridge over HTTP.
 */
const BRIDGE = `http://127.0.0.1:${process.env.PRISM_BRIDGE_PORT || 7331}`;

const frameDoc = (name = "Screen", note = "") => ({
  id: `f-${Math.random().toString(36).slice(2, 8)}`,
  name,
  x: 0,
  y: 0,
  ...(note ? { note } : {}),
});

const listItem = (id, label, supporting, icon) => ({
  id,
  kind: "listItem",
  label,
  supporting: supporting || "",
  icon: icon || null,
  variant: "filled",
});

const topAppBar = (id, label, icon = "menu", icon2 = null) => ({
  id,
  kind: "topAppBar",
  label,
  icon,
  icon2,
  variant: "filled",
});

const button = (id, label, variant = "filled") => ({
  id,
  kind: "button",
  label,
  icon: null,
  variant,
});

const group = (id, x, y, axis, items) => ({ id, x, y, axis, items });

function seedDoc(title = "New design") {
  return {
    title,
    brief: "",
    frame: "phone",
    platform: "web",
    paletteKey: "purple",
    theme: { dark: false, shape: "rounded", font: "roboto", motion: "standard", contrast: "standard" },
    frames: [frameDoc("Home")],
    groups: [],
  };
}

async function bridgeFetch(path, init) {
  const res = await fetch(`${BRIDGE}${path}`, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function requireCanvas() {
  const { body } = await bridgeFetch("/v1/status");
  if (!body.canvasConnected) {
    throw new Error("Open a project in the Prism canvas first (keep the tab open), then retry.");
  }
  return body;
}

async function getDesign() {
  const { status, body } = await bridgeFetch("/v1/design");
  if (status === 404 || !body.design) {
    /* fall back to a fresh seed so tools can still compose a first design */
    return seedDoc();
  }
  return body.design;
}

async function applyDesign(design) {
  await requireCanvas();
  const { status, body } = await bridgeFetch("/v1/apply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ design }),
  });
  if (!body.ok) {
    throw new Error(body.message || `apply failed (${status})`);
  }
  return design;
}

/** Short design-system rules injected into every generation tool. */
const DESIGN_SYSTEM_BRIEF = `
Follow Prism design-system (see project public/design-system.md):
- 16dp screen margins; vertical rhythm on 4/8 grid (8,16,24,32)
- One filled primary action per screen; other actions outlined/text
- List items: icon + title + supporting text; connected runs for homogeneous lists
- Use palette roles only (primary, secondaryContainer, surface*, onSurface, onSurfaceVariant)
- theme: { dark:false, shape:"rounded", font:"roboto", motion:"expressive"|"standard", emphasized:true for consumer apps }
- Multi-screen: semantic frame ids (home/detail/settings); list→detail slide; detail back arrow slideLeft
- Density: 4–6 list rows, not 2 lonely rows; avoid empty half-screens
- Look like one product system, not a pile of random widgets
`.trim();

const TOOLS = [
  {
    name: "prism_status",
    description: "Check whether a Prism canvas is connected to the local bridge.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async handler() {
      const { body } = await bridgeFetch("/v1/status");
      return JSON.stringify(body);
    },
  },
  {
    name: "prism_get_design",
    description: "Read the current Prism design document (Doc JSON) from the open canvas project.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async handler() {
      await requireCanvas();
      const design = await getDesign();
      return JSON.stringify(design);
    },
  },
  {
    name: "prism_get_design_system",
    description: "Read Prism design-system rules (spacing, color roles, density, screen templates) before generating UI.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    async handler() {
      const rules = [
        DESIGN_SYSTEM_BRIEF,
        "",
        "Screen templates:",
        "A list: TopAppBar → 16 → list 4–6 rows → 24 → primary+secondary actions → optional chips → BottomNav",
        "A detail: TopAppBar(back) → 16 → hero card → 16 → meta list → 24 → primary action",
        "Anti-patterns: 5 filled buttons, ragged margins, nav overlapping content, card-in-card, error color as brand.",
      ].join("\n");
      return JSON.stringify({ ok: true, rules });
    },
  },
  {
    name: "prism_apply_design",
    description: `Replace the open canvas design with a full Prism Doc JSON. ${DESIGN_SYSTEM_BRIEF}`,
    inputSchema: {
      type: "object",
      properties: {
        design: {
          type: "object",
          description: "Full Prism Doc: { title, brief?, frame, platform?, paletteKey, theme?, frames: [], groups: [] }",
        },
      },
      required: ["design"],
      additionalProperties: false,
    },
    async handler(args) {
      const design = args?.design;
      if (!design || !Array.isArray(design.groups) || !Array.isArray(design.frames)) {
        throw new Error("design must be an object with groups[] and frames[]");
      }
      await applyDesign(design);
      return JSON.stringify({ ok: true, frames: design.frames.length, groups: design.groups.length });
    },
  },
  {
    name: "prism_set_theme",
    description: "Update palette / dark mode / shape on the current design and push to the canvas.",
    inputSchema: {
      type: "object",
      properties: {
        paletteKey: {
          type: "string",
          description: "purple | blue | green | coral | amber | teal | mono | custom",
        },
        dark: { type: "boolean" },
        shape: { type: "string", description: "square | rounded | full" },
        title: { type: "string" },
        brief: { type: "string" },
      },
      additionalProperties: false,
    },
    async handler(args) {
      await requireCanvas();
      const design = await getDesign();
      const next = { ...design };
      if (args?.paletteKey) next.paletteKey = args.paletteKey;
      if (args?.title) next.title = args.title;
      if (args?.brief) next.brief = args.brief;
      if (args?.dark !== undefined || args?.shape) {
        next.theme = {
          dark: args?.dark ?? design.theme?.dark ?? false,
          shape: args?.shape ?? design.theme?.shape ?? "rounded",
          font: design.theme?.font ?? "roboto",
          motion: design.theme?.motion ?? "standard",
          contrast: design.theme?.contrast ?? "standard",
          bothModes: design.theme?.bothModes,
          emphasized: design.theme?.emphasized,
        };
      }
      await applyDesign(next);
      return JSON.stringify({ ok: true, paletteKey: next.paletteKey, dark: next.theme?.dark });
    },
  },
  {
    name: "prism_add_frame",
    description: `Add a phone (412×892) or desktop (1280×800) screen. Use semantic names (home/detail/settings). ${DESIGN_SYSTEM_BRIEF}`,
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        kind: { type: "string", enum: ["phone", "desktop"] },
        note: { type: "string" },
        title: { type: "string" },
      },
      additionalProperties: false,
    },
    async handler(args) {
      await requireCanvas();
      const design = await getDesign();
      const kind = args?.kind === "desktop" ? "desktop" : "phone";
      const w = kind === "desktop" ? 1280 : 412;
      const h = kind === "desktop" ? 800 : 892;
      const name = args?.name || (kind === "desktop" ? "Desktop" : "Phone");
      const index = design.frames.length;
      const frame = {
        ...frameDoc(name, args?.note),
        w,
        h,
        x: index * (w + 80),
        y: 0,
      };
      const next = { ...design, frames: [...design.frames, frame] };
      if (args?.title) next.title = args.title;
      await applyDesign(next);
      return JSON.stringify({ ok: true, frameId: frame.id, name });
    },
  },
  {
    name: "prism_add_part",
    description: `Append a part to a frame. Prefer list runs + one filled CTA. ${DESIGN_SYSTEM_BRIEF}`,
    inputSchema: {
      type: "object",
      properties: {
        frameId: { type: "string", description: "Target frame id; omit to use the first frame" },
        part: {
          type: "string",
          enum: ["listItem", "button", "topAppBar", "text"],
          description: "Part kind",
        },
        label: { type: "string" },
        supporting: { type: "string" },
        icon: { type: "string" },
        title: { type: "string" },
      },
      additionalProperties: false,
    },
    async handler(args) {
      await requireCanvas();
      const current = await getDesign();
      const design = { ...current, frames: [...(current.frames || [])], groups: [...(current.frames ? current.groups : [])] };
      if (!design.frames.length) design.frames = [frameDoc("Home")];
      const frame = design.frames.find((f) => f.id === args?.frameId) || design.frames[0];
      const label = args?.label || "Item";
      const id = `p-${Math.random().toString(36).slice(2, 8)}`;
      let item;
      const yBase = 100 + design.groups.length * 64;
      if (args?.part === "button") {
        item = button(id, label);
        design.groups.push(group(`g-${id}`, 16, yBase, "x", [item]));
      } else if (args?.part === "topAppBar") {
        item = topAppBar(id, label, args?.icon || "menu");
        design.groups.push(group(`g-${id}`, frame.x, frame.y, "x", [item]));
      } else if (args?.part === "text") {
        item = { id, kind: "text", label, variant: "text" };
        design.groups.push(group(`g-${id}`, 16, yBase, "x", [item]));
      } else {
        item = listItem(id, label, args?.supporting, args?.icon);
        design.groups.push(group(`g-${id}`, 16, yBase, "y", [item]));
      }
      if (args?.title) design.title = args.title;
      await applyDesign(design);
      return JSON.stringify({ ok: true, partId: id, frameId: frame.id });
    },
  },
];

function send(result) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function handleMessage(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion || "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "prism-bridge", version: "0.1.0" },
      },
    });
    return;
  }
  if (method === "notifications/initialized" || method === "initialized") {
    return;
  }
  if (method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      },
    });
    return;
  }
  if (method === "tools/call") {
    const name = params?.name;
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) {
      send({ jsonrpc: "2.0", id, error: { code: -32602, message: `Unknown tool: ${name}` } });
      return;
    }
    try {
      const text = await tool.handler(params?.arguments ?? {});
      send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text }] },
      });
    } catch (e) {
      send({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
        },
      });
    }
    return;
  }
  if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} });
    return;
  }
  if (id !== undefined) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      void handleMessage(JSON.parse(line));
    } catch {
      /* skip bad lines */
    }
  }
});

process.stderr.write("[prism-mcp] ready\n");
