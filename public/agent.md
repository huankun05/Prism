# Prism: sketches from an AI agent (beta)

Prism (https://github.com/huankun05/Prism) is a browser editor for semantic UI screens (Material 3 Expressive–style parts today). A design is one JSON document. You, the agent, write that document and hand it back; the person opens it on their canvas, refines it, and turns it into a prompt for a coding tool.

Forked from M3E Canvas (MIT © lnkiai). This format is in beta. Fields may be added; existing ones keep their meaning.

## What to deliver

**Reply with a share link.** If you cannot run code, reply with the JSON document itself in a code block; the person saves it as a `.json` file and opens it with **Open project**. Either way, **do not verify, decode, or round-trip your output**: the app checks the document when it opens and tells the person what is wrong, so your checks add nothing.

To make the link:

1. Save the document to a file, for example `design.json`. Do not inline it in a shell command; quoting breaks in PowerShell and long shells.
2. Run one of these on the file and reply with the printed link.

```js
// Node (link.mjs): node link.mjs design.json
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
const json = readFileSync(process.argv[2], "utf8");
// Replace origin with wherever Prism is hosted once a public URL is fixed.
console.log("https://huankun05.github.io/Prism/#docz=" + deflateRawSync(json).toString("base64url"));
```

```python
# Python (link.py): python link.py design.json
import sys, zlib, base64
data = open(sys.argv[1], "rb").read()
c = zlib.compressobj(9, zlib.DEFLATED, -15)          # raw deflate, no header
raw = c.compress(data) + c.flush()
print("https://huankun05.github.io/Prism/#docz=" + base64.urlsafe_b64encode(raw).decode().rstrip("="))
```

The link is long (a few thousand characters for a few screens). That is expected; it carries the whole design and nothing is stored anywhere.

Keep the document under about 100 KB. An `image` part may carry `"src": "https://…"` pointing at a picture on the web; do not embed image data.

Rough placement is fine. The person presses **Tidy** and bars snap to the edges, neighbouring parts fuse into connected runs, and the rest stacks on 16dp margins. Spend your effort on the right parts, sensible labels, and the navigation between screens.

## The document

```jsonc
{
  "title": "Recipes",              // the app's name
  "brief": "Save and search recipes.",   // one or two sentences on what the app is for (optional)
  "frame": "phone",                // always "phone"
  "platform": "android",           // "android" (default) or "web"
  "paletteKey": "purple",          // "purple" | "blue" | "green" | "coral" | "amber" | "teal" | "mono"
  "theme": { "dark": false, "bothModes": true, "contrast": "standard", "shape": "rounded", "font": "roboto", "emphasized": false, "motion": "expressive" },
  "frames": [ /* screens */ ],
  "groups": [ /* parts, bottom layer first */ ]
}
```

`theme` is optional. `contrast`: `standard | medium | high`. `shape`: `square | rounded | full`. `font`: `roboto | robotoFlex | robotoSerif | system`. `motion`: `standard | expressive`. `bothModes: true` asks for light and dark; `dark` picks which one the canvas shows.

### Screens (`frames`)

A phone screen is **412 × 892**; a desktop screen is **1280 × 800** (set `w` and `h`). Place screens side by side on the canvas, 80 apart:

```json
{ "id": "home", "name": "Home", "x": 0, "y": 0, "note": "Lists the saved recipes." }
{ "id": "detail", "name": "Recipe", "x": 492, "y": 0 }
{ "id": "settings", "name": "Settings", "x": 984, "y": 0, "swipe": { "left": "home" } }
```

- `id`: any unique string. `name`: what the screen is called in the prompt.
- `note` (optional): what the screen is for, in a sentence. It goes into the prompt.
- `bg` (optional): background token, one of `surface | surfaceContainerLow | surfaceContainer | surfaceContainerHigh | surfaceContainerHighest | primaryContainer | secondaryContainer | tertiaryContainer | primary | inverseSurface`.
- `swipe` (optional): screens reached by swiping `left | right | up | down`.
- `place` (optional): where the body rows sit between the bars when the screen is tidied: `top` (default) | `center` | `bottom` | `spread`. Goes into the prompt too.

### Parts (`groups`)

Every part sits in a **group**. A group is one part, or a **connected run** of parts of one family drawn as a unit: buttons side by side (`"axis": "x"`), list items stacked (`"axis": "y"`). Coordinates are **canvas coordinates**, so add the screen's `x` and `y`. Later groups draw on top of earlier ones.

```json
{ "id": "g1", "x": 0, "y": 0, "axis": "x", "items": [ { "id": "bar", "kind": "topAppBar", "label": "Recipes", "icon": "menu", "icon2": "search", "variant": "filled" } ] }
```

For the full part field reference (kinds, variants, actions, toggles, etc.), follow the original M3E Canvas agent guide conventions; this document stays aligned with the app’s `Doc` JSON loader (`lib/project.ts`).
