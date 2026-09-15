/** Icon catalog: Material Symbols (full) + curated Lucide / Heroicons aliases. */

export type IconSource = "material" | "lucide" | "heroicons";

export type IconEntry = {
  /** name to put on the canvas (Material Symbols ligature) */
  key: string;
  /** display label */
  label: string;
  source: IconSource;
  /** search text */
  search: string;
};

/** Common Lucide names → Material Symbols we actually render */
const LUCIDE_MAP: Record<string, { m: string; label: string }> = {
  search: { m: "search", label: "Search" },
  home: { m: "home", label: "Home" },
  settings: { m: "settings", label: "Settings" },
  user: { m: "person", label: "User" },
  "user-round": { m: "person", label: "User round" },
  bell: { m: "notifications", label: "Bell" },
  heart: { m: "favorite", label: "Heart" },
  star: { m: "star", label: "Star" },
  check: { m: "check", label: "Check" },
  "check-circle": { m: "check_circle", label: "Check circle" },
  x: { m: "close", label: "Close" },
  plus: { m: "add", label: "Plus" },
  minus: { m: "remove", label: "Minus" },
  trash: { m: "delete", label: "Trash" },
  edit: { m: "edit", label: "Edit" },
  pencil: { m: "edit", label: "Pencil" },
  mail: { m: "mail", label: "Mail" },
  phone: { m: "call", label: "Phone" },
  calendar: { m: "calendar_month", label: "Calendar" },
  clock: { m: "schedule", label: "Clock" },
  camera: { m: "photo_camera", label: "Camera" },
  image: { m: "image", label: "Image" },
  folder: { m: "folder", label: "Folder" },
  file: { m: "description", label: "File" },
  download: { m: "download", label: "Download" },
  upload: { m: "upload", label: "Upload" },
  share: { m: "share", label: "Share" },
  link: { m: "link", label: "Link" },
  lock: { m: "lock", label: "Lock" },
  unlock: { m: "lock_open", label: "Unlock" },
  eye: { m: "visibility", label: "Eye" },
  "eye-off": { m: "visibility_off", label: "Eye off" },
  filter: { m: "filter_list", label: "Filter" },
  menu: { m: "menu", label: "Menu" },
  more: { m: "more_horiz", label: "More" },
  "chevron-right": { m: "chevron_right", label: "Chevron right" },
  "chevron-left": { m: "chevron_left", label: "Chevron left" },
  "arrow-left": { m: "arrow_back", label: "Arrow left" },
  "arrow-right": { m: "arrow_forward", label: "Arrow right" },
  "arrow-up": { m: "arrow_upward", label: "Arrow up" },
  "arrow-down": { m: "arrow_downward", label: "Arrow down" },
  cart: { m: "shopping_cart", label: "Cart" },
  bag: { m: "shopping_bag", label: "Bag" },
  credit: { m: "credit_card", label: "Card" },
  wallet: { m: "account_balance_wallet", label: "Wallet" },
  zap: { m: "bolt", label: "Zap" },
  cloud: { m: "cloud", label: "Cloud" },
  sun: { m: "light_mode", label: "Sun" },
  moon: { m: "dark_mode", label: "Moon" },
  globe: { m: "language", label: "Globe" },
  info: { m: "info", label: "Info" },
  alert: { m: "warning", label: "Alert" },
  flag: { m: "flag", label: "Flag" },
  tag: { m: "label", label: "Tag" },
  bookmark: { m: "bookmark", label: "Bookmark" },
  print: { m: "print", label: "Print" },
  copy: { m: "content_copy", label: "Copy" },
  clipboard: { m: "content_paste", label: "Clipboard" },
  "log-out": { m: "logout", label: "Log out" },
  "log-in": { m: "login", label: "Log in" },
  play: { m: "play_arrow", label: "Play" },
  pause: { m: "pause", label: "Pause" },
  skip: { m: "skip_next", label: "Skip" },
  volume: { m: "volume_up", label: "Volume" },
  mic: { m: "mic", label: "Mic" },
  map: { m: "map", label: "Map" },
  pin: { m: "location_on", label: "Pin" },
  navigation: { m: "navigation", label: "Navigation" },
  refresh: { m: "refresh", label: "Refresh" },
  sync: { m: "sync", label: "Sync" },
  history: { m: "history", label: "History" },
  "trash-2": { m: "delete_forever", label: "Trash 2" },
  "more-vertical": { m: "more_vert", label: "More vertical" },
  sparkles: { m: "auto_awesome", label: "Sparkles" },
  code: { m: "code", label: "Code" },
  terminal: { m: "terminal", label: "Terminal" },
  database: { m: "database", label: "Database" },
  server: { m: "dns", label: "Server" },
  cpu: { m: "memory", label: "CPU" },
  activity: { m: "monitor_heart", label: "Activity" },
  bar: { m: "bar_chart", label: "Bar chart" },
  pie: { m: "pie_chart", label: "Pie chart" },
  "trending-up": { m: "trending_up", label: "Trending up" },
  users: { m: "group", label: "Users" },
  "user-plus": { m: "person_add", label: "Add user" },
  building: { m: "apartment", label: "Building" },
  truck: { m: "local_shipping", label: "Truck" },
  package: { m: "inventory_2", label: "Package" },
  gift: { m: "card_giftcard", label: "Gift" },
  coffee: { m: "local_cafe", label: "Coffee" },
  music: { m: "music_note", label: "Music" },
  film: { m: "movie", label: "Film" },
  game: { m: "sports_esports", label: "Game" },
  book: { m: "menu_book", label: "Book" },
  "file-text": { m: "article", label: "Article" },
  hash: { m: "tag", label: "Hash" },
  at: { m: "alternate_email", label: "At" },
  "message-circle": { m: "chat_bubble", label: "Chat" },
  "phone-call": { m: "call", label: "Call" },
  headphones: { m: "headphones", label: "Headphones" },
  wifi: { m: "wifi", label: "Wi-Fi" },
  bluetooth: { m: "bluetooth", label: "Bluetooth" },
  battery: { m: "battery_full", label: "Battery" },
  printer: { m: "print", label: "Printer" },
  scan: { m: "qr_code_scanner", label: "Scan" },
  "sliders-horizontal": { m: "tune", label: "Sliders" },
  layers: { m: "layers", label: "Layers" },
  grid: { m: "grid_view", label: "Grid" },
  list: { m: "view_list", label: "List" },
  columns: { m: "view_column", label: "Columns" },
  maximize: { m: "fullscreen", label: "Maximize" },
  minimize: { m: "close_fullscreen", label: "Minimize" },
  "panel-left": { m: "left_panel_open", label: "Panel left" },
};

const HERO_MAP: Record<string, string> = {
  "academic-cap": "school",
  "adjustments-horizontal": "tune",
  "arrow-down-on-square": "download",
  "arrow-left-on-square": "logout",
  "arrow-right-on-square": "logout",
  "arrow-top-right-on-square": "open_in_new",
  "backspace": "backspace",
  "banknotes": "payments",
  "bars-3": "menu",
  "bell-alert": "notifications_active",
  bell: "notifications",
  "beaker": "science",
  "bug-ant": "bug_report",
  "building-library": "account_balance",
  "calculator": "calculate",
  calendar: "calendar_month",
  camera: "photo_camera",
  chart: "bar_chart",
  check: "check",
  "check-badge": "verified",
  "chevron-down": "keyboard_arrow_down",
  "chevron-left": "chevron_left",
  "chevron-right": "chevron_right",
  "chevron-up": "keyboard_arrow_up",
  circle: "radio_button_unchecked",
  "clipboard-document": "content_paste",
  clock: "schedule",
  cloud: "cloud",
  "code-bracket": "code",
  cog: "settings",
  "envelope-open": "mail",
  envelope: "mail",
  "exclamation-triangle": "warning",
  "eye-dropper": "colorize",
  eye: "visibility",
  "face-smile": "sentiment_satisfied",
  "film": "movie",
  folder: "folder",
  funnel: "filter_list",
  gift: "card_giftcard",
  "globe-alt": "language",
  "hand-thumb-up": "thumb_up",
  home: "home",
  identification: "badge",
  "information-circle": "info",
  key: "key",
  "lifebuoy": "support_agent",
  "light-bulb": "lightbulb",
  link: "link",
  lockClosed: "lock",
  lockOpen: "lock_open",
  magnifying: "search",
  "map-pin": "location_on",
  "megaphone": "campaign",
  "minus": "remove",
  moon: "dark_mode",
  "no-symbol": "block",
  "paper-clip": "attach_file",
  "paper-airplane": "send",
  pencil: "edit",
  "phone-arrow-down-left": "call_received",
  phone: "call",
  "photo": "image",
  "plus": "add",
  "presentation-chart": "present_to_all",
  printer: "print",
  "question-mark-circle": "help",
  "rocket-launch": "rocket_launch",
  "scissors": "content_cut",
  "server-stack": "dns",
  share: "share",
  "shopping-bag": "shopping_bag",
  "shopping-cart": "shopping_cart",
  "squares-2x2": "grid_view",
  star: "star",
  sun: "light_mode",
  "table-cells": "table_chart",
  "ticket": "confirmation_number",
  trash: "delete",
  "truck": "local_shipping",
  "user-circle": "account_circle",
  user: "person",
  "video-camera": "videocam",
  "wifi": "wifi",
  "x-mark": "close",
};

function lucideEntries(): IconEntry[] {
  return Object.entries(LUCIDE_MAP).map(([k, v]) => ({
    key: v.m,
    label: v.label,
    source: "lucide" as const,
    search: `${k} ${v.label} ${v.m} lucide`,
  }));
}

function heroEntries(): IconEntry[] {
  return Object.entries(HERO_MAP).map(([k, m]) => ({
    key: m,
    label: k.replace(/-/g, " "),
    source: "heroicons" as const,
    search: `${k} ${m} heroicons`,
  }));
}

let materialCache: IconEntry[] | null = null;

async function materialEntries(): Promise<IconEntry[]> {
  if (materialCache) return materialCache;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/material-symbols.json`);
    const data: unknown = await res.json();
    if (Array.isArray(data)) {
      materialCache = data.map((row) => {
        const r = row as { n?: string; t?: string };
        return {
          key: r.n ?? "",
          label: r.n ?? "",
          source: "material" as const,
          search: `${r.n ?? ""} ${r.t ?? ""}`.toLowerCase(),
        };
      }).filter((e) => e.key);
      return materialCache;
    }
  } catch {
    /* fallback empty */
  }
  materialCache = [];
  return materialCache;
}

export async function searchIcons(query: string, source: IconSource | "all", limit = 80): Promise<IconEntry[]> {
  const q = query.trim().toLowerCase();
  const curated = source === "all" || source === "lucide" || source === "heroicons";
  const needMaterial = source === "all" || source === "material";
  const pool: IconEntry[] = [];
  if (curated) {
    if (source === "all" || source === "lucide") pool.push(...lucideEntries());
    if (source === "all" || source === "heroicons") pool.push(...heroEntries());
  }
  if (needMaterial) {
    const mat = await materialEntries();
    if (source === "material") pool.push(...mat);
    else if (source === "all" && q.length >= 2) {
      /* material only when user typed something — full list is huge */
      pool.push(...mat.filter((e) => e.search.includes(q)));
    }
  }
  if (!q) return pool.slice(0, limit);
  const filtered = pool.filter((e) => e.search.includes(q) || e.key.includes(q) || e.label.toLowerCase().includes(q));
  return filtered.slice(0, limit);
}

export const ICON_SOURCE_OPTIONS: { key: IconSource | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "material", label: "Material" },
  { key: "lucide", label: "Lucide" },
  { key: "heroicons", label: "Heroicons" },
];
