/**
 * Orthogonal line router, used once a card has been moved by hand.
 *
 * The hand-tuned routes in flowEdges.tsx assume every card sits where
 * `layout()` put it. Drag one card anywhere and those assumptions break: a
 * line can run straight through another card, double back on itself, or sit
 * on top of a line that was already there. This module draws those lines
 * instead, with three rules in priority order:
 *
 *   1. Never through a card. Every card is an obstacle, inflated by CLEAR,
 *      including the two the line joins (it leaves and enters by a short stub
 *      out of a side, never through the card's own body).
 *   2. Never on top of another line, and cross one only when there is no way
 *      round. Lines already drawn are registered first; running along one
 *      costs far more than any detour, crossing one costs more than a long
 *      detour, and every existing line gets a parallel track beside it so a
 *      second line has somewhere tidy to go.
 *   3. Then short and calm: few bends, and the side the edge was drawn from
 *      (right for the main line) preferred unless another side is clearly
 *      better.
 *
 * The search is A* over a sparse grid built only from the coordinates that
 * matter (obstacle borders, the gaps between them, the stubs, the tracks
 * beside existing lines), limited to the region around the two cards and
 * widened only if no route exists there. That keeps it fast enough to run on
 * every frame of a drag.
 */

export type Side = 'top' | 'right' | 'bottom' | 'left'

export interface Pt {
  x: number
  y: number
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
  /**
   * Sides whose border is a straight edge the full length of the box. A line
   * may attach anywhere along those, so a busy side spreads its lines out
   * instead of stacking them on one point. A side left out (a diamond's, a
   * pill's rounded end) only has its midpoint on the outline. Default: all.
   */
  flat?: Side[]
}

export interface Rect {
  x1: number
  y1: number
  x2: number
  y2: number
}

export type LabelPlace = 'above' | 'below' | 'left' | 'right'

/** Where a label chip goes: a point on the line and which side of it. */
export interface LabelSpot {
  x: number
  y: number
  place: LabelPlace
}

/* ---------------------------------- tuning --------------------------------- */

/** How close a line may run to a card it does not touch. */
const CLEAR = 10
/**
 * A card's "N steps" chip sits 8px proud of its top edge, outside the box
 * React Flow knows about. Lines and labels keep that much further off a top.
 */
const TOP_CHIP = 8

/** A card's box grown by `m` on every side, plus the chip above it. */
const cardRect = (b: Box, m: number): Rect => ({ x1: b.x - m, y1: b.y - m - TOP_CHIP, x2: b.x + b.w + m, y2: b.y + b.h + m })
/** Longest straight run out of a card before the first turn. */
const STUB_MAX = 18
const BEND = 34
/** Worth a detour of about this many pixels to avoid one crossing. */
const CROSS = 420
const OVERLAP = 900
/** Spacing of the parallel track laid beside every existing line. */
const TRACK = 22
/**
 * Two lines in line with each other, closer end to end than this, read as
 * one. Generous on purpose: at the zoom a whole line is shown at, 40px is
 * about 25 on screen. Lines through a card are never this close (the card's
 * own width sits between them).
 */
const END_GAP = 40
const END_TO_END = 380
const SIDE_OFF_PREF = 46
/** Two lines leaving or entering one point read as one line. Avoid hard. */
const PORT_SHARED = 420
/** A line running under a label hides part of both. As bad as a crossing. */
const LABEL_HIT = 420
/**
 * Extra attachment points either side of the midpoint, on a flat side. Off
 * centre reads as untidy, so it costs more than a short detour and is only
 * taken to keep a line from sharing a point with another.
 */
const PORT_SPREAD = 30
const OFF_CENTRE = 90
/** A line running right along a card's border, when it could stand off. */
const HUG = 0.35
/** Where a line stands off a card when there is room: CLEAR plus this. */
const COMFORT = 18

/** Label chip size, matching the rendered chip (9.5px semibold, px-1.5 py-0.5). */
export const chipSize = (text: string) => ({ w: Math.round(text.length * 5.7 + 14), h: 19 })

/** The box a chip covers when it sits at `s`, using the renderer's own gaps. */
export function labelRectOf(s: LabelSpot, text: string): Rect {
  const { w, h } = chipSize(text)
  switch (s.place) {
    case 'above':
      return { x1: s.x - w / 2, y1: s.y - 6 - h, x2: s.x + w / 2, y2: s.y - 6 }
    case 'below':
      return { x1: s.x - w / 2, y1: s.y + 6, x2: s.x + w / 2, y2: s.y + 6 + h }
    case 'left':
      return { x1: s.x - 9 - w, y1: s.y - h / 2, x2: s.x - 9, y2: s.y + h / 2 }
    case 'right':
      return { x1: s.x + 9, y1: s.y - h / 2, x2: s.x + 9 + w, y2: s.y + h / 2 }
  }
}

/** Is the point on the border of the box (where every line has to end)? */
export const onBorder = (p: Pt, b: Box) =>
  p.x >= b.x - 0.5 &&
  p.x <= b.x + b.w + 0.5 &&
  p.y >= b.y - 0.5 &&
  p.y <= b.y + b.h + 0.5 &&
  (Math.abs(p.x - b.x) < 0.5 || Math.abs(p.x - b.x - b.w) < 0.5 || Math.abs(p.y - b.y) < 0.5 || Math.abs(p.y - b.y - b.h) < 0.5)

/* --------------------------------- geometry -------------------------------- */

const SIDES: Side[] = ['right', 'left', 'bottom', 'top']
const VEC: Record<Side, Pt> = {
  right: { x: 1, y: 0 },
  left: { x: -1, y: 0 },
  bottom: { x: 0, y: 1 },
  top: { x: 0, y: -1 },
}
// direction index: 0 = +x, 1 = -x, 2 = +y, 3 = -y
const DX = [1, -1, 0, 0]
const DY = [0, 0, 1, -1]
const OPP = [1, 0, 3, 2]
const SIDE_DIR: Record<Side, number> = { right: 0, left: 1, bottom: 2, top: 3 }

export const portOf = (b: Box, s: Side): Pt =>
  s === 'left'
    ? { x: b.x, y: b.y + b.h / 2 }
    : s === 'right'
      ? { x: b.x + b.w, y: b.y + b.h / 2 }
      : s === 'top'
        ? { x: b.x + b.w / 2, y: b.y }
        : { x: b.x + b.w / 2, y: b.y + b.h }

export const toRect = (b: Box, m = 0): Rect => ({ x1: b.x - m, y1: b.y - m, x2: b.x + b.w + m, y2: b.y + b.h + m })

export const rectsHit = (a: Rect, b: Rect) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1

const pkey = (p: Pt) => `${Math.round(p.x * 2)},${Math.round(p.y * 2)}`

/** First index whose key is >= v, in an array sorted by that key. */
function lowerBound<T>(arr: T[], v: number, key: (t: T) => number): number {
  let lo = 0
  let hi = arr.length
  while (lo < hi) {
    const m = (lo + hi) >> 1
    if (key(arr[m]) < v) lo = m + 1
    else hi = m
  }
  return lo
}

/** Does an axis-aligned segment pass through the inside of a rectangle? */
function segHitsRect(a: Pt, b: Pt, r: Rect): boolean {
  if (Math.abs(a.y - b.y) < 0.5) {
    const lo = Math.min(a.x, b.x)
    const hi = Math.max(a.x, b.x)
    return a.y > r.y1 && a.y < r.y2 && Math.max(lo, r.x1) < Math.min(hi, r.x2)
  }
  if (Math.abs(a.x - b.x) < 0.5) {
    const lo = Math.min(a.y, b.y)
    const hi = Math.max(a.y, b.y)
    return a.x > r.x1 && a.x < r.x2 && Math.max(lo, r.y1) < Math.min(hi, r.y2)
  }
  // a diagonal never comes out of this router; treat its bounding box as the hit
  return rectsHit({ x1: Math.min(a.x, b.x), y1: Math.min(a.y, b.y), x2: Math.max(a.x, b.x), y2: Math.max(a.y, b.y) }, r)
}

/** Drop points that sit on a straight run between their neighbours. */
export function simplify(pts: Pt[]): Pt[] {
  const out: Pt[] = []
  for (const p of pts) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5) continue
    out.push(p)
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3)
      const collinear =
        (Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5) || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)
      if (!collinear) break
      out.splice(out.length - 2, 1)
    }
  }
  return out
}

/* ------------------------------- binary heap ------------------------------- */

class MinHeap {
  private k: number[] = []
  private v: number[] = []
  get size() {
    return this.k.length
  }
  peekKey() {
    return this.k[0]
  }
  push(key: number, val: number) {
    const k = this.k
    const v = this.v
    let i = k.length
    k.push(key)
    v.push(val)
    while (i > 0) {
      const p = (i - 1) >> 1
      if (k[p] <= key) break
      k[i] = k[p]
      v[i] = v[p]
      i = p
    }
    k[i] = key
    v[i] = val
  }
  pop(): number {
    const k = this.k
    const v = this.v
    const top = v[0]
    const lastK = k.pop()!
    const lastV = v.pop()!
    if (k.length) {
      let i = 0
      const n = k.length
      for (;;) {
        const l = 2 * i + 1
        if (l >= n) break
        const r = l + 1
        const c = r < n && k[r] < k[l] ? r : l
        if (k[c] >= lastK) break
        k[i] = k[c]
        v[i] = v[c]
        i = c
      }
      k[i] = lastK
      v[i] = lastV
    }
    return top
  }
}

/* ---------------------------------- router --------------------------------- */

interface HSeg {
  y: number
  x1: number
  x2: number
}
interface VSeg {
  x: number
  y1: number
  y2: number
}

interface End {
  side: Side
  p: Pt
  q: Pt
  dir: number
  cost: number
}

export interface RouteAsk {
  source: string
  target: string
  /** The side the edge was drawn from or into; preferred, not forced. */
  prefSource?: Side
  prefTarget?: Side
}

export class Router {
  private boxes = new Map<string, Box>()
  private h: HSeg[] = []
  private v: VSeg[] = []
  private labelRects: Rect[] = []
  private ports = new Map<string, number>()

  constructor(boxes: { id: string; box: Box }[]) {
    for (const b of boxes) this.boxes.set(b.id, b.box)
  }

  /** A line that is already on the canvas. Later routes keep off it. */
  addPath(pts: Pt[]) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      if (Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) >= 0.5)
        this.h.push({ y: a.y, x1: Math.min(a.x, b.x), x2: Math.max(a.x, b.x) })
      else if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) >= 0.5)
        this.v.push({ x: a.x, y1: Math.min(a.y, b.y), y2: Math.max(a.y, b.y) })
    }
    if (pts.length > 1) {
      for (const p of [pts[0], pts[pts.length - 1]]) this.ports.set(pkey(p), (this.ports.get(pkey(p)) ?? 0) + 1)
    }
  }

  /** Take a line back off the canvas, so it can be routed again. */
  removePath(pts: Pt[]) {
    const drop = <T,>(list: T[], match: (s: T) => boolean) => {
      const i = list.findIndex(match)
      if (i >= 0) list.splice(i, 1)
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      if (Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) >= 0.5) {
        const x1 = Math.min(a.x, b.x)
        const x2 = Math.max(a.x, b.x)
        drop(this.h, (s) => s.y === a.y && s.x1 === x1 && s.x2 === x2)
      } else if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) >= 0.5) {
        const y1 = Math.min(a.y, b.y)
        const y2 = Math.max(a.y, b.y)
        drop(this.v, (s) => s.x === a.x && s.y1 === y1 && s.y2 === y2)
      }
    }
    if (pts.length > 1) {
      for (const p of [pts[0], pts[pts.length - 1]]) {
        const n = (this.ports.get(pkey(p)) ?? 1) - 1
        if (n > 0) this.ports.set(pkey(p), n)
        else this.ports.delete(pkey(p))
      }
    }
  }

  /** A label chip that is already placed. Later lines and labels keep off it. */
  addLabelRect(r: Rect) {
    this.labelRects.push(r)
  }

  /** True when the path runs under any placed label other than `own`. */
  runsUnderLabel(pts: Pt[], own?: Rect): boolean {
    for (const r of this.labelRects) {
      if (r === own) continue
      for (let i = 0; i < pts.length - 1; i++) if (segHitsRect(pts[i], pts[i + 1], r)) return true
    }
    return false
  }

  /** The rect of the label most recently placed by placeLabel. */
  lastLabelRect(): Rect | undefined {
    return this.labelRects[this.labelRects.length - 1]
  }

  /** Take a label back off, so it can be placed again on a new route. */
  removeLabelRect(r: Rect) {
    const i = this.labelRects.indexOf(r)
    if (i >= 0) this.labelRects.splice(i, 1)
  }

  /**
   * True when the path runs through, or within `margin` of, any card other
   * than the ones it joins. With the default margin a line that merely grazes
   * a border passes; a positive margin also catches a line squeezed right up
   * against a card dropped beside it, which leaves that card's own lines no
   * way out without crossing it.
   */
  crossesCards(pts: Pt[], own: string[], margin = -2): boolean {
    for (const [id, b] of this.boxes) {
      if (own.includes(id)) continue
      const r = toRect(b, margin)
      for (let i = 0; i < pts.length - 1; i++) if (segHitsRect(pts[i], pts[i + 1], r)) return true
    }
    return false
  }

  /** The margin a kept line must stand off every card it does not join. */
  static readonly KEEP_CLEAR = CLEAR - 2

  /** The best orthogonal route between two cards, as corner points. */
  route(ask: RouteAsk): Pt[] {
    const S = this.boxes.get(ask.source)
    const T = this.boxes.get(ask.target)
    if (!S || !T) return []
    const span: Rect = {
      x1: Math.min(S.x, T.x),
      y1: Math.min(S.y, T.y),
      x2: Math.max(S.x + S.w, T.x + T.w),
      y2: Math.max(S.y + S.h, T.y + T.h),
    }
    const all = this.sorted()
    for (const pad of [150, 520, -1]) {
      const region = pad < 0 ? null : { x1: span.x1 - pad, y1: span.y1 - pad, x2: span.x2 + pad, y2: span.y2 + pad }
      const pts = this.search(ask, S, T, region, all)
      if (pts) return pts
    }
    return this.fallback(S, T, ask)
  }

  /** Where the label chip goes so it touches no card, label or line. */
  placeLabel(pts: Pt[], text: string): LabelSpot {
    const { w, h } = chipSize(text)
    const cands: { spot: LabelSpot; rect: Rect; pref: number }[] = []
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const horizontal = Math.abs(a.y - b.y) < 0.5
      const len = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y)
      const lengthBonus = Math.min(len, 400) * 0.02
      if (horizontal) {
        if (len < w + 10) continue
        const lo = Math.min(a.x, b.x)
        for (const f of [0.5, 0.3, 0.7]) {
          const x = lo + len * f
          // keep the chip off the corners at either end of the run
          if (x - w / 2 < lo + 4 || x + w / 2 > lo + len - 4) continue
          cands.push({ spot: { x, y: a.y, place: 'above' }, rect: { x1: x - w / 2, y1: a.y - 6 - h, x2: x + w / 2, y2: a.y - 6 }, pref: 0 - lengthBonus + (f === 0.5 ? 0 : 3) })
          cands.push({ spot: { x, y: a.y, place: 'below' }, rect: { x1: x - w / 2, y1: a.y + 6, x2: x + w / 2, y2: a.y + 6 + h }, pref: 6 - lengthBonus + (f === 0.5 ? 0 : 3) })
        }
      } else {
        if (len < h + 10) continue
        const lo = Math.min(a.y, b.y)
        for (const f of [0.5, 0.3, 0.7]) {
          const y = lo + len * f
          if (y - h / 2 < lo + 4 || y + h / 2 > lo + len - 4) continue
          cands.push({ spot: { x: a.x, y, place: 'left' }, rect: { x1: a.x - 9 - w, y1: y - h / 2, x2: a.x - 9, y2: y + h / 2 }, pref: 10 - lengthBonus + (f === 0.5 ? 0 : 3) })
          cands.push({ spot: { x: a.x, y, place: 'right' }, rect: { x1: a.x + 9, y1: y - h / 2, x2: a.x + 9 + w, y2: y + h / 2 }, pref: 12 - lengthBonus + (f === 0.5 ? 0 : 3) })
        }
      }
    }
    if (!cands.length) {
      // nothing long enough: sit beside the middle of the longest run
      let best = 0
      let bi = 0
      for (let i = 0; i < pts.length - 1; i++) {
        const l = Math.abs(pts[i + 1].x - pts[i].x) + Math.abs(pts[i + 1].y - pts[i].y)
        if (l > best) {
          best = l
          bi = i
        }
      }
      const a = pts[bi] ?? { x: 0, y: 0 }
      const b = pts[bi + 1] ?? a
      const horizontal = Math.abs(a.y - b.y) < 0.5
      const x = (a.x + b.x) / 2
      const y = (a.y + b.y) / 2
      const spot: LabelSpot = { x, y, place: horizontal ? 'above' : 'left' }
      this.labelRects.push(horizontal ? { x1: x - w / 2, y1: y - 6 - h, x2: x + w / 2, y2: y - 6 } : { x1: x - 9 - w, y1: y - h / 2, x2: x - 9, y2: y + h / 2 })
      return spot
    }

    const ownSegs = pts.slice(0, -1).map((p, i) => [p, pts[i + 1]] as const)
    let best = cands[0]
    let bestScore = Infinity
    for (const c of cands) {
      let s = c.pref
      for (const b of this.boxes.values()) if (rectsHit(c.rect, cardRect(b, 4))) s += 1000
      for (const r of this.labelRects) if (rectsHit(c.rect, toRect({ x: r.x1, y: r.y1, w: r.x2 - r.x1, h: r.y2 - r.y1 }, 3))) s += 1000
      const shrunk = { x1: c.rect.x1 + 1, y1: c.rect.y1 + 1, x2: c.rect.x2 - 1, y2: c.rect.y2 - 1 }
      for (const sg of this.h) if (segHitsRect({ x: sg.x1, y: sg.y }, { x: sg.x2, y: sg.y }, shrunk)) s += 400
      for (const sg of this.v) if (segHitsRect({ x: sg.x, y: sg.y1 }, { x: sg.x, y: sg.y2 }, shrunk)) s += 400
      for (const [a, b] of ownSegs) if (segHitsRect(a, b, shrunk)) s += 400
      if (s < bestScore) {
        bestScore = s
        best = c
      }
    }
    this.labelRects.push(best.rect)
    return best.spot
  }

  /* -------------------------------- internals ------------------------------- */

  /**
   * Distance from a port to the nearest other card straight out of that side,
   * the card at the far end included: two neighbours 32px apart share that
   * gap, so each stub gets half of it and they meet instead of overlapping.
   */
  private freeRun(p: Pt, d: Pt, own: string): number {
    let best = Infinity
    for (const [id, b] of this.boxes) {
      if (id === own) continue
      const r = toRect(b)
      if (d.x !== 0) {
        if (p.y <= r.y1 || p.y >= r.y2) continue
        const dist = d.x > 0 ? r.x1 - p.x : p.x - r.x2
        if (dist >= 0 && dist < best) best = dist
      } else {
        if (p.x <= r.x1 || p.x >= r.x2) continue
        const dist = d.y > 0 ? r.y1 - p.y : p.y - r.y2
        if (dist >= 0 && dist < best) best = dist
      }
    }
    return best
  }

  /**
   * What it costs, beyond its length, to draw this segment: running on top of
   * a line, crossing one, crowding one, or passing under a label.
   */
  /**
   * What it costs, beyond its length, to draw this segment: running on top of
   * a line, crossing one, crowding one, or passing under a label. `hs` is
   * sorted by y and `vs` by x, so each check is a binary search, not a scan:
   * this runs once for every move the search looks at.
   */
  private segCost(a: Pt, b: Pt, hs: HSeg[], vs: VSeg[]): number {
    let c = 0
    if (Math.abs(a.y - b.y) < 0.5) {
      const y = a.y
      const lo = Math.min(a.x, b.x)
      const hi = Math.max(a.x, b.x)
      for (let k = lowerBound(hs, y - TRACK + 2, (s) => s.y); k < hs.length && hs[k].y < y + TRACK - 2; k++) {
        const s = hs[k]
        const ov = Math.min(hi, s.x2) - Math.max(lo, s.x1)
        const inLine = Math.abs(s.y - y) < 3
        // end to end on the same row with only a hair between them, two lines
        // read as ONE line going somewhere neither of them goes
        if (ov <= 0.5) c += inLine && -ov < END_GAP ? END_TO_END : 0
        else c += inLine ? OVERLAP + ov * 8 : 24 + ov * 0.6
      }
      // half-open (lo, hi], so a line sitting exactly on a grid coordinate is
      // counted once, by the one move whose interval holds it
      for (let k = lowerBound(vs, lo, (s) => s.x); k < vs.length && vs[k].x <= hi; k++) {
        const s = vs[k]
        if (s.x > lo && y >= s.y1 - 1 && y <= s.y2 + 1) c += CROSS
      }
    } else {
      const x = a.x
      const lo = Math.min(a.y, b.y)
      const hi = Math.max(a.y, b.y)
      for (let k = lowerBound(vs, x - TRACK + 2, (s) => s.x); k < vs.length && vs[k].x < x + TRACK - 2; k++) {
        const s = vs[k]
        const ov = Math.min(hi, s.y2) - Math.max(lo, s.y1)
        const inLine = Math.abs(s.x - x) < 3
        if (ov <= 0.5) c += inLine && -ov < END_GAP ? END_TO_END : 0
        else c += inLine ? OVERLAP + ov * 8 : 24 + ov * 0.6
      }
      for (let k = lowerBound(hs, lo, (s) => s.y); k < hs.length && hs[k].y <= hi; k++) {
        const s = hs[k]
        if (s.y > lo && x >= s.x1 - 1 && x <= s.x2 + 1) c += CROSS
      }
    }
    for (const r of this.labelRects) if (segHitsRect(a, b, r)) c += LABEL_HIT
    return c
  }

  /** The drawn lines, sorted for segCost's binary searches. */
  private sorted(): { hs: HSeg[]; vs: VSeg[] } {
    return { hs: [...this.h].sort((p, q) => p.y - q.y), vs: [...this.v].sort((p, q) => p.x - q.x) }
  }

  private ends(id: string, b: Box, pref: Side | undefined, inside: (x: number, y: number) => boolean, hs: HSeg[], vs: VSeg[]): End[] {
    const out: End[] = []
    for (const side of SIDES) {
      const mid = portOf(b, side)
      const d = VEC[side]
      const along = side === 'top' || side === 'bottom' ? b.w : b.h
      const flat = (b.flat ?? SIDES).includes(side) && along >= 4 * PORT_SPREAD
      for (const shift of flat ? [0, -PORT_SPREAD, PORT_SPREAD] : [0]) {
        const p = d.x !== 0 ? { x: mid.x, y: mid.y + shift } : { x: mid.x + shift, y: mid.y }
        const free = this.freeRun(p, d, id)
        if (free <= 2 * CLEAR + 2) continue
        const stub = Math.min(STUB_MAX, free / 2)
        const q = { x: p.x + d.x * stub, y: p.y + d.y * stub }
        if (inside(q.x, q.y)) continue
        const cost =
          stub +
          (shift ? OFF_CENTRE : 0) +
          (pref && side !== pref ? SIDE_OFF_PREF : 0) +
          (this.ports.get(pkey(p)) ? PORT_SHARED : 0) +
          this.segCost(p, q, hs, vs)
        out.push({ side, p, q, dir: SIDE_DIR[side], cost })
      }
    }
    return out
  }

  private search(ask: RouteAsk, S: Box, T: Box, region: Rect | null, all: { hs: HSeg[]; vs: VSeg[] }): Pt[] | null {
    const obs: Rect[] = []
    for (const b of this.boxes.values()) {
      const r = cardRect(b, CLEAR)
      if (!region || rectsHit(r, region)) obs.push(r)
    }
    const inside = (x: number, y: number) => {
      for (const r of obs) if (x > r.x1 + 0.01 && x < r.x2 - 0.01 && y > r.y1 + 0.01 && y < r.y2 - 0.01) return true
      return false
    }

    const starts = this.ends(ask.source, S, ask.prefSource, inside, all.hs, all.vs)
    const goals = this.ends(ask.target, T, ask.prefTarget, inside, all.hs, all.vs)
    if (!starts.length || !goals.length) return null

    // ── the sparse grid ──────────────────────────────────────────────────
    let bx1: number
    let by1: number
    let bx2: number
    let by2: number
    if (region) {
      ;({ x1: bx1, y1: by1, x2: bx2, y2: by2 } = region)
    } else {
      bx1 = Math.min(...obs.map((r) => r.x1)) - 80
      by1 = Math.min(...obs.map((r) => r.y1)) - 80
      bx2 = Math.max(...obs.map((r) => r.x2)) + 80
      by2 = Math.max(...obs.map((r) => r.y2)) + 80
    }
    // only the lines inside this region can cost anything here
    const reg: Rect = { x1: bx1, y1: by1, x2: bx2, y2: by2 }
    const hs = all.hs.filter((s) => s.y >= reg.y1 && s.y <= reg.y2 && s.x2 >= reg.x1 && s.x1 <= reg.x2)
    const vs = all.vs.filter((s) => s.x >= reg.x1 && s.x <= reg.x2 && s.y2 >= reg.y1 && s.y1 <= reg.y2)

    // Card borders and region bounds get a centre line between each pair, so
    // a line through a corridor runs down its middle. The rest are added as
    // they are: the stubs, a comfort track standing off each card, and a
    // parallel track beside every existing line so a second line has a tidy
    // place to run instead of on top of the first.
    const baseX: number[] = [bx1, bx2]
    const baseY: number[] = [by1, by2]
    const extraX: number[] = []
    const extraY: number[] = []
    for (const r of obs) {
      baseX.push(r.x1, r.x2)
      baseY.push(r.y1, r.y2)
      extraX.push(r.x1 - COMFORT, r.x2 + COMFORT)
      extraY.push(r.y1 - COMFORT, r.y2 + COMFORT)
    }
    for (const e of [...starts, ...goals]) extraX.push(e.q.x), extraY.push(e.q.y)
    for (const s of vs) extraX.push(s.x - TRACK, s.x + TRACK)
    for (const s of hs) extraY.push(s.y - TRACK, s.y + TRACK)

    const round = (n: number) => Math.round(n * 2) / 2
    const axis = (base: number[], extra: number[], lo: number, hi: number) => {
      const b = [...new Set(base.filter((n) => n >= lo && n <= hi).map(round))].sort((p, q) => p - q)
      const out = [...b]
      for (let i = 0; i < b.length - 1; i++) if (b[i + 1] - b[i] > 6) out.push((b[i] + b[i + 1]) / 2)
      for (const n of extra) if (n >= lo && n <= hi) out.push(round(n))
      return [...new Set(out)].sort((p, q) => p - q)
    }
    const xs = axis(baseX, extraX, reg.x1, reg.x2)
    const ys = axis(baseY, extraY, reg.y1, reg.y2)
    // the cards themselves, for the hug check
    const cards = obs.map((r) => ({ x1: r.x1 + CLEAR, y1: r.y1 + CLEAR, x2: r.x2 - CLEAR, y2: r.y2 - CLEAR }))
    const hug = (a: Pt, b: Pt) => {
      let c = 0
      if (Math.abs(a.y - b.y) < 0.5) {
        const lo = Math.min(a.x, b.x)
        const hi = Math.max(a.x, b.x)
        for (const r of cards) {
          const near = (a.y < r.y1 && a.y > r.y1 - CLEAR - COMFORT + 1) || (a.y > r.y2 && a.y < r.y2 + CLEAR + COMFORT - 1)
          const ov = Math.min(hi, r.x2) - Math.max(lo, r.x1)
          if (near && ov > 0) c += ov * HUG
        }
      } else {
        const lo = Math.min(a.y, b.y)
        const hi = Math.max(a.y, b.y)
        for (const r of cards) {
          const near = (a.x < r.x1 && a.x > r.x1 - CLEAR - COMFORT + 1) || (a.x > r.x2 && a.x < r.x2 + CLEAR + COMFORT - 1)
          const ov = Math.min(hi, r.y2) - Math.max(lo, r.y1)
          if (near && ov > 0) c += ov * HUG
        }
      }
      return c
    }
    const nx = xs.length
    const ny = ys.length
    const N = nx * ny
    const xi = new Map(xs.map((x, i) => [Math.round(x * 2) / 2, i]))
    const yi = new Map(ys.map((y, i) => [Math.round(y * 2) / 2, i]))
    const at = (p: Pt) => {
      const i = xi.get(Math.round(p.x * 2) / 2)
      const j = yi.get(Math.round(p.y * 2) / 2)
      return i == null || j == null ? -1 : j * nx + i
    }

    // Every obstacle border is a grid line, so blocking is decided per CELL:
    // mark the cells each obstacle covers once, then a point or a move is
    // blocked when the cells on all its sides are. Far cheaper than testing
    // every move against every card, and two inflated cards that touch leave
    // no slit between them for a line to squeeze through.
    const cw = nx - 1
    const cell = new Uint8Array(Math.max(0, cw * (ny - 1)))
    for (const r of obs) {
      const i0 = lowerBound(xs, r.x1 - 0.3, (n) => n)
      const j0 = lowerBound(ys, r.y1 - 0.3, (n) => n)
      for (let j = j0; j < ny - 1 && ys[j + 1] <= r.y2 + 0.3; j++)
        for (let i = i0; i < nx - 1 && xs[i + 1] <= r.x2 + 0.3; i++) cell[j * cw + i] = 1
    }
    // Beyond the region's edge counts as a WALL. Counted as free instead, a
    // card straddling that edge loses its outside half, and a line can run
    // along the edge straight through the card.
    const cb = (i: number, j: number) => (i < 0 || j < 0 || i >= cw || j >= ny - 1 ? 1 : cell[j * cw + i])
    const nodeBlocked = new Uint8Array(N)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++)
        nodeBlocked[j * nx + i] = cb(i - 1, j - 1) & cb(i, j - 1) & cb(i - 1, j) & cb(i, j)
    // move costs, NaN = not computed yet, Infinity = blocked
    const costH = new Float64Array(N).fill(NaN) // i -> i+1 at row j
    const costV = new Float64Array(N).fill(NaN) // j -> j+1 at column i
    const moveCost = (n: number, d: number): number => {
      const i = n % nx
      const j = (n - i) / nx
      let k: number
      let arr: Float64Array
      let a: Pt
      let b: Pt
      let blocked: number
      if (d === 0 || d === 1) {
        const i0 = d === 0 ? i : i - 1
        if (i0 < 0 || i0 + 1 >= nx) return Infinity
        k = j * nx + i0
        arr = costH
        a = { x: xs[i0], y: ys[j] }
        b = { x: xs[i0 + 1], y: ys[j] }
        blocked = cb(i0, j - 1) & cb(i0, j) // the cells above and below
      } else {
        const j0 = d === 2 ? j : j - 1
        if (j0 < 0 || j0 + 1 >= ny) return Infinity
        k = j0 * nx + i
        arr = costV
        a = { x: xs[i], y: ys[j0] }
        b = { x: xs[i], y: ys[j0 + 1] }
        blocked = cb(i - 1, j0) & cb(i, j0) // the cells left and right
      }
      let c = arr[k]
      if (Number.isNaN(c)) {
        c = blocked ? Infinity : Math.abs(b.x - a.x) + Math.abs(b.y - a.y) + this.segCost(a, b, hs, vs) + hug(a, b)
        arr[k] = c
      }
      return c
    }

    // ── A* over (node, heading) ──────────────────────────────────────────
    const goalAt = new Map<number, End[]>()
    for (const g of goals) {
      const n = at(g.q)
      if (n < 0 || nodeBlocked[n]) continue
      goalAt.set(n, [...(goalAt.get(n) ?? []), g])
    }
    if (!goalAt.size) return null
    const hx = (n: number) => {
      const x = xs[n % nx]
      const y = ys[Math.floor(n / nx)]
      let m = Infinity
      for (const g of goals) m = Math.min(m, Math.abs(x - g.q.x) + Math.abs(y - g.q.y))
      return m
    }

    const dist = new Float64Array(N * 4).fill(Infinity)
    const prev = new Int32Array(N * 4).fill(-1)
    const heap = new MinHeap()
    const startOf = new Map<number, End>()
    for (const s of starts) {
      const n = at(s.q)
      if (n < 0 || nodeBlocked[n]) continue
      const st = n * 4 + s.dir
      if (s.cost < dist[st]) {
        dist[st] = s.cost
        startOf.set(st, s)
        heap.push(s.cost + hx(n), st)
      }
    }

    let best = Infinity
    let bestState = -1
    let bestGoal: End | null = null
    while (heap.size) {
      if (heap.peekKey() >= best) break
      const st = heap.pop()
      const n = st >> 2
      const d = st & 3
      const g = dist[st]
      const here = goalAt.get(n)
      if (here) {
        for (const gl of here) {
          const into = OPP[gl.dir] // the final run heads into the card
          if (d === gl.dir) continue // would double back on itself
          const total = g + (d === into ? 0 : BEND) + gl.cost
          if (total < best) {
            best = total
            bestState = st
            bestGoal = gl
          }
        }
      }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === OPP[d]) continue
        const mc = moveCost(n, nd)
        if (mc === Infinity) continue
        const i = n % nx
        const j = (n - i) / nx
        const nn = (j + DY[nd]) * nx + (i + DX[nd])
        if (nodeBlocked[nn]) continue
        const ns = nn * 4 + nd
        const cost = g + mc + (nd === d ? 0 : BEND)
        if (cost < dist[ns]) {
          dist[ns] = cost
          prev[ns] = st
          heap.push(cost + hx(nn), ns)
        }
      }
    }
    if (bestState < 0 || !bestGoal) return null

    const chain: number[] = []
    let cur = bestState
    while (cur >= 0) {
      chain.push(cur)
      cur = prev[cur]
    }
    chain.reverse()
    const start = startOf.get(chain[0])
    if (!start) return null
    const pts: Pt[] = [start.p]
    for (const st of chain) {
      const n = st >> 2
      pts.push({ x: xs[n % nx], y: ys[Math.floor(n / nx)] })
    }
    pts.push(bestGoal.p)
    return simplify(pts)
  }

  /** Only when every search failed (cards dropped on top of each other). */
  private fallback(S: Box, T: Box, ask: RouteAsk): Pt[] {
    const s = portOf(S, ask.prefSource ?? 'right')
    const t = portOf(T, ask.prefTarget ?? 'left')
    const mx = (s.x + t.x) / 2
    return simplify([s, { x: mx, y: s.y }, { x: mx, y: t.y }, t])
  }
}
