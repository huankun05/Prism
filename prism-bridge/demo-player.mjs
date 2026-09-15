/** Music player app demo for live canvas test */
const BRIDGE = `http://127.0.0.1:${process.env.PRISM_BRIDGE_PORT || 7331}`;

const design = {
  title: "音乐播放器",
  brief: "Bridge 实测：正在播放 + 歌单库 + 详情",
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
    { id: "home", name: "发现", x: 0, y: 0, note: "歌单与推荐" },
    { id: "player", name: "正在播放", x: 492, y: 0, note: "全屏播放器" },
  ],
  groups: [
    /* —— 发现 / 歌单 —— */
    {
      id: "h-bar",
      x: 0,
      y: 0,
      axis: "x",
      items: [
        {
          id: "h-bar-i",
          kind: "topAppBar",
          label: "发现音乐",
          icon: "menu",
          icon2: "search",
          variant: "filled",
        },
      ],
    },
    {
      id: "h-hero",
      x: 16,
      y: 88,
      axis: "y",
      items: [
        {
          id: "h-card",
          kind: "card",
          label: "今日推荐",
          supporting: "根据你的口味更新 · 30 首",
          icon: "radio",
          variant: "elevated",
          imagePos: "top",
        },
      ],
    },
    {
      id: "h-chips",
      x: 16,
      y: 280,
      axis: "x",
      items: [
        { id: "c1", kind: "chip", label: "推荐", icon: null, variant: "filled", checked: true },
        { id: "c2", kind: "chip", label: "排行", icon: null, variant: "outlined" },
        { id: "c3", kind: "chip", label: "电台", icon: null, variant: "outlined" },
      ],
    },
    {
      id: "h-list",
      x: 16,
      y: 340,
      axis: "y",
      items: [
        {
          id: "t1",
          kind: "listItem",
          label: "夜色微光",
          supporting: "Luna · 3:42",
          icon: "music_note",
          variant: "tonal",
          action: { to: "player", transition: "slide" },
        },
        {
          id: "t2",
          kind: "listItem",
          label: "城市霓虹",
          supporting: "Echo · 4:05",
          icon: "graphic_eq",
          variant: "tonal",
          action: { to: "player", transition: "slide" },
        },
        {
          id: "t3",
          kind: "listItem",
          label: "雨天咖啡馆",
          supporting: "Bean · 3:18",
          icon: "coffee",
          variant: "tonal",
          action: { to: "player", transition: "slide" },
        },
        {
          id: "t4",
          kind: "listItem",
          label: "远航",
          supporting: "North · 5:01",
          icon: "sailing",
          variant: "tonal",
        },
      ],
    },
    {
      id: "h-nav",
      x: 0,
      y: 816,
      axis: "x",
      items: [
        {
          id: "h-nav-i",
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

    /* —— 正在播放 —— */
    {
      id: "p-bar",
      x: 492,
      y: 0,
      axis: "x",
      items: [
        {
          id: "p-bar-i",
          kind: "topAppBar",
          label: "正在播放",
          icon: "keyboard_arrow_down",
          icon2: "more_vert",
          variant: "tonal",
          action: { to: "home", transition: "slideDown" },
        },
      ],
    },
    {
      id: "p-art",
      x: 560,
      y: 96,
      axis: "y",
      items: [
        {
          id: "p-cover",
          kind: "box",
          label: "",
          icon: "music_note",
          variant: "filled",
          size: 280,
          size2: 280,
          hasChecked: false,
          fill: "primaryContainer",
        },
      ],
    },
    {
      id: "p-meta",
      x: 520,
      y: 400,
      axis: "y",
      items: [
        {
          id: "p-title",
          kind: "text",
          label: "夜色微光",
          variant: "filled",
          bold: true,
        },
        {
          id: "p-artist",
          kind: "text",
          label: "Luna · 星河专辑",
          variant: "text",
        },
      ],
    },
    {
      id: "p-progress",
      x: 520,
      y: 480,
      axis: "y",
      items: [
        {
          id: "p-bar-slider",
          kind: "linearProgress",
          label: "",
          icon: null,
          variant: "filled",
          value: 42,
        },
        {
          id: "p-time",
          kind: "text",
          label: "1:32 / 3:42",
          variant: "text",
        },
      ],
    },
    {
      id: "p-controls",
      x: 560,
      y: 560,
      axis: "x",
      items: [
        { id: "p-prev", kind: "iconButton", label: "", icon: "skip_previous", variant: "text" },
        {
          id: "p-play",
          kind: "button",
          label: "暂停",
          icon: "pause",
          variant: "filled",
        },
        { id: "p-next", kind: "iconButton", label: "", icon: "skip_next", variant: "text" },
      ],
    },
    {
      id: "p-actions",
      x: 520,
      y: 640,
      axis: "x",
      items: [
        { id: "p-like", kind: "button", label: "喜欢", icon: "favorite", variant: "outlined" },
        { id: "p-queue", kind: "button", label: "播放列表", icon: "queue_music", variant: "text" },
      ],
    },
    {
      id: "p-vol",
      x: 520,
      y: 720,
      axis: "y",
      items: [
        {
          id: "p-vol-slider",
          kind: "slider",
          label: "音量",
          icon: "volume_up",
          variant: "filled",
          value: 70,
        },
      ],
    },
  ],
};

const res = await fetch(`${BRIDGE}/v1/apply`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ design }),
});
console.log(res.status, await res.json());
