/**
 * Browser verification for a process-flow diagram built with this skill.
 *
 *   npm i -D playwright && npx playwright install chromium
 *   BASE=http://localhost:5173 PATHNAME=/console/process node verify-flow.mjs
 *
 * In the presales kit: DEMO_COMPANY=<company-name> gets past the login page
 * (see demo-login.mjs), and VIEW=hexaa checks the second view.
 *
 * Asserts the rules the skill already sets out, all in GRAPH space (the
 * viewport transform is undone first, so results don't change with zoom):
 *
 *   - every line physically touches both cards it claims to join
 *   - no line crosses a card it has nothing to do with
 *   - every branch leaving the spine carries a label (an unlabelled decision
 *     output is an assumption the viewer has to make)
 *   - no two labels overlap, and no line is drawn through a label
 *   - nothing is zero-length or missing its path
 *   - no card's content overflows its box
 *
 * ── READ THIS BEFORE TRUSTING A NUMBER ────────────────────────────────────
 * Counting edge elements with a CSS selector from an automated browser
 * session returns STALE, WRONG answers: it can report zero edges while a
 * screenshot plainly shows them all there. A correct fix was once reverted
 * because of that reading and the bug had to be rediscovered later.
 *   - Count edges in the SERIALIZED MARKUP (`document.body.innerHTML.match`),
 *     which is reliable. This script does that as a cross-check.
 *   - ALWAYS take a screenshot and LOOK at it. Screenshots have caught things
 *     no assertion here catches. Trust the picture over a suspicious number.
 *
 * React Flow does NOT emit data-source / data-target on an edge. The only
 * reliable in-DOM record of an edge's endpoints is its generated aria-label,
 * "Edge from <source> to <target>". A check that reads data-source silently
 * passes on `undefined` and asserts nothing.
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { passLogin, openProcessFlow } from "./demo-login.mjs";

const BASE = process.env.BASE ?? "http://localhost:5173";
const PATHNAME = process.env.PATHNAME ?? "/";
const OUT = process.env.OUT ?? "shots";
mkdirSync(OUT, { recursive: true });

const pass = [];
const fail = [];
const check = (name, ok, detail = "") =>
  (ok ? pass : fail).push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

const consoleIssues = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") consoleIssues.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => consoleIssues.push(`[pageerror] ${e.message}`));

/** Everything read in one pass, converted into graph space. */
const readGraph = () =>
  page.evaluate(() => {
    const vpEl = document.querySelector(".react-flow__viewport");
    const m = new DOMMatrixReadOnly(getComputedStyle(vpEl).transform);
    const pane = document.querySelector(".react-flow").getBoundingClientRect();
    const toGraph = (px, py) => ({ x: (px - m.e) / m.a, y: (py - m.f) / m.d });
    const box = (el) => {
      const r = el.getBoundingClientRect();
      const a = toGraph(r.left - pane.left, r.top - pane.top);
      const b = toGraph(r.right - pane.left, r.bottom - pane.top);
      return { x: a.x, y: a.y, x2: b.x, y2: b.y };
    };

    const nodes = [...document.querySelectorAll(".react-flow__node")].map((el) => ({
      id: el.getAttribute("data-id"),
      type: (el.className.match(/react-flow__node-(\w+)/) || [])[1],
      ...box(el),
    }));

    const edges = [...document.querySelectorAll(".react-flow__edge")].map((el) => {
      const p = el.querySelector("path.react-flow__edge-path");
      const id = el.getAttribute("data-id");
      // aria-label is the ONLY reliable endpoint record — see header note.
      const mm = (el.getAttribute("aria-label") || "").match(/^Edge from (.+) to (.+)$/);
      const source = mm ? mm[1] : null;
      const target = mm ? mm[2] : null;
      if (!p) return { id, source, target, noPath: true, pts: [] };
      const L = p.getTotalLength();
      const pts = [];
      for (let d = 0; d <= L; d += 5) {
        const q = p.getPointAtLength(d);
        pts.push({ x: q.x, y: q.y });
      }
      const a = p.getPointAtLength(0);
      const b = p.getPointAtLength(L);
      return { id, source, target, len: L, start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y }, pts };
    });

    const labels = [...document.querySelectorAll(".react-flow__edgelabel-renderer > div")]
      .map((el) => ({ text: el.textContent.trim(), ...box(el) }))
      .filter((l) => l.text);

    // Cross-check the selector count against the serialized markup, because
    // the selector count can come back stale from an automated session.
    const markupCount = (document.body.innerHTML.match(/react-flow__edge /g) || []).length;

    // content overflow, measured against real content children only: the
    // connection handles sit 5px outside every edge on purpose and would
    // otherwise report a constant false +10px on every card
    const overflow = [...document.querySelectorAll(".react-flow__node-phase, .react-flow__node-step")]
      .map((el) => {
        const card = el.firstElementChild;
        if (!card) return { id: el.getAttribute("data-id"), over: 0 };
        const kids = [...card.children].filter(
          (k) => !k.className.toString().includes("react-flow__handle"),
        );
        const bottom = Math.max(0, ...kids.map((k) => k.offsetTop + k.offsetHeight));
        return { id: el.getAttribute("data-id"), over: Math.round(bottom - card.clientHeight) };
      })
      .filter((r) => r.over > 1);

    return { nodes, edges, labels, markupCount, overflow };
  });

const byId = (nodes, id) => nodes.find((n) => n.id === id);
const hit = (a, b, inset = 0) =>
  a.x < b.x2 - inset && a.x2 > b.x + inset && a.y < b.y2 - inset && a.y2 > b.y + inset;
const gap = (pt, b) =>
  Math.hypot(Math.max(b.x - pt.x, 0, pt.x - b.x2), Math.max(b.y - pt.y, 0, pt.y - b.y2));

await page.goto(`${BASE}${PATHNAME}`, { waitUntil: "networkidle" });
await passLogin(page);
await openProcessFlow(page);
await page.waitForSelector(".react-flow__node", { timeout: 15000 });
await page.waitForTimeout(1500);

/** Run every geometric assertion against the current on-screen state. */
async function audit(phase) {
  const g = await readGraph();
  const cards = g.nodes.filter((n) => n.type === "phase" || n.type === "step");

  check(`[${phase}] selector edge count matches the markup`, g.edges.length === g.markupCount,
    `selector ${g.edges.length} vs markup ${g.markupCount} — if these disagree, TRUST THE MARKUP`);
  check(`[${phase}] no edge is missing its path`, !g.edges.some((e) => e.noPath));
  check(`[${phase}] no zero-length edge paths`, !g.edges.some((e) => !e.noPath && e.len < 1));
  check(`[${phase}] every edge reports its endpoints`, g.edges.every((e) => e.source && e.target));

  const detached = g.edges
    .filter((e) => !e.noPath)
    .map((e) => {
      const sb = byId(g.nodes, e.source);
      const tb = byId(g.nodes, e.target);
      if (!sb || !tb) return null;
      const ds = gap(e.start, sb);
      const dt = gap(e.end, tb);
      return ds > 3 || dt > 3 ? `${e.id} start+${ds.toFixed(0)} end+${dt.toFixed(0)}` : null;
    })
    .filter(Boolean);
  check(`[${phase}] every line touches both of its cards`, detached.length === 0, detached.slice(0, 5).join(", "));

  const crossing = [];
  for (const e of g.edges) {
    if (e.noPath) continue;
    for (const c of cards) {
      if (c.id === e.source || c.id === e.target) continue;
      if (e.pts.some((p) => p.x > c.x + 6 && p.x < c.x2 - 6 && p.y > c.y + 6 && p.y < c.y2 - 6)) {
        crossing.push(`${e.id} through ${c.id}`);
        break;
      }
    }
  }
  check(`[${phase}] no line crosses an unrelated card`, crossing.length === 0, crossing.slice(0, 5).join(", "));

  // every branch leaving the spine must be labelled. A branch is any edge whose
  // endpoints are not level with each other: on a one-line layout that is
  // exactly the set that goes to or returns from an off-line card.
  const spineY = (() => {
    const counts = {};
    for (const c of cards) counts[Math.round(c.y / 10)] = (counts[Math.round(c.y / 10)] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? Number(top[0]) * 10 : 0;
  })();
  const onSpine = (id) => {
    const c = cards.find((n) => n.id === id);
    return c ? Math.abs(c.y - spineY) < 12 : true;
  };
  const labelled = new Set(g.labels.map((l) => l.text));
  const unlabelledBranches = g.edges
    .filter((e) => !e.noPath && (!onSpine(e.source) || !onSpine(e.target)))
    .filter((e) => !g.labels.some((lb) => e.pts.some((p) => Math.abs(p.x - (lb.x + lb.x2) / 2) < 80 && Math.abs(p.y - (lb.y + lb.y2) / 2) < 60)))
    .map((e) => e.id);
  check(`[${phase}] every branch off the line carries a label`, unlabelledBranches.length === 0,
    unlabelledBranches.slice(0, 5).join(", "));
  check(`[${phase}] at most one card above and one below the line`,
    cards.filter((c) => c.type === "phase" && c.y < spineY - 12).length <= 1 &&
    cards.filter((c) => c.type === "phase" && c.y > spineY + 12).length <= 1,
    "more than one lifted card per side stops the spine reading as a line");
  void labelled;

  // LINE vs LINE: two edges touching, overlapping or crossing anywhere except
  // right at a card they both use (a merge into, or a fork out of, one card).
  // The usual cause is a rejoin drawn up from the top of a side card, which
  // retraces the branch line that drops into the same point.
  const touching = []
  for (let i = 0; i < g.edges.length; i++)
    for (let j = i + 1; j < g.edges.length; j++) {
      const A = g.edges[i], B = g.edges[j]
      if (A.noPath || B.noPath) continue
      if (A.source === B.source && A.target?.includes("::") && B.target?.includes("::")) continue
      const shared = [A.source, A.target].filter((id) => id === B.source || id === B.target)
        .map((id) => byId(g.nodes, id)).filter(Boolean)
      const near = (p) => shared.some((c) => gap(p, c) < 30)
      const n = A.pts.filter((p) => !near(p) && B.pts.some((q) => Math.abs(p.x - q.x) < 3 && Math.abs(p.y - q.y) < 3)).length
      if (n) touching.push(`${A.id} x ${B.id}`)
    }
  check(`[${phase}] no two lines touch, overlap or cross`, touching.length === 0, touching.slice(0, 5).join(", "))

  const struck = g.labels
    .filter((lb) => g.edges.some((e) => !e.noPath && e.pts.some((p) => p.x > lb.x && p.x < lb.x2 && p.y > lb.y && p.y < lb.y2)))
    .map((l) => l.text);
  check(`[${phase}] no line is drawn through a label`, struck.length === 0, [...new Set(struck)].join(", "));

  const buried = g.labels.filter((lb) => cards.some((c) => hit(lb, c, 1))).map((l) => l.text);
  check(`[${phase}] no label is hidden behind a card`, buried.length === 0, buried.join(", "));

  const collided = [];
  for (let i = 0; i < g.labels.length; i++)
    for (let j = i + 1; j < g.labels.length; j++)
      if (hit(g.labels[i], g.labels[j])) collided.push(`${g.labels[i].text} / ${g.labels[j].text}`);
  check(`[${phase}] no two labels overlap`, collided.length === 0, collided.join(", "));

  check(`[${phase}] no card content overflows its box`, g.overflow.length === 0,
    g.overflow.map((o) => `${o.id}:+${o.over}`).join(", "));

  await page.screenshot({ path: `${OUT}/${phase}.png` });
  return g;
}

await audit("collapsed");

/* Expanding is where the node/edge sync bug shows: the spine edges to the
   brand-new step cards must all be present, not silently discarded. */
const chevron = page.locator('.react-flow__node-phase button[aria-label="Open the detail"]').first();
if (await chevron.count()) {
  await chevron.click();
  await page.waitForTimeout(1600);
  const g = await audit("expanded-one");
  const steps = g.nodes.filter((n) => n.type === "step").length;
  const spine = g.edges.filter((e) => e.target && e.target.includes("::")).length;
  check("every revealed step has a connector (node/edge sync)", steps > 0 && spine === steps,
    `${steps} steps vs ${spine} spine edges`);
}

const expandAll = page.locator('button[title="Open every card\'s detail"]');
if (await expandAll.count()) {
  await expandAll.click();
  await page.waitForTimeout(1900);
  const g = await audit("expanded-all");
  const steps = g.nodes.filter((n) => n.type === "step").length;
  const spine = g.edges.filter((e) => e.target && e.target.includes("::")).length;
  check("every step has a connector when fully expanded (node/edge sync)", steps > 0 && spine === steps,
    `${steps} steps vs ${spine} spine edges`);
}

console.log("\n================ RESULTS ================");
for (const p of pass) console.log(p);
if (fail.length) {
  console.log("\n---------------- FAILURES ---------------");
  for (const f of fail) console.log(f);
}
const real = consoleIssues.filter((c) => !/Download the React DevTools|source-?map/i.test(c));
console.log("\n---------------- CONSOLE ----------------");
console.log(real.length ? real.slice(0, 15).join("\n") : "clean");
console.log(`\n${pass.length} passed, ${fail.length} failed`);
console.log(`Screenshots in ./${OUT} — LOOK AT THEM. They catch what assertions don't.`);

await browser.close();
process.exit(fail.length ? 1 : 0);
