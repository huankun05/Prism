/**
 * Higher-quality two-screen task app following public/design-system.md
 * (16dp margins, density, single primary action, role colors, nav).
 */
const BRIDGE = `http://127.0.0.1:${process.env.PRISM_BRIDGE_PORT || 7331}`;

const design = {
  title: "任务中心",
  brief: "遵循 Prism 设计系统：16dp 边距、列表密度、单一主操作、详情英雄卡。",
  frame: "phone",
  platform: "web",
  paletteKey: "blue",
  theme: {
    dark: false,
    shape: "rounded",
    font: "roboto",
    motion: "expressive",
    contrast: "standard",
    bothModes: true,
    emphasized: true,
  },
  frames: [
    { id: "home", name: "任务", x: 0, y: 0, note: "今日任务列表，主操作新建" },
    { id: "detail", name: "详情", x: 492, y: 0, note: "任务详情与完成操作" },
  ],
  groups: [
    /* —— home —— */
    {
      id: "h-bar",
      x: 0,
      y: 0,
      axis: "x",
      items: [
        {
          id: "h-bar-i",
          kind: "topAppBar",
          label: "任务",
          icon: "menu",
          icon2: "search",
          variant: "filled",
        },
      ],
    },
    {
      id: "h-list",
      x: 16,
      y: 88,
      axis: "y",
      items: [
        {
          id: "h-1",
          kind: "listItem",
          label: "整理产品路线图",
          supporting: "今天 15:00 · 高优先级",
          icon: "flag",
          variant: "tonal",
          action: { to: "detail", transition: "slide" },
        },
        {
          id: "h-2",
          kind: "listItem",
          label: "评审阶段 2 方案",
          supporting: "已完成 · 10:20",
          icon: "task_alt",
          variant: "tonal",
        },
        {
          id: "h-3",
          kind: "listItem",
          label: "同步图标库调研",
          supporting: "进行中 · 2 条笔记",
          icon: "hub",
          variant: "tonal",
        },
        {
          id: "h-4",
          kind: "listItem",
          label: "写周报",
          supporting: "明天 18:00",
          icon: "edit_note",
          variant: "tonal",
        },
        {
          id: "h-5",
          kind: "listItem",
          label: "预约用户访谈",
          supporting: "本周五",
          icon: "event",
          variant: "tonal",
        },
      ],
    },
    {
      id: "h-cta",
      x: 16,
      y: 520,
      axis: "x",
      items: [
        {
          id: "h-new",
          kind: "button",
          label: "新建任务",
          icon: "add",
          variant: "filled",
        },
        {
          id: "h-filter",
          kind: "button",
          label: "筛选",
          icon: "tune",
          variant: "outlined",
        },
      ],
    },
    {
      id: "h-chips",
      x: 16,
      y: 592,
      axis: "x",
      items: [
        { id: "c-all", kind: "chip", label: "全部", icon: null, variant: "filled", checked: true },
        { id: "c-today", kind: "chip", label: "今天", icon: null, variant: "outlined" },
        { id: "c-done", kind: "chip", label: "已完成", icon: null, variant: "outlined" },
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
            { icon: "home", label: "任务" },
            { icon: "calendar_month", label: "日程" },
            { icon: "insights", label: "统计" },
            { icon: "settings", label: "设置" },
          ],
        },
      ],
    },

    /* —— detail —— */
    {
      id: "d-bar",
      x: 492,
      y: 0,
      axis: "x",
      items: [
        {
          id: "d-bar-i",
          kind: "topAppBar",
          label: "任务详情",
          icon: "arrow_back",
          icon2: "more_vert",
          variant: "tonal",
          action: { to: "home", transition: "slideLeft" },
        },
      ],
    },
    {
      id: "d-hero",
      x: 508,
      y: 96,
      axis: "y",
      items: [
        {
          id: "d-card",
          kind: "card",
          label: "整理产品路线图",
          supporting:
            "明确阶段 3–5 优先级，对齐设计与研发，并输出可评审的里程碑列表。预计 90 分钟专注块。",
          icon: "flag",
          variant: "elevated",
          imagePos: "top",
        },
      ],
    },
    {
      id: "d-meta",
      x: 508,
      y: 360,
      axis: "y",
      items: [
        {
          id: "d-when",
          kind: "listItem",
          label: "时间",
          supporting: "今天 15:00 – 16:30",
          icon: "schedule",
          variant: "filled",
        },
        {
          id: "d-pri",
          kind: "listItem",
          label: "优先级",
          supporting: "高 · 阻塞发布",
          icon: "priority_high",
          variant: "filled",
        },
        {
          id: "d-tag",
          kind: "listItem",
          label: "标签",
          supporting: "产品 · 路线图",
          icon: "label",
          variant: "filled",
        },
      ],
    },
    {
      id: "d-actions",
      x: 508,
      y: 620,
      axis: "x",
      items: [
        {
          id: "d-done",
          kind: "button",
          label: "标记完成",
          icon: "check",
          variant: "filled",
        },
        {
          id: "d-edit",
          kind: "button",
          label: "编辑",
          icon: "edit",
          variant: "outlined",
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
