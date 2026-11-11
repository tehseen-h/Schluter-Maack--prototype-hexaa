/**
 * Browser verification for DRAGGING cards on the process-flow page: that a
 * card moves and the canvas does not, that its lines follow it and stay
 * readable, and that nothing else about the diagram changes.
 *
 *   npm i -D playwright && npx playwright install chromium
 *   npm run dev
 *   node skills/process-flow-diagram/reference/verify-drag.mjs              # "How it runs today"
 *   VIEW=hexaa node skills/process-flow-diagram/reference/verify-drag.mjs   # "Where we would help"
 *
 * Env: BASE (default http://localhost:5173), VIEW (today | hexaa),
 * CHROME (optional path to a Chromium/Chrome executable), OUT (screenshots),
 * DEMO_COMPANY (the company name, to get past the login page; see demo-login.mjs).
 *
 * It drives the page like a person on a call would:
 *   - presses on empty canvas and drags: the whole view must pan
 *   - clicks a card: the editor must open and the card must not move
 *   - drags a card below the line, onto another card, above the line, then a
 *     second card; opens every card's steps; reloads; puts the cards back
 * and after every step audits the canvas, in graph space:
 *   - every line touches both of its cards
 *   - no line runs through a card it does not join
 *   - no line runs on top of another, or ends in line with another a hair
 *     apart (two lines that read as one)
 *   - no label has a line through it, sits on a card, or overlaps a label
 *   - no two cards overlap (a dropped card is settled clear of the others)
 * plus: with nothing moved, NO line is router-drawn (the diagram is exactly
 * the hand-tuned one), and "Put cards back in line" restores it exactly.
 *
 * Crossings are reported as WARN, not FAIL: a card dropped into a pocket the
 * other lines enclose cannot be reached without crossing one of them. Look at
 * the screenshot for every WARN and decide whether the crossing was forced.
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { passLogin, openProcessFlow } from './demo-login.mjs'

const VIEW = process.env.VIEW ?? 'today'
const BASE = process.env.BASE ?? 'http://localhost:5173'
const OUT = process.env.OUT ?? `shots-drag-${VIEW}`
mkdirSync(OUT, { recursive: true })

const results = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`)
const warn = (name, detail) => results.push(`WARN  ${name}  -- ${detail}`)

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

await page.goto(BASE, { waitUntil: 'networkidle' })
await passLogin(page)
// start from the original diagram, but stay logged in
await page.evaluate(() => Object.keys(localStorage).filter((k) => !k.startsWith('hexaa-demo-access')).forEach((k) => localStorage.removeItem(k)))
await page.reload({ waitUntil: 'networkidle' })

const openFlow = () => openProcessFlow(page)
await openFlow()

/** Everything on the canvas in graph space, each line sampled every 2px. */
const graph = () =>
  page.evaluate(() => {
    const vp = document.querySelector('.react-flow__viewport')
    const m = new DOMMatrixReadOnly(getComputedStyle(vp).transform)
    const pane = document.querySelector('.react-flow').getBoundingClientRect()
    const G = (px, py) => ({ x: (px - pane.left - m.e) / m.a, y: (py - pane.top - m.f) / m.d })
    const box = (el) => {
      const r = el.getBoundingClientRect()
      const a = G(r.left, r.top)
      const b = G(r.right, r.bottom)
      return { x: a.x, y: a.y, x2: b.x, y2: b.y }
    }
    const nodes = [...document.querySelectorAll('.react-flow__node')].map((el) => ({
      id: el.getAttribute('data-id'),
      type: (el.className.match(/react-flow__node-(\w+)/) || [])[1],
      ...box(el),
    }))
    // React Flow puts no data-source/target on an edge; its aria-label is the
    // only reliable record of the two ends.
    const edges = [...document.querySelectorAll('.react-flow__edge')].map((el) => {
      const p = el.querySelector('path.react-flow__edge-path')
      const mm = (el.getAttribute('aria-label') || '').match(/^Edge from (.+) to (.+)$/)
      const L = p.getTotalLength()
      const pts = []
      for (let d = 0; d <= L; d += 2) {
        const q = p.getPointAtLength(d)
        pts.push({ x: q.x, y: q.y })
      }
      const a = p.getPointAtLength(0)
      const b = p.getPointAtLength(L)
      return {
        id: el.getAttribute('data-id'),
        source: mm?.[1],
        target: mm?.[2],
        routed: el.classList.contains('rerouted'),
        start: { x: a.x, y: a.y },
        end: { x: b.x, y: b.y },
        pts,
      }
    })
    const labels = [...document.querySelectorAll('.react-flow__edgelabel-renderer > div')]
      .map((el) => ({ text: el.textContent.trim(), ...box(el) }))
      .filter((l) => l.text)
    return { nodes, edges, labels, vp: { x: m.e, y: m.f, zoom: m.a } }
  })

const gap = (p, b) => Math.hypot(Math.max(b.x - p.x, 0, p.x - b.x2), Math.max(b.y - p.y, 0, p.y - b.y2))
const hit = (a, b, inset = 0) => a.x < b.x2 - inset && a.x2 > b.x + inset && a.y < b.y2 - inset && a.y2 > b.y + inset
const runDir = (pts, i) => {
  const a = pts[Math.max(0, i - 2)]
  const b = pts[Math.min(pts.length - 1, i + 2)]
  return Math.abs(a.y - b.y) < 0.3 ? 'h' : Math.abs(a.x - b.x) < 0.3 ? 'v' : 'c'
}

async function audit(tag) {
  const g = await graph()
  const byId = (id) => g.nodes.find((n) => n.id === id)

  const detached = g.edges
    .filter((e) => {
      const s = byId(e.source)
      const t = byId(e.target)
      return !s || !t || gap(e.start, s) > 3 || gap(e.end, t) > 3
    })
    .map((e) => e.id)
  check(`[${tag}] every line touches both of its cards`, !detached.length, detached.join(', '))

  const through = []
  for (const e of g.edges)
    for (const c of g.nodes) {
      if (c.id === e.source || c.id === e.target) continue
      if (e.pts.some((p) => p.x > c.x + 4 && p.x < c.x2 - 4 && p.y > c.y + 4 && p.y < c.y2 - 4)) {
        through.push(`${e.id} through ${c.id}`)
        break
      }
    }
  check(`[${tag}] no line runs through a card it does not join`, !through.length, through.slice(0, 4).join(', '))

  // A run of more than 8px together is one line drawn on another; a brief
  // meeting is a crossing. A card's own step connectors share one trunk by
  // design, so siblings are not compared.
  const onTop = []
  const crossings = []
  const endToEnd = []
  for (let i = 0; i < g.edges.length; i++)
    for (let j = i + 1; j < g.edges.length; j++) {
      const A = g.edges[i]
      const B = g.edges[j]
      if (A.source === B.source && A.target?.includes('::') && B.target?.includes('::')) continue
      const sharedIds = [A.source, A.target].filter((id) => id === B.source || id === B.target)
      const shared = sharedIds.map(byId).filter(Boolean)
      const near = (p) => shared.some((c) => gap(p, c) < 30)
      let run = 0
      let longest = 0
      let meets = 0
      for (const p of A.pts) {
        if (!near(p) && B.pts.some((q) => Math.abs(p.x - q.x) < 2.5 && Math.abs(p.y - q.y) < 2.5)) {
          if (!run) meets++
          run++
          longest = Math.max(longest, run)
        } else run = 0
      }
      if (longest * 2 > 8) onTop.push(`${A.id} on ${B.id}`)
      else if (meets) crossings.push(`${A.id} x ${B.id}`)
      if (sharedIds.length) continue
      search: for (let a = 0; a < A.pts.length; a++) {
        const da = runDir(A.pts, a)
        if (da === 'c') continue
        const p = A.pts[a]
        for (let b = 0; b < B.pts.length; b++) {
          const q = B.pts[b]
          const along = da === 'h' ? Math.abs(p.x - q.x) : Math.abs(p.y - q.y)
          const across = da === 'h' ? Math.abs(p.y - q.y) : Math.abs(p.x - q.x)
          if (across < 1.5 && along > 3 && along < 36 && runDir(B.pts, b) === da) {
            endToEnd.push(`${A.id} / ${B.id}`)
            break search
          }
        }
      }
    }
  check(`[${tag}] no line runs on top of another`, !onTop.length, onTop.slice(0, 6).join(', '))
  check(`[${tag}] no two lines meet end to end (reading as one)`, !endToEnd.length, endToEnd.join(', '))
  if (crossings.length) warn(`[${tag}] lines cross, check the screenshot`, crossings.join(', '))

  const struck = g.labels
    .filter((lb) => g.edges.some((e) => e.pts.some((p) => p.x > lb.x + 1 && p.x < lb.x2 - 1 && p.y > lb.y + 1 && p.y < lb.y2 - 1)))
    .map((l) => l.text)
  check(`[${tag}] no label has a line through it`, !struck.length, [...new Set(struck)].join(', '))
  const buried = g.labels.filter((lb) => g.nodes.some((c) => hit(lb, c, 1))).map((l) => l.text)
  check(`[${tag}] no label sits on a card`, !buried.length, buried.join(', '))
  const pairs = []
  for (let i = 0; i < g.labels.length; i++)
    for (let j = i + 1; j < g.labels.length; j++) if (hit(g.labels[i], g.labels[j])) pairs.push(`${g.labels[i].text}/${g.labels[j].text}`)
  check(`[${tag}] no two labels overlap`, !pairs.length, pairs.join(', '))

  const cards = g.nodes.filter((n) => n.type === 'phase' || n.type === 'step')
  const stacked = []
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) if (hit(cards[i], cards[j], 1)) stacked.push(`${cards[i].id}/${cards[j].id}`)
  check(`[${tag}] no two cards overlap`, !stacked.length, stacked.join(', '))

  await page.screenshot({ path: `${OUT}/${tag}.png` })
  return g
}

/** A point inside the card, clear of its connection handles and its chip. */
const centre = async (id) => {
  const r = await page.locator(`.react-flow__node[data-id="${id}"]`).boundingBox()
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 + 8 }
}
const nodePos = async (id) => (await graph()).nodes.find((n) => n.id === id)

async function drag(id, dx, dy, steps = 24) {
  await page.evaluate(() => {
    window.__longTasks = []
    if (!window.__ltObs) {
      window.__ltObs = new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__longTasks.push(e.duration)))
      window.__ltObs.observe({ type: 'longtask' })
    }
  })
  const c = await centre(id)
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(c.x + (dx * i) / steps, c.y + (dy * i) / steps)
  await page.mouse.up()
  await page.waitForTimeout(500)
  const lt = await page.evaluate(() => window.__longTasks ?? [])
  check(`[speed] dragging ${id}: no frame blocked for 100ms or more`, lt.every((d) => d < 100), lt.map((d) => `${d.toFixed(0)}ms`).join(', '))
}

// 0. nothing moved: the diagram is exactly the hand-tuned one
const base = await audit('0-baseline')
const ids = base.nodes.filter((n) => n.type === 'phase').map((n) => n.id)
const at = (i) => ids[Math.min(i, ids.length - 1)]
check('[untouched] with nothing moved, no line is router-drawn', base.edges.every((e) => !e.routed))
{
  const expand = page.locator('button[title="Open every card\'s detail"]')
  if (await expand.count()) {
    await expand.click()
    await page.waitForTimeout(1500)
    const g = await audit('0b-baseline-expanded')
    check('[untouched] ...and with every card opened', g.edges.every((e) => !e.routed))
    await page.locator('button[title="Back to the high-level view"]').click()
    await page.waitForTimeout(1500)
  }
}

// 1. a press on empty canvas pans the whole view
{
  const before = (await graph()).vp
  await page.mouse.move(800, 880)
  await page.mouse.down()
  await page.mouse.move(700, 820, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const after = (await graph()).vp
  check('[pan] dragging empty canvas moves the whole view', Math.abs(after.x - before.x) > 50 && Math.abs(after.y - before.y) > 30)
  const a = base.nodes.find((n) => n.id === at(2))
  const b = await nodePos(at(2))
  check('[pan] cards keep their place in the diagram', Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1)
}

// 2. a click on a card opens the editor and leaves the card where it is
{
  const c = await centre(at(1))
  const before = await nodePos(at(1))
  await page.mouse.click(c.x, c.y)
  await page.waitForTimeout(500)
  const after = await nodePos(at(1))
  check('[click] clicking a card opens the editor', (await page.getByText('Changes save as you type').count()) > 0)
  check('[click] clicking does not move the card', Math.abs(before.x - after.x) < 1 && Math.abs(before.y - after.y) < 1)
  await page.mouse.click(700, 930) // close the editor on empty canvas
  await page.waitForTimeout(500)
}

// 3. drag a card well below the line
const mover = at(3)
{
  const vp0 = (await graph()).vp
  const p0 = await nodePos(mover)
  await drag(mover, 60, 320)
  const p1 = await nodePos(mover)
  const vp1 = (await graph()).vp
  check('[drag] the card moves with the pointer', Math.abs(p1.y - p0.y) > 200)
  check('[drag] the view does not pan while a card is dragged', Math.abs(vp1.x - vp0.x) < 1 && Math.abs(vp1.y - vp0.y) < 1)
  await audit('3-dragged-below')
}

// 4. drop it right on top of another card: it must settle clear of it
{
  const t = await centre(at(6))
  const c = await centre(mover)
  await drag(mover, t.x - c.x, t.y - c.y - 8)
  await audit('4-dropped-on-a-card')
}

// 5. above the line
{
  const a = await centre(at(1))
  const c = await centre(mover)
  await drag(mover, a.x - c.x + 120, a.y - c.y - 330)
  await audit('5-dragged-above')
}

// 6. a second card, right and down
await drag(at(ids.length - 2), 260, 360)
await audit('6-two-moved')

// 7. every card opened, with cards moved
{
  const expand = page.locator('button[title="Open every card\'s detail"]')
  if (await expand.count()) {
    await expand.click()
    await page.waitForTimeout(1500)
    await audit('7-expanded-all')
    await page.locator('button[title="Back to the high-level view"]').click()
    await page.waitForTimeout(1200)
  }
}

// 8. a reload keeps every card where it was put
{
  const before = await nodePos(mover)
  await page.reload({ waitUntil: 'networkidle' })
  await openFlow()
  const after = await nodePos(mover)
  check('[reload] moved cards stay where they were put', Math.abs(before.x - after.x) < 1 && Math.abs(before.y - after.y) < 1)
}

// 9. "Put cards back in line" restores the original diagram exactly
{
  await page.getByRole('button', { name: /More/ }).click()
  await page.getByText('Put cards back in line').click()
  await page.waitForTimeout(1200)
  const g = await graph()
  const sameCards = base.nodes
    .filter((n) => n.type === 'phase')
    .every((n) => {
      const m = g.nodes.find((x) => x.id === n.id)
      return m && Math.abs(m.x - n.x) < 1 && Math.abs(m.y - n.y) < 1
    })
  const sameLines = base.edges.every((e) => {
    const f = g.edges.find((x) => x.id === e.id)
    return f && f.pts.length === e.pts.length && f.pts.every((p, i) => Math.abs(p.x - e.pts[i].x) < 1 && Math.abs(p.y - e.pts[i].y) < 1)
  })
  check('[put back] every card is back on its slot', sameCards)
  check('[put back] every line is the original hand-tuned line again', sameLines)
  await audit('9-put-back')
}

check('no page errors', !errors.length, errors.slice(0, 3).join(' | '))

console.log(results.join('\n'))
const fails = results.filter((r) => r.startsWith('FAIL')).length
const warns = results.filter((r) => r.startsWith('WARN')).length
console.log(`\n${results.length - fails - warns} passed, ${fails} failed, ${warns} warnings`)
console.log(`Screenshots in ./${OUT}. LOOK AT THEM, and at every WARN.`)
await browser.close()
process.exit(fails ? 1 : 0)
