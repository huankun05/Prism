/**
 * Staged player demo: send progressive designs so the canvas builds up
 * when Apply mode = 分步 / Staged.
 */
const BRIDGE = `http://127.0.0.1:${process.env.PRISM_BRIDGE_PORT || 7331}`;
const full = await import("./demo-player.mjs").catch(() => null);
// demo-player applies immediately; rebuild staged from the same object by re-reading file
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "demo-player.mjs"), "utf8");
const m = src.match(/const design = (\{[\s\S]*?\n\});/);
if (!m) throw new Error("design not found");
const design = eval(`(${m[1]})`);

const apply = async (d) => {
  const res = await fetch(`${BRIDGE}/v1/apply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ design: d }),
  });
  console.log(res.status, await res.json());
  await new Promise((r) => setTimeout(r, 450));
};

// 1 frames only
await apply({ ...design, groups: [] });
// 2 chrome
await apply({ ...design, groups: design.groups.filter((g) => ["g1", "g6", "g5"].includes(g.id)) });
// 3 + content lists
await apply({ ...design, groups: design.groups.filter((g) => ["g1", "g5", "g6", "g2", "g3", "g4"].includes(g.id)) });
// 4 full player
await apply(design);
