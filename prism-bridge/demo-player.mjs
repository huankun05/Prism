const BRIDGE = "http://127.0.0.1:7331";

const design = {
  title: "音乐播放器",
  brief: "发现页 + 全屏播放器",
  frame: "phone",
  platform: "web",
  paletteKey: "purple",
  theme: {
    dark: true,
    shape: "rounded",
    font: "roboto",
    motion: "expressive",
    contrast: "standard",
    bothModes: true,
    emphasized: true,
  },
  frames: [
    { id: "home", name: "发现", x: 0, y: 0 },
    { id: "player", name: "正在播放", x: 492, y: 0 },
  ],
  groups: [
    {
      id: "g1",
      x: 0,
      y: 0,
      axis: "x",
      items: [
        {
          id: "bar1",
          kind: "topAppBar",
          label: "发现音乐",
          icon: "menu",
          icon2: "search",
          variant: "filled",
        },
      ],
    },
    {
      id: "g2",
      x: 16,
      y: 96,
      axis: "y",
      items: [
        {
          id: "hero",
          kind: "card",
          label: "今日推荐",
          supporting: "30 首 · 根据你的口味",
          icon: "headphones",
          variant: "elevated",
        },
      ],
    },
    {
      id: "g3",
      x: 16,
      y: 220,
      axis: "x",
      items: [
        { id: "chip1", kind: "chip", label: "推荐", icon: null, variant: "filled", checked: true },
        { id: "chip2", kind: "chip", label: "新歌", icon: null, variant: "outlined" },
        { id: "chip3", kind: "chip", label: "电台", icon: null, variant: "outlined" },
      ],
    },
    {
      id: "g4",
      x: 16,
      y: 280,
      axis: "y",
      items: [
        {
          id: "s1",
          kind: "listItem",
          label: "夜色微光",
          supporting: "Luna · 3:42",
          icon: "music_note",
          variant: "tonal",
          action: { to: "player", transition: "slide" },
        },
        {
          id: "s2",
          kind: "listItem",
          label: "城市霓虹",
          supporting: "Echo · 4:05",
          icon: "graphic_eq",
          variant: "tonal",
          action: { to: "player", transition: "slide" },
        },
        {
          id: "s3",
          kind: "listItem",
          label: "雨天咖啡馆",
          supporting: "Bean · 3:18",
          icon: "local_cafe",
          variant: "tonal",
        },
        {
          id: "s4",
          kind: "listItem",
          label: "远航",
          supporting: "North · 5:01",
          icon: "sailing",
          variant: "tonal",
        },
        {
          id: "s5",
          kind: "listItem",
          label: "星尘",
          supporting: "Orbit · 3:55",
          icon: "auto_awesome",
          variant: "tonal",
        },
      ],
    },
    {
      id: "g5",
      x: 0,
      y: 820,
      axis: "x",
      items: [
        {
          id: "nav",
          kind: "bottomNav",
          label: "",
          icon: null,
          variant: "filled",
          selected: 0,
          tabs: [
            { icon: "explore", label: "发现" },
            { icon: "library_music", label: "资料库" },
            { icon: "favorite", label: "喜欢" },
            { icon: "person", label: "我的" },
          ],
        },
      ],
    },
    {
      id: "g6",
      x: 492,
      y: 0,
      axis: "x",
      items: [
        {
          id: "bar2",
          kind: "topAppBar",
          label: "正在播放",
          icon: "keyboard_arrow_down",
          icon2: "more_vert",
          variant: "tonal",
          action: { to: "home", transition: "slideUp" },
        },
      ],
    },
    {
      id: "g7",
      x: 540,
      y: 100,
      axis: "y",
      items: [
        {
          id: "cover",
          kind: "card",
          label: "夜色微光",
          supporting: "专辑封面占位",
          icon: "music_note",
          variant: "elevated",
        },
      ],
    },
    {
      id: "g8",
      x: 520,
      y: 360,
      axis: "y",
      items: [
        { id: "tt", kind: "text", label: "夜色微光", icon: null, variant: "filled", bold: true },
        { id: "ar", kind: "text", label: "Luna · 星河", icon: null, variant: "text" },
      ],
    },
    {
      id: "g9",
      x: 520,
      y: 460,
      axis: "y",
      items: [
        {
          id: "pr",
          kind: "linearProgress",
          label: "",
          icon: null,
          variant: "filled",
          value: 42,
        },
        { id: "tm", kind: "text", label: "1:32  /  3:42", icon: null, variant: "text" },
      ],
    },
    {
      id: "g10",
      x: 540,
      y: 560,
      axis: "x",
      items: [
        { id: "ip1", kind: "iconButton", label: "", icon: "skip_previous", variant: "text" },
        { id: "pb", kind: "button", label: "暂停", icon: "pause", variant: "filled" },
        { id: "ip2", kind: "iconButton", label: "", icon: "skip_next", variant: "text" },
      ],
    },
    {
      id: "g11",
      x: 520,
      y: 640,
      axis: "x",
      items: [
        { id: "lk", kind: "button", label: "喜欢", icon: "favorite", variant: "outlined" },
        { id: "qd", kind: "button", label: "列表", icon: "queue_music", variant: "text" },
      ],
    },
  ],
};

const res = await fetch(`${BRIDGE}/v1/apply`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ design }),
});
const body = await res.json();
console.log("HTTP", res.status, body);

const st = await fetch(`${BRIDGE}/v1/status`).then((r) => r.json());
console.log("STATUS", st);
