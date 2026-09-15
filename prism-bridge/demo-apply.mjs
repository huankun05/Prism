/** Push a sample settings screen to the bridge for a quick canvas demo. */
const BRIDGE = `http://127.0.0.1:${process.env.PRISM_BRIDGE_PORT || 7331}`;

const design = {
  title: "AI 草稿 · 设置",
  brief: "由 prism-bridge demo 推送",
  frame: "phone",
  platform: "web",
  paletteKey: "blue",
  theme: { dark: false, shape: "rounded", font: "roboto", motion: "standard", contrast: "standard" },
  frames: [{ id: "home", name: "设置", x: 0, y: 0 }],
  groups: [
    {
      id: "g1",
      x: 0,
      y: 0,
      axis: "x",
      items: [{ id: "bar", kind: "topAppBar", label: "设置", icon: "menu", icon2: null, variant: "filled" }],
    },
    {
      id: "g2",
      x: 16,
      y: 120,
      axis: "y",
      items: [
        { id: "r1", kind: "listItem", label: "账户", supporting: "已登录", icon: "person", variant: "filled" },
        { id: "r2", kind: "listItem", label: "通知", supporting: "已开启", icon: "notifications", variant: "filled" },
        { id: "r3", kind: "listItem", label: "关于", supporting: "Prism 0.1", icon: "info", variant: "filled" },
      ],
    },
    {
      id: "g3",
      x: 16,
      y: 360,
      axis: "x",
      items: [{ id: "b1", kind: "button", label: "保存", icon: null, variant: "filled" }],
    },
  ],
};

const res = await fetch(`${BRIDGE}/v1/apply`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ design }),
});
console.log(res.status, await res.json());
