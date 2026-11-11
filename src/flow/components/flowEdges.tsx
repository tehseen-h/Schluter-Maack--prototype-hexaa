import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import { GEO } from '../lib/flowModel'
import type { LabelPlace, LabelSpot, Pt, Side } from '../lib/router'

/**
 * Edge routing for the single left to right line.
 *
 * ── Why these are custom edges ────────────────────────────────────────────
 *
 * 1. React Flow's handle coordinates are NOT reliable in a fully custom-layout
 *    setup, every node's width/height is assigned by us, so React Flow never
 *    runs its own measurement pass. Every edge is handed exact endpoints from
 *    our own `layout()` via `data`; if `data` is absent we fall back to React
 *    Flow's props, which is fine for a user-drawn link.
 * 2. A phase's children all hang off the same source point, so their
 *    connectors share ONE vertical trunk to read as a tree.
 * 3. Owning the path means owning the label position, labels go on the
 *    longest horizontal run, which is what keeps converging branches legible.
 * 4. Once a card has been dragged off the line these rules no longer fit, and
 *    the page hands the edge a finished route instead (`points`, from
 *    lib/router.ts) with a label spot chosen to clear every card and line.
 */

export type { Side }

/** Exact geometry, computed by the page from `layout()`. */
export interface EdgeGeom {
  sx: number
  sy: number
  tx: number
  ty: number
  sSide: Side
  tSide: Side
  /** how far the path runs straight out of the source before turning */
  offset?: number
  /**
   * Exact Y to run the side path along, turned off the side card's own edge.
   * Halfway between the two cards looks right until the card on the line is
   * expanded, and the halfway point then lands inside its column of steps.
   */
  corridorY?: number
  /**
   * Exact Y to detour along when the source phase is expanded, so the
   * main-path edge to the NEXT phase goes over its own child column instead
   * of disappearing behind it.
   */
  bypassY?: number
  label?: string
  labelColor?: string
  /**
   * Text colour reversed out of the filled chip. The branch colours here
   * span both a light one (accent gold) and two darker ones (steel blue,
   * plum), a single fixed text colour reads fine on one and fails contrast
   * on the others, so this travels per-edge rather than as a class.
   */
  labelText?: string
  /** The page background, used as a halo ring around the filled label chip. */
  haloColor?: string
  /** A finished route from the router. When present it is drawn as given. */
  points?: Pt[]
  /** Where the router placed the label, clear of cards, labels and lines. */
  labelAt?: LabelSpot
}

/* ------------------------------- geometry -------------------------------- */

/** Orthogonal polyline with rounded corners. Collinear points pass through. */
function roundedPolyline(pts: Pt[], radius: number): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]
    const v1 = { x: p.x - pts[i - 1].x, y: p.y - pts[i - 1].y }
    const v2 = { x: pts[i + 1].x - p.x, y: pts[i + 1].y - p.y }
    const l1 = Math.hypot(v1.x, v1.y)
    const l2 = Math.hypot(v2.x, v2.y)
    if (l1 < 0.5 || l2 < 0.5) continue
    const r = Math.min(radius, l1 / 2, l2 / 2)
    const a = { x: p.x - (v1.x / l1) * r, y: p.y - (v1.y / l1) * r }
    const b = { x: p.x + (v2.x / l2) * r, y: p.y + (v2.y / l2) * r }
    d += ` L ${a.x},${a.y} Q ${p.x},${p.y} ${b.x},${b.y}`
  }
  const last = pts[pts.length - 1]
  return `${d} L ${last.x},${last.y}`
}

/** The corner points for each routing case we actually use. */
export function routePoints(g: EdgeGeom, trunkX?: number): Pt[] {
  const s: Pt = { x: g.sx, y: g.sy }
  const t: Pt = { x: g.tx, y: g.ty }
  const off = g.offset ?? 22
  const level = Math.abs(g.sy - g.ty) < 1.5
  const aligned = Math.abs(g.sx - g.tx) < 1.5

  // along a lane
  if (g.sSide === 'right' && g.tSide === 'left') {
    if (g.bypassY != null) {
      const rx = g.sx + 8
      const dx = g.tx - 14
      return [s, { x: rx, y: g.sy }, { x: rx, y: g.bypassY }, { x: dx, y: g.bypassY }, { x: dx, y: g.ty }, t]
    }
    if (level) return [s, t]
    // A non-level right -> left run is ALWAYS a side path rejoining the line.
    // Turn in the gap immediately before the target: the halfway point drops
    // the line straight through whatever card sits between the two, and with
    // one line there usually is one.
    const mx = trunkX ?? g.tx - 18
    return [s, { x: mx, y: g.sy }, { x: mx, y: g.ty }, t]
  }

  // down into the lane below / up into the lane above
  if ((g.sSide === 'bottom' && g.tSide === 'top') || (g.sSide === 'top' && g.tSide === 'bottom')) {
    if (aligned) return [s, t]
    const my = g.corridorY ?? (g.sSide === 'bottom' ? g.sy + off : g.sy - off)
    return [s, { x: g.sx, y: my }, { x: g.tx, y: my }, t]
  }

  // a rejoin: leave the lane, travel back, and hook into the target's left side
  if (g.tSide === 'left') {
    const my = g.corridorY ?? (g.sSide === 'top' ? g.sy - off : g.sy + off)
    const ax = g.tx - 26
    return [s, { x: g.sx, y: my }, { x: ax, y: my }, { x: ax, y: g.ty }, t]
  }

  return [s, t]
}

/**
 * Where the label goes, and which way it has to sit.
 *
 * A horizontal run is the best home for a label: it can sit just above the
 * line and read cleanly. But a branch that drops straight from a decision has
 * NO horizontal run, and a label centred on a vertical line has that line
 * drawn straight through the text, whichever way you nudge it vertically. So
 * the fallback is the midpoint of the longest VERTICAL run, flagged so the
 * chip is pushed out to the side instead of up.
 */
export function labelAnchor(pts: Pt[]): Pt & { vertical: boolean } {
  let best: Pt | null = null
  let bestLen = -1
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if (Math.abs(a.y - b.y) > 1.5) continue
    const len = Math.abs(b.x - a.x)
    if (len > bestLen) {
      bestLen = len
      best = { x: (a.x + b.x) / 2, y: a.y }
    }
  }
  // A run has to be long enough to actually hold a chip. Below that the label
  // spills over whatever card the run ends at, so treat it as if there were
  // none and go out to the side.
  if (best && bestLen >= 46) return { ...best, vertical: false }

  let vBest: Pt | null = null
  let vLen = -1
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    if (Math.abs(a.x - b.x) > 1.5) continue
    const len = Math.abs(b.y - a.y)
    if (len > vLen) {
      vLen = len
      vBest = { x: a.x, y: (a.y + b.y) / 2 }
    }
  }
  if (vBest) return { ...vBest, vertical: true }
  if (best) return { ...best, vertical: false }

  const first = pts[0]
  const last = pts[pts.length - 1]
  return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2, vertical: false }
}

/**
 * How a chip sits relative to its spot on the line. The gaps (6px off a
 * horizontal run, 9px off a vertical one) are the ones the router assumes
 * when it checks the chip against cards and other lines.
 */
const CHIP_OFFSET: Record<LabelPlace, string> = {
  above: 'translate(-50%, calc(-100% - 6px))',
  below: 'translate(-50%, 6px)',
  left: 'translate(calc(-100% - 9px), -50%)',
  right: 'translate(9px, -50%)',
}

/* ------------------------------ the edges -------------------------------- */

/** parent phase -> one of its revealed steps. Siblings share one trunk. */
export function TreeSpineEdge({ data, sourceX, sourceY, targetX, targetY, style, markerEnd, interactionWidth }: EdgeProps) {
  const g = (data as unknown as EdgeGeom | undefined) ?? {
    sx: sourceX,
    sy: sourceY,
    tx: targetX,
    ty: targetY,
    sSide: 'right' as Side,
    tSide: 'left' as Side,
  }
  const trunkX = g.sx + GEO.treeGapX / 2
  const path = roundedPolyline(routePoints(g, trunkX), 8)
  return <BaseEdge path={path} style={style} markerEnd={markerEnd} interactionWidth={interactionWidth} />
}

/** phase -> phase, along a lane or across lanes. Carries its own label. */
export function RoutedEdge({ data, sourceX, sourceY, targetX, targetY, style, markerEnd, interactionWidth }: EdgeProps) {
  const g = (data as unknown as EdgeGeom | undefined) ?? {
    sx: sourceX,
    sy: sourceY,
    tx: targetX,
    ty: targetY,
    sSide: 'right' as Side,
    tSide: 'left' as Side,
  }
  const pts = g.points && g.points.length > 1 ? g.points : routePoints(g)
  const path = roundedPolyline(pts, 12)
  const spot: LabelSpot | null = !g.label
    ? null
    : g.labelAt ?? (() => {
        const a = labelAnchor(pts)
        return { x: a.x, y: a.y, place: a.vertical ? 'left' : 'above' }
      })()

  return (
    <>
      <BaseEdge path={path} style={style} markerEnd={markerEnd} interactionWidth={interactionWidth} />
      {spot && g.label && (
        <EdgeLabelRenderer>
          {/* Two load-bearing rules:
              1. POSITION, never centred on the anchor point, or the stroke
                 draws through the text. Off a horizontal run the chip goes
                 ABOVE (or below) the line; off a vertical one it goes out to
                 the SIDE, because above is still on the line.
              2. OWNERSHIP, the chip is FILLED with the line's own colour,
                 text reversed out of it, so a skim ties label to line
                 instantly. The halo ring is the page background. */}
          <div
            style={{
              transform: `${CHIP_OFFSET[spot.place]} translate(${spot.x}px, ${spot.y}px)`,
              background: g.labelColor,
              color: g.labelText ?? '#ffffff',
              boxShadow: g.haloColor ? `0 0 0 2px ${g.haloColor}` : undefined,
            }}
            className="pointer-events-none absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[9.5px] font-semibold"
          >
            {g.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const edgeTypes = { tree: TreeSpineEdge, routed: RoutedEdge }
