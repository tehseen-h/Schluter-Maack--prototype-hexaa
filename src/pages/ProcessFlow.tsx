import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  getViewportForBounds,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'

import {
  FLOW_SOURCES,
  FLOW_VARIANTS,
  laneShort,
  type FlowSource,
  type FlowVariant,
  type LaneId,
  type Step,
} from '../flow/data/process'
import {
  GEO,
  buildInitialDoc,
  clearDoc,
  layout,
  validateFlowDoc,
  loadDoc,
  parseImported,
  noteHeight,
  saveDoc,
  NOTE_W,
  type EdgeKind,
  type FlowDoc,
  type FlowPhase,
} from '../flow/lib/flowModel'
import content from '../content'
import type { FlowShape } from '../lib/types'
import { questionKey, questionsForExport, questionsFromImport, useQuestionState } from '../flow/lib/questionState'
import { nodeTypes } from '../flow/components/flowNodes'
import { edgeTypes, labelAnchor, routePoints, type EdgeGeom, type Side } from '../flow/components/flowEdges'
import { Router, labelRectOf, onBorder, type Box, type LabelSpot, type Pt } from '../flow/lib/router'
import { Badge, Button, cx, Note } from '../flow/lib/uikit'
import {
  IconChevronRight,
  IconClose,
  IconCollapse,
  IconDownload,
  IconExpand,
  IconFile,
  IconImage,
  IconInfo,
  IconMenu,
  IconNote,
  IconPlus,
  IconReset,
  IconTrash,
} from '../flow/lib/icons'

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

type Sel =
  | { kind: 'phase'; id: string }
  | { kind: 'step'; phaseId: string; stepId: string }
  | { kind: 'note'; id: string }
  | { kind: 'edge'; id: string }
  | null

/**
 * Which sides of each flowchart symbol are straight for their whole length,
 * so a line can attach anywhere along them. A diamond has none; a pill's ends
 * are round; a trapezoid's sides slant; a document's bottom waves. Everything
 * else (owner cards, steps, notes) is a plain rectangle.
 */
const FLAT_SIDES: Record<FlowShape, Side[]> = {
  terminator: ['top', 'bottom'],
  document: ['top', 'left', 'right'],
  process: ['top', 'right', 'bottom', 'left'],
  manual: ['top', 'bottom'],
  decision: [],
}

/** A phase with its drag offset set, or cleared when it is back on its slot. */
const withMoved = (p: FlowPhase, dx: number, dy: number): FlowPhase =>
  Math.abs(dx) < 1 && Math.abs(dy) < 1 ? { ...p, moved: undefined } : { ...p, moved: { dx: Math.round(dx), dy: Math.round(dy) } }

const cssVar = (name: string, fallback: string) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (!v) return fallback
  return /^[\d.]+\s+[\d.]+\s+[\d.]+$/.test(v) ? `rgb(${v})` : v
}

function FlowInner({ src, variant, setVariant }: { src: FlowSource; variant: FlowVariant; setVariant: (v: FlowVariant) => void }) {
  const [doc, setDoc] = useState<FlowDoc>(() => loadDoc(src) ?? buildInitialDoc(src))
  const [sel, setSel] = useState<Sel>(null)
  const [panelW, setPanelW] = useState(360)
  const [menuOpen, setMenuOpen] = useState(false)
  const [qOpen, setQOpen] = useState(false)
  const [openQ, setOpenQ] = useState<string | null>(null)
  // which question has its answer box open, and the draft being typed
  const [answering, setAnswering] = useState<string | null>(null)
  const [answerDraft, setAnswerDraft] = useState('')
  const qs = useQuestionState(content.questions)
  // the export dialog: whether to put the questions and answers in the file
  const [exportOpen, setExportOpen] = useState(false)
  const [includeQ, setIncludeQ] = useState(true)
  const [pendingFit, setPendingFit] = useState<{ ids?: string[]; restore?: { x: number; y: number; zoom: number } } | null>({})
  // Where the viewer was before a card's steps were opened. Closing that card
  // glides back to exactly this spot instead of jumping to the whole line,
  // so nobody has to drag back to where they were reading.
  const returnVp = useRef<{ x: number; y: number; zoom: number } | null>(null)
  // How far the canvas was nudged to keep an edited card out from under the
  // editor panel; closing the editor undoes exactly this.
  const panelShift = useRef(0)
  // When the current glide ends. The panel nudge waits for a running fit
  // instead of cutting it off half way.
  const glideUntil = useRef(0)
  const [toast, setToast] = useState<string | null>(null)
  const [themeTick, setThemeTick] = useState(0)

  const wrapRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const rf = useReactFlow()
  const rfRef = useRef(rf)
  rfRef.current = rf

  useEffect(() => saveDoc(src, doc), [src, doc])

  const issues = useMemo(() => validateFlowDoc(doc), [doc])
  useEffect(() => {
    if (import.meta.env.DEV && issues.length) {
      console.warn(
        `[process flow] ${issues.length} graph issue(s):\n` +
          issues.map((i) => `  · ${i.kind}: ${i.detail}`).join('\n'),
      )
    }
  }, [issues])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((t) => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  // The card being dragged right now. It follows the pointer exactly; it is
  // only settled clear of other cards once it is dropped.
  const [dragId, setDragId] = useState<string | null>(null)
  const lay = useMemo(() => layout(doc, { free: dragId }), [doc, dragId])
  const layRef = useRef(lay)
  layRef.current = lay
  // Shown once, after the first card is moved.
  const movedHint = useRef(false)

  const toggle = useCallback(
    (id: string) => {
      const wasOpen = doc.expanded.includes(id)
      setDoc((d) => ({
        ...d,
        expanded: wasOpen ? d.expanded.filter((x) => x !== id) : [...d.expanded, id],
      }))
      if (wasOpen) {
        // Back to where the viewer was before this card was opened. If there is
        // nothing to return to (opened by Expand, or on load), stay put.
        const back = returnVp.current
        returnVp.current = null
        // the saved spot predates any editor nudge, so that nudge is void now
        if (back) panelShift.current = 0
        setPendingFit(back ? { restore: back } : null)
      } else {
        // Remember the spot only for the first card opened, so opening a second
        // card from the focused view still returns to the original place.
        if (!returnVp.current) returnVp.current = rfRef.current.getViewport()
        const phase = doc.phases.find((p) => p.id === id)
        setPendingFit({ ids: [id, ...(phase?.steps.map((st) => `${id}::${st.id}`) ?? [])] })
      }
    },
    [doc.expanded, doc.phases],
  )

  const computedNodes = useMemo<Node[]>(() => {
    const out: Node[] = []
    // Every node is given its size up front, which is what React Flow's drag
    // handler needs. The catch (in @xyflow/system's `parseHandles`): a node
    // that has `measured` but no `handles` NEVER gets the DOM measurement
    // pass that records handle geometry, so `internals.handleBounds` stays
    // undefined, and then `getEdgePosition()` returns null and EdgeWrapper
    // renders null for EVERY edge, with a clean console and a store that
    // still holds them all. Declaring the handles here closes that gap: the
    // four sides are at known offsets, so there is nothing to measure.
    const handlesFor = (w: number, h: number) =>
      (
        [
          ['h-top', Position.Top, w / 2, 0],
          ['h-right', Position.Right, w, h / 2],
          ['h-bottom', Position.Bottom, w / 2, h],
          ['h-left', Position.Left, 0, h / 2],
        ] as const
      ).flatMap(([id, position, x, y]) =>
        // registered as both source and target so either direction resolves
        // under ConnectionMode.Loose
        (['source', 'target'] as const).map((type) => ({
          id,
          type,
          position,
          x,
          y,
          width: 1,
          height: 1,
        })),
      )
    const sized = (w: number, h: number) => ({
      width: w,
      height: h,
      measured: { width: w, height: h },
      handles: handlesFor(w, h),
    })

    for (const phase of doc.phases) {
      const p = lay.positions[phase.id]
      if (!p) continue
      out.push({
        id: phase.id,
        type: 'phase',
        position: { x: p.x, y: p.y },
        ...sized(p.w, p.h),
        data: {
          phase,
          expanded: doc.expanded.includes(phase.id),
          onToggle: () => toggle(phase.id),
          w: p.w,
          h: p.h,
          laneShort: laneShort(src, phase.lane),
        },
        // Draggable, which is also what tells React Flow NOT to pan the canvas
        // when the press starts on a card (a draggable node gets `nopan`). A
        // press on empty canvas still pans as before.
        draggable: true,
        selected: sel?.kind === 'phase' && sel.id === phase.id,
        // the card in hand rides above everything it passes over
        zIndex: dragId === phase.id ? 4 : 2,
      })

      if (doc.expanded.includes(phase.id)) {
        phase.steps.forEach((s, i) => {
          const nodeId = `${phase.id}::${s.id}`
          const cp = lay.positions[nodeId]
          if (!cp) return
          out.push({
            id: nodeId,
            type: 'step',
            position: { x: cp.x, y: cp.y },
            ...sized(cp.w, cp.h),
            data: { step: s, lane: phase.lane, w: cp.w, h: cp.h, ord: i },
            draggable: false,
            selected: sel?.kind === 'step' && sel.stepId === s.id && sel.phaseId === phase.id,
            zIndex: 2,
          })
        })
      }
    }

    for (const n of doc.notes) {
      out.push({
        id: n.id,
        type: 'note',
        position: { x: n.x, y: n.y },
        ...sized(NOTE_W, noteHeight(n.text)),
        data: { text: n.text, kind: n.kind, h: noteHeight(n.text), w: NOTE_W },
        draggable: true,
        selected: sel?.kind === 'note' && sel.id === n.id,
        zIndex: 3,
      })
    }

    return out
  }, [doc, lay, sel, toggle, src, dragId])

  // React Flow silently discards any edge whose endpoints it hasn't
  // registered yet, and won't reconsider it while the edges array keeps the
  // same identity, so a freshly expanded phase can render its steps with NO
  // connectors at all, and nothing appears in the console.
  // (Verified here: 25 step cards, 0 spine edges, before this fix.)
  //
  // The skill's fix is to drop the mirrored state and pass `computedNodes`
  // straight through. On @xyflow/react 12.3.x that turned out to drop EVERY
  // edge instead, the store never settles when the nodes array identity
  // changes on each render. So the mirror stays, and the edges memo is keyed
  // on the nodes React Flow has ACTUALLY registered (`nodes`, one commit
  // later) rather than on `computedNodes`. That rebuilds the edge array's
  // identity exactly when the new nodes become resolvable, which is the
  // outcome the skill is after.
  const [nodes, setNodes, onRfNodesChange] = useNodesState<Node>(computedNodes)
  useEffect(() => {
    setNodes(computedNodes)
  }, [computedNodes, setNodes])

  const nodesRef = useRef(computedNodes)
  nodesRef.current = computedNodes

  const nodeSetKey = useMemo(() => nodes.map((n) => n.id).join('|'), [nodes])

  // Every node here is given an explicit size (`measured`), so React Flow
  // skips the measurement pass that ALSO records each node's handle
  // geometry, `internals.handleBounds` stays undefined. An edge that names
  // a handle (`sourceHandle: 'h-right'`) then can't be resolved and React
  // Flow drops it SILENTLY: the store holds all 10 edges, and none render.
  // Asking React Flow to re-read the node internals once the node set
  // changes populates handleBounds and the edges appear.
  const updateNodeInternals = useUpdateNodeInternals()
  useEffect(() => {
    const ids = nodeSetKey ? nodeSetKey.split('|') : []
    if (ids.length) updateNodeInternals(ids)
  }, [nodeSetKey, updateNodeInternals])

  // Routes the router chose last time, so a drag only re-routes what it must.
  const routeCache = useRef(new Map<string, { points: Pt[]; labelAt?: LabelSpot }>())

  const edges = useMemo<Edge[]>(() => {
    void themeTick
    void nodeSetKey
    // With one line there is no destination band to encode, so every side
    // path shares one colour. The dash rhythm says which way it went and the
    // label says why.
    const branchColour = cssVar('--branch-system', '#3d6fa5')

    const anchor = (id: string, side: Side): { x: number; y: number } | null => {
      const p = lay.positions[id]
      if (!p) return null
      switch (side) {
        case 'left':
          return { x: p.x, y: p.y + p.h / 2 }
        case 'right':
          return { x: p.x + p.w, y: p.y + p.h / 2 }
        case 'top':
          return { x: p.x + p.w / 2, y: p.y }
        case 'bottom':
          return { x: p.x + p.w / 2, y: p.y + p.h }
      }
    }
    const sideOf = (handle?: string | null, fallback: Side = 'right'): Side =>
      handle === 'h-left'
        ? 'left'
        : handle === 'h-right'
          ? 'right'
          : handle === 'h-top'
            ? 'top'
            : handle === 'h-bottom'
              ? 'bottom'
              : fallback

    const stored: Edge[] = doc.edges.flatMap((e) => {
      const branch = e.kind === 'branch'
      const colour = branch ? branchColour : cssVar('--line-strong', '#d8cebc')
      const sSide = sideOf(e.sourceHandle, 'right')
      const tSide = sideOf(e.targetHandle, 'left')
      const s = anchor(e.source, sSide)
      const t = anchor(e.target, tSide)
      if (!s || !t) return []

      const goingDown = sSide === 'bottom'
      // Turn off the side card's OWN edge. Halfway between the two cards looks
      // right until the card on the line is expanded, and the halfway point
      // then lands inside its column of steps. `offset` lets content space two
      // side paths that would otherwise run in the same corridor and stack
      // their labels on top of each other.
      const inset = e.offset ?? 40
      const corridorY = goingDown ? t.y - inset : sSide === 'top' ? t.y + inset : undefined

      const srcPos = lay.positions[e.source]
      const srcExpanded =
        doc.expanded.includes(e.source) &&
        (doc.phases.find((p) => p.id === e.source)?.steps.length ?? 0) > 0
      const bypassY = sSide === 'right' && tSide === 'left' && srcExpanded && srcPos ? srcPos.y - 16 : undefined

      // Direction is a SECOND cue, independent of colour, it still
      // separates two branches in the same lane and still works for a
      // reader who doesn't parse colour: down = long dash, up = dotted.
      // (The skill's '2 4' dot was too sparse to trace on this warm ground
      // once the diagram is zoomed to fit, '3 4' keeps the rhythm clearly
      // different from the '10 5' down-dash but puts more ink on the line.)
      const dash = !branch ? undefined : goingDown ? '10 5' : sSide === 'top' ? '3 4' : '5 4'

      return [
        {
          id: e.id,
          source: e.source,
          target: e.target,
          // NO sourceHandle/targetHandle. Every node here is given an
          // explicit size, so React Flow skips the measurement pass that
          // records handle geometry and `internals.handleBounds` stays
          // undefined, a named handle then can't be resolved and React Flow
          // drops the edge SILENTLY (the store held every edge, none rendered,
          // console clean). We compute every endpoint ourselves and hand it
          // to the edge via `data`, so the handle ids were never load-bearing
          // for drawing; `sSide`/`tSide` below carry which side it leaves and
          // enters. The handle ids stay on the document for the editor.
          type: 'routed',
          selected: sel?.kind === 'edge' && sel.id === e.id,
          data: {
            sx: s.x,
            sy: s.y,
            tx: t.x,
            ty: t.y,
            sSide,
            tSide,
            offset: e.offset ?? 22,
            corridorY,
            bypassY,
            label: e.label,
            // a decision labels BOTH its outputs, so main-path edges carry
            // labels too. The main path's own stroke is a pale line, which is
            // unreadable as a filled chip, so those get the ink colour.
            labelColor: branch ? colour : cssVar('--navy', '#1b2a44'),
            labelText: '#ffffff',
            haloColor: cssVar('--bg', '#faf6ef'),
          },
          style: {
            stroke: colour,
            // branches are drawn HEAVIER than the main path, not lighter -
            // a branch is what a reader most needs to trace, and a hairline
            // dash on a warm ground is the hardest thing to trace
            strokeWidth: branch ? 2.5 : 2.25,
            strokeDasharray: dash,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: branch ? 20 : 14,
            height: branch ? 20 : 14,
            color: colour,
          },
          zIndex: 1,
        },
      ]
    })

    const detail: Edge[] = []
    for (const phase of doc.phases) {
      if (!doc.expanded.includes(phase.id)) continue
      const colour = cssVar('--line-strong', '#d8cebc')
      const s = anchor(phase.id, 'right')
      if (!s) continue
      for (const st of phase.steps) {
        const childId = `${phase.id}::${st.id}`
        const t = anchor(childId, 'left')
        if (!t) continue
        detail.push({
          id: `d-${phase.id}-${st.id}`,
          source: phase.id,
          target: childId,
          // no handle ids, see the note on the stored edges above
          type: 'tree',
          data: { sx: s.x, sy: s.y, tx: t.x, ty: t.y, sSide: 'right', tSide: 'left' },
          style: { stroke: colour, strokeWidth: 1.4 },
          selectable: false,
          deletable: false,
          zIndex: 1,
        })
      }
    }

    // ── Lines around dragged cards ──────────────────────────────────────
    // The routes above are hand-tuned for the line `layout()` draws. A line
    // keeps that route while it still fits: neither of its cards has been
    // dragged, and no card now sits across it. Every other line is handed to
    // the router, which finds a route clear of every card, off every line
    // already drawn, and places its label clear of both. Order matters: what
    // is drawn first is what later lines keep off, so the fixed lines go
    // first, then the main line, then the side paths.
    const shapeOf = new Map(doc.phases.map((p) => [p.id, p.shape]))
    const boxes: { id: string; box: Box }[] = Object.values(lay.positions).map((p) => {
      const shape = p.kind === 'phase' ? shapeOf.get(p.id) : undefined
      return { id: p.id, box: { x: p.x, y: p.y, w: p.w, h: p.h, flat: shape ? FLAT_SIDES[shape] : undefined } }
    })
    const boxById = new Map(boxes.map((b) => [b.id, b.box]))
    const router = new Router(boxes)
    for (const d of detail) {
      const g = d.data as unknown as EdgeGeom
      router.addPath(routePoints(g, g.sx + GEO.treeGapX / 2))
    }

    const rerouted: Edge[] = []
    for (const e of stored) {
      const g = e.data as unknown as EdgeGeom
      const fixed = routePoints(g)
      const touchesMoved = lay.moved.has(e.source) || lay.moved.has(e.target)
      if (!touchesMoved && !router.crossesCards(fixed, [e.source, e.target], Router.KEEP_CLEAR)) {
        router.addPath(fixed)
        if (g.label) {
          const a = labelAnchor(fixed)
          router.addLabelRect(labelRectOf({ x: a.x, y: a.y, place: a.vertical ? 'left' : 'above' }, g.label))
        }
      } else rerouted.push(e)
    }
    const isMain = (e: Edge) => doc.edges.find((d) => d.id === e.id)?.kind === 'main'
    rerouted.sort((a, b) => Number(isMain(b)) - Number(isMain(a)))

    // While a card is in hand, only the lines touching it are worked out
    // again; the rest keep the route they had, unless the card in hand now
    // sits across one. Everything is routed afresh once it is dropped.
    // Three passes: every line, then every label (so a label can see every
    // line and keep off it), then once more for any line that still runs
    // under a label, which can only happen to a line routed before that label
    // existed. That last pass routes it around the label.
    const cache = routeCache.current
    type Placed = { e: Edge; g: EdgeGeom; points: Pt[]; labelAt?: LabelSpot; rect?: ReturnType<typeof labelRectOf>; reused: boolean }
    const placed: Placed[] = []
    const ask = (e: Edge, g: EdgeGeom) => ({ source: e.source, target: e.target, prefSource: g.sSide, prefTarget: g.tSide })
    for (const e of rerouted) {
      const g = e.data as unknown as EdgeGeom
      const sBox = boxById.get(e.source)
      const tBox = boxById.get(e.target)
      if (!sBox || !tBox) continue
      const prev = cache.get(e.id)
      const reuse =
        dragId != null &&
        !!prev &&
        e.source !== dragId &&
        e.target !== dragId &&
        onBorder(prev.points[0], sBox) &&
        onBorder(prev.points[prev.points.length - 1], tBox) &&
        !router.crossesCards(prev.points, [e.source, e.target], Router.KEEP_CLEAR)
      const points = reuse && prev ? prev.points : router.route(ask(e, g))
      router.addPath(points)
      placed.push({ e, g, points, labelAt: reuse ? prev?.labelAt : undefined, reused: reuse })
    }
    for (const p of placed) {
      if (!p.g.label || p.points.length < 2) continue
      if (p.reused && p.labelAt) {
        p.rect = labelRectOf(p.labelAt, p.g.label)
        router.addLabelRect(p.rect)
      } else {
        p.labelAt = router.placeLabel(p.points, p.g.label)
        p.rect = router.lastLabelRect()
      }
    }
    // (skipped mid-drag to keep every frame cheap; it runs on the drop)
    for (const p of dragId == null ? placed : []) {
      if (!router.runsUnderLabel(p.points, p.rect)) continue
      router.removePath(p.points)
      if (p.rect) router.removeLabelRect(p.rect)
      p.points = router.route(ask(p.e, p.g))
      router.addPath(p.points)
      if (p.g.label) {
        p.labelAt = router.placeLabel(p.points, p.g.label)
        p.rect = router.lastLabelRect()
      }
    }
    const nextCache = new Map<string, { points: Pt[]; labelAt?: LabelSpot }>()
    for (const p of placed) {
      nextCache.set(p.e.id, { points: p.points, labelAt: p.labelAt })
      p.e.data = { ...p.g, points: p.points, labelAt: p.labelAt }
      // marks the line in the DOM as router-drawn, for verify-drag.mjs
      p.e.className = 'rerouted'
    }
    routeCache.current = nextCache

    return [...stored, ...detail]
  }, [doc, lay, sel, themeTick, nodeSetKey, dragId])


  // The key. In the symbol view it explains the SHAPES, which is what carries
  // meaning there. In the other view it explains the owner colours.
  const legend = useMemo(() => {
    void themeTick
    if (src.symbols) {
      return [
        { id: 'terminator', label: 'Start / end', colour: '#5D6B82', shape: 'terminator' as const },
        { id: 'document', label: 'Document', colour: '#3D6FA5', shape: 'document' as const },
        { id: 'process', label: 'Step', colour: '#1B2E4C', shape: 'process' as const },
        { id: 'manual', label: 'Done by hand', colour: '#8A5C86', shape: 'manual' as const },
        { id: 'decision', label: 'Decision', colour: '#C08A1E', shape: 'decision' as const },
      ]
    }
    const used = new Set(doc.phases.map((p) => p.lane))
    return src.lanes
      .filter((l) => used.has(l.id))
      .map((l) => ({
        id: l.id as string,
        label: l.short ?? l.title,
        colour:
          l.id === 'human'
            ? cssVar('--human', '#8a5c86')
            : l.id === 'system'
              ? cssVar('--theirs', '#5d6b82')
              : cssVar('--accent', '#e0a43b'),
        shape: undefined,
      }))
  }, [doc.phases, themeTick, src])

  const questionCount = qs.remaining

  const glideTimer = useRef(0)
  const glide = useCallback((to: { x: number; y: number; zoom: number }) => {
    window.clearInterval(glideTimer.current)
    const from = rfRef.current.getViewport()
    const started = performance.now()
    const dur = 380
    glideUntil.current = started + dur + 20
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)
    glideTimer.current = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - started) / dur)
      const e = ease(p)
      rfRef.current.setViewport({
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        zoom: from.zoom + (to.zoom - from.zoom) * e,
      })
      if (p >= 1) window.clearInterval(glideTimer.current)
    }, 16)
  }, [])

  useEffect(() => () => window.clearInterval(glideTimer.current), [])

  const fitTo = useCallback(
    (ids?: string[]) => {
      const pane = wrapRef.current?.querySelector<HTMLElement>('.react-flow')
      if (!pane || !pane.clientWidth || !pane.clientHeight) return
      const pool = nodesRef.current
      const focused = !!ids?.length
      // A whole-line fit (reset, import, a card added or deleted, Collapse,
      // Expand, the fit button) makes any saved "return to" spot meaningless.
      if (!focused) returnVp.current = null
      const target = (focused ? ids! : pool.map((n) => n.id)).filter((id) =>
        pool.some((n) => n.id === id),
      )
      if (!target.length) return
      const bounds = rfRef.current.getNodesBounds(target)
      if (!bounds.width || !bounds.height) return
      const vp = getViewportForBounds(
        bounds,
        pane.clientWidth,
        pane.clientHeight,
        0.05,
        focused ? 1.15 : 1,
        focused ? 0.16 : 0.1,
      )
      glide(vp)
    },
    [glide],
  )

  // Opening the editor takes ~360px off the right of the canvas. The view is
  // NOT refitted (that threw away wherever the viewer had got to). Instead, if
  // the card being edited would end up behind the panel, the canvas is nudged
  // just enough to keep it in sight, and closing the editor undoes exactly that
  // nudge, so the viewer lands back where they were.
  const panelOpen = !!sel
  const selNodeId = !sel
    ? null
    : sel.kind === 'phase' || sel.kind === 'note'
      ? sel.id
      : sel.kind === 'step'
        ? `${sel.phaseId}::${sel.stepId}`
        : null
  const selNodeRef = useRef<string | null>(null)
  selNodeRef.current = selNodeId
  const firstPanelRender = useRef(true)
  useEffect(() => {
    if (firstPanelRender.current) {
      firstPanelRender.current = false
      return
    }
    const t = window.setTimeout(() => {
      // A fit started by the same action (a card added or deleted) is still
      // gliding: it decides the view, so neither nudge nor undo a nudge.
      if (performance.now() < glideUntil.current) {
        panelShift.current = 0
        return
      }
      const vp = rfRef.current.getViewport()
      if (!panelOpen) {
        if (panelShift.current) glide({ ...vp, x: vp.x - panelShift.current })
        panelShift.current = 0
        return
      }
      const pane = wrapRef.current?.querySelector<HTMLElement>('.react-flow')?.getBoundingClientRect()
      const el = selNodeRef.current
        ? wrapRef.current?.querySelector<HTMLElement>(`.react-flow__node[data-id="${CSS.escape(selNodeRef.current)}"]`)
        : null
      if (!pane || !el) return
      const r = el.getBoundingClientRect()
      const margin = 24
      let dx = 0
      if (r.right > pane.right - margin) dx = pane.right - margin - r.right
      if (r.left + dx < pane.left + margin) dx = pane.left + margin - r.left
      if (dx) {
        panelShift.current = dx
        glide({ ...vp, x: vp.x + dx })
      }
    }, 230)
    return () => window.clearTimeout(t)
  }, [panelOpen, glide])

  useEffect(() => {
    if (!pendingFit) return
    const { ids, restore } = pendingFit
    const t = window.setTimeout(() => {
      if (restore) glide(restore)
      else fitTo(ids)
      setPendingFit(null)
    }, 70)
    return () => window.clearTimeout(t)
  }, [pendingFit, fitTo, glide])

  // Changes MUST still be forwarded to the mirrored state: React Flow keeps
  // re-emitting an unapplied change (dimensions in particular), which with
  // the mirror in place and nothing applying it becomes an infinite render
  // loop that freezes the tab. Note and phase positions are also written back
  // to the document: a note as where it is, a phase as its offset from the
  // slot `layout()` gives it, so layout() stays the one source of positions
  // and every line is redrawn from it on every frame of the drag.
  const onNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onRfNodesChange(changes)
      setDoc((d) => {
        let next = d
        for (const c of changes) {
          if (c.type === 'position' && c.position) {
            const note = next.notes.find((n) => n.id === c.id)
            if (note) {
              next = {
                ...next,
                notes: next.notes.map((n) =>
                  n.id === c.id ? { ...n, x: c.position!.x, y: c.position!.y } : n,
                ),
              }
              continue
            }
            const home = layRef.current.natural[c.id]
            if (home && next.phases.some((p) => p.id === c.id)) {
              next = {
                ...next,
                phases: next.phases.map((p) =>
                  p.id === c.id ? withMoved(p, c.position!.x - home.x, c.position!.y - home.y) : p,
                ),
              }
            }
          }
        }
        return next
      })
    },
    [onRfNodesChange],
  )

  const onNodeDragStart = useCallback((_: unknown, node: Node) => {
    if (node.type === 'phase') setDragId(node.id)
  }, [])

  // On drop the card is settled clear of the others (layout() does that for
  // any card not in hand), and the settled offset is written back, so the
  // saved and exported file says where the card actually is on screen.
  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    if (node.type !== 'phase') return
    setDragId(null)
    setDoc((d) => {
      const settled = layout(d)
      const pos = settled.positions[node.id]
      const home = settled.natural[node.id]
      if (!pos || !home) return d
      return { ...d, phases: d.phases.map((p) => (p.id === node.id ? withMoved(p, pos.x - home.x, pos.y - home.y) : p)) }
    })
    if (!movedHint.current) {
      movedHint.current = true
      setToast('Card moved, its lines re-routed around the others. More, then "Put cards back in line", undoes every move.')
    }
  }, [])

  const anyMoved = doc.phases.some((p) => p.moved)
  const putBack = (id?: string) => {
    setDoc((d) => ({ ...d, phases: d.phases.map((p) => (!id || p.id === id ? { ...p, moved: undefined } : p)) }))
    if (!id) {
      setPendingFit({})
      setToast('Every card is back on the line.')
    }
  }

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return
    setDoc((d) => ({
      ...d,
      edges: [
        ...d.edges,
        {
          id: `u-${d.edges.length}-${c.source}-${c.target}`,
          source: c.source!,
          target: c.target!,
          sourceHandle: c.sourceHandle,
          targetHandle: c.targetHandle,
          kind: 'branch' as EdgeKind,
          label: 'new link',
        },
      ],
    }))
    setToast('Link drawn. Select it to label it or make it part of the main path.')
  }, [])

  const selectNode = useCallback((_: unknown, node: Node) => {
    if (node.type === 'phase') setSel({ kind: 'phase', id: node.id })
    else if (node.type === 'step') {
      const [phaseId, stepId] = node.id.split('::')
      setSel({ kind: 'step', phaseId, stepId })
    } else if (node.type === 'note') setSel({ kind: 'note', id: node.id })
  }, [])

  const patchPhase = (id: string, patch: Partial<FlowPhase>) =>
    setDoc((d) => ({ ...d, phases: d.phases.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

  const patchStep = (phaseId: string, stepId: string, patch: Partial<Step>) =>
    setDoc((d) => ({
      ...d,
      phases: d.phases.map((p) =>
        p.id === phaseId
          ? { ...p, steps: p.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)) }
          : p,
      ),
    }))

  const addPhase = (lane: LaneId) => {
    const id = `new-phase-${doc.phases.length}-${Math.round(performance.now())}`
    const last = [...doc.phases].reverse().find((p) => p.lane === lane)
    setDoc((d) => ({
      ...d,
      phases: [
        ...d.phases,
        { id, lane, title: 'New phase', summary: 'Say what happens here.', systems: [], steps: [] },
      ],
      edges: last
        ? [
            ...d.edges,
            { id: `u-${id}-seq`, source: last.id, target: id, kind: 'main' as EdgeKind, sourceHandle: 'h-right', targetHandle: 'h-left' },
          ]
        : d.edges,
    }))
    setSel({ kind: 'phase', id })
    setPendingFit({})
    setToast(`A ${laneShort(src, lane)} card was added.`)
  }

  const deletePhase = (id: string) => {
    setDoc((d) => ({
      ...d,
      phases: d.phases.filter((p) => p.id !== id),
      edges: d.edges.filter((e) => e.source !== id && e.target !== id),
      expanded: d.expanded.filter((x) => x !== id),
    }))
    setSel(null)
    setPendingFit({})
  }

  const addStep = (phaseId: string) => {
    const stepId = `new-step-${Math.round(performance.now())}`
    setDoc((d) => ({
      ...d,
      phases: d.phases.map((p) =>
        p.id === phaseId
          ? { ...p, steps: [...p.steps, { id: stepId, title: 'New step', summary: 'Say what happens at this step.' }] }
          : p,
      ),
      expanded: d.expanded.includes(phaseId) ? d.expanded : [...d.expanded, phaseId],
    }))
    setSel({ kind: 'step', phaseId, stepId })
    setPendingFit({ ids: [phaseId] })
  }

  const deleteStep = (phaseId: string, stepId: string) => {
    setDoc((d) => ({
      ...d,
      phases: d.phases.map((p) =>
        p.id === phaseId ? { ...p, steps: p.steps.filter((s) => s.id !== stepId) } : p,
      ),
    }))
    setSel({ kind: 'phase', id: phaseId })
  }

  const addNote = () => {
    const id = `note-${Math.round(performance.now())}`
    setDoc((d) => ({ ...d, notes: [...d.notes, { id, x: 0, y: lay.height + 40, text: 'Type your note here.' }] }))
    setSel({ kind: 'note', id })
    setPendingFit({})
  }

  const deleteNote = (id: string) => {
    setDoc((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }))
    setSel(null)
  }

  const deleteEdge = (id: string) => {
    setDoc((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }))
    setSel(null)
  }

  const patchEdge = (id: string, patch: { label?: string; kind?: EdgeKind }) =>
    setDoc((d) => ({ ...d, edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))

  const collapseAll = () => {
    returnVp.current = null
    setDoc((d) => ({ ...d, expanded: [] }))
    setPendingFit({})
  }
  const expandAll = () => {
    returnVp.current = null
    setDoc((d) => ({ ...d, expanded: d.phases.filter((p) => p.steps.length > 0).map((p) => p.id) }))
    setPendingFit({})
  }

  const exportImage = async () => {
    const vp = wrapRef.current?.querySelector<HTMLElement>('.react-flow__viewport')
    if (!vp) return
    const visible = computedNodes.filter((n) => n.type !== 'lane')
    const bounds = rfRef.current.getNodesBounds((visible.length ? visible : computedNodes).map((n) => n.id))
    const w = Math.min(3600, Math.max(1000, Math.round(bounds.width + 160)))
    const h = Math.min(3600, Math.max(700, Math.round(bounds.height + 160)))
    const t = getViewportForBounds(bounds, w, h, 0.15, 2, 60)
    try {
      const url = await toPng(vp, {
        backgroundColor: cssVar('--bg', '#faf6ef'),
        width: w,
        height: h,
        skipFonts: true,
        style: { width: `${w}px`, height: `${h}px`, transform: `translate(${t.x}px, ${t.y}px) scale(${t.zoom})` },
      })
      const a = document.createElement('a')
      a.href = url
      a.download = `process-flow-${src.id}.png`
      a.click()
      setToast('Image exported, it shows exactly what is open on screen right now.')
    } catch {
      setToast('Image export failed. Try collapsing some cards and exporting again.')
    }
  }

  const exportJson = (withQuestions: boolean) => {
    // Named per view: both views export, and two files called the same thing
    // is how a client ends up importing the wrong one back. The questions and
    // any answers typed on the call ride along unless the person says not to;
    // they also stay in this browser session either way.
    const payload = withQuestions ? { ...doc, questions: questionsForExport(content.questions, qs.state) } : doc
    saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `process-flow-${src.id}.json`)
    setExportOpen(false)
    setToast(
      withQuestions
        ? 'File exported with the questions and answers. Import it later to carry on where you left off.'
        : 'File exported. Import it later to carry on editing where you left off.',
    )
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const parsed = parseImported(String(reader.result), src)
      if (!parsed) {
        setToast('That file is not a process-flow export.')
        return
      }
      setDoc(parsed)
      setSel(null)
      setPendingFit({})
      let withQuestions = false
      try {
        const exported = JSON.parse(String(reader.result))?.questions
        if (exported && typeof exported === 'object') {
          qs.replace(questionsFromImport(content.questions, exported))
          withQuestions = true
        }
      } catch {
        /* parseImported already accepted the file; questions are optional */
      }
      setToast(withQuestions ? 'Flow imported, with its questions and answers.' : 'Flow imported, including which cards were open.')
    }
    reader.readAsText(file)
  }

  const reset = () => {
    clearDoc(src)
    setDoc(buildInitialDoc(src))
    setSel(null)
    setPendingFit({})
    setToast('Rebuilt from the original process. Your edits are gone.')
  }

  const panelBodyRef = useRef<HTMLDivElement | null>(null)
  const selKey = sel ? `${sel.kind}:${'id' in sel ? sel.id : ''}${'stepId' in sel ? sel.stepId : ''}` : ''
  useEffect(() => {
    if (panelBodyRef.current) panelBodyRef.current.scrollTop = 0
  }, [selKey])

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = panelW
    const move = (ev: PointerEvent) => setPanelW(Math.min(620, Math.max(288, startW + (startX - ev.clientX))))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const selPhase = sel?.kind === 'phase' ? doc.phases.find((p) => p.id === sel.id) : undefined
  const selStepPhase = sel?.kind === 'step' ? doc.phases.find((p) => p.id === sel.phaseId) : undefined
  const selStep = selStepPhase?.steps.find((s) => sel?.kind === 'step' && s.id === sel.stepId)
  const selNote = sel?.kind === 'note' ? doc.notes.find((n) => n.id === sel.id) : undefined
  const selEdge = sel?.kind === 'edge' ? doc.edges.find((e) => e.id === sel.id) : undefined
  // A connection named "t-query to t-approve" means nothing to a client. Name
  // the cards it actually joins.
  const phaseTitle = (id: string) => doc.phases.find((p) => p.id === id)?.title ?? id

  const laneTone = (lane: LaneId): 'navy' | 'theirs' | 'human' =>
    lane === 'ours' ? 'navy' : lane === 'system' ? 'theirs' : 'human'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="theme-t flex h-[44px] shrink-0 items-center gap-2 border-b border-line bg-surface px-4">
        <Button size="sm" onClick={collapseAll} title="Back to the high-level view">
          <IconCollapse size={13} /> Collapse
        </Button>
        <Button size="sm" onClick={expandAll} title="Open every card's detail">
          <IconExpand size={13} /> Expand
        </Button>
        <span className="h-4 w-px bg-line" />
        <Button size="sm" onClick={addNote} title="Add a sticky note anywhere on the canvas">
          <IconNote size={13} /> Note
        </Button>
        <div className="relative">
          <Button size="sm" onClick={() => setMenuOpen((o) => !o)} active={menuOpen} title="More actions">
            <IconMenu size={13} /> More
          </Button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 z-40 mt-1.5 w-[248px] animate-fade-up overflow-hidden rounded-card border border-line bg-surface py-1 shadow-pop">
                {src.lanes.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      addPhase(l.id)
                      setMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink transition-colors hover:bg-surface-2"
                  >
                    <IconPlus size={13} className="text-ink-3" /> Add a {l.short ?? l.title} card
                  </button>
                ))}
                <div className="my-1 h-px bg-line" />
                <button type="button" onClick={() => { exportImage(); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink transition-colors hover:bg-surface-2">
                  <IconImage size={13} className="text-ink-3" /> Export image
                </button>
                <button type="button" onClick={() => { setIncludeQ(true); setExportOpen(true); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink transition-colors hover:bg-surface-2">
                  <IconDownload size={13} className="text-ink-3" /> Export file
                </button>
                <button type="button" onClick={() => { fileRef.current?.click(); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink transition-colors hover:bg-surface-2">
                  <IconFile size={13} className="text-ink-3" /> Import file
                </button>
                <div className="my-1 h-px bg-line" />
                <button
                  type="button"
                  disabled={!anyMoved}
                  onClick={() => { putBack(); setMenuOpen(false) }}
                  title={anyMoved ? 'Every card you dragged goes back to its place on the line. Your edits stay.' : 'No card has been moved'}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <IconCollapse size={13} className="text-ink-3" /> Put cards back in line
                </button>
                <button type="button" onClick={() => { reset(); setMenuOpen(false) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-high transition-colors hover:bg-high-soft">
                  <IconReset size={13} /> Reset to the original flow
                </button>
              </div>
            </>
          )}
        </div>
        {src.readAs && (
          <p className="ml-3 hidden min-w-0 truncate text-[11px] text-ink-3 2xl:block" title={src.readAs}>
            {src.readAs}
          </p>
        )}

        {/* Two views of the same job. Their process first, ours second. */}
        <div className="ml-auto flex shrink-0 items-center rounded-lg border border-line bg-surface-2 p-0.5">
          {FLOW_VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              title={FLOW_SOURCES[v].readAs}
              className={cx(
                'rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150',
                v === variant ? 'bg-navy-800 text-white shadow-sm' : 'text-ink-2 hover:bg-surface',
              )}
            >
              {FLOW_SOURCES[v].tab}
            </button>
          ))}
        </div>

        {/* Everything the diagram is guessing at, and everything else worth
            asking, in one place. This replaces the sticky note that used to
            carry the assumptions on the canvas. */}
        <div className="relative shrink-0">
          <Button size="sm" onClick={() => setQOpen((o) => !o)} active={qOpen} title="Questions to ask on the call">
            <IconInfo size={13} /> Questions
            <span className="num ml-0.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-on-accent">
              {questionCount}
            </span>
            <IconChevronRight size={12} className={cx('transition-transform duration-200', qOpen && 'rotate-90')} />
          </Button>
          {qOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setQOpen(false)} />
              <div className="absolute right-0 z-40 mt-1.5 max-h-[72vh] w-[460px] animate-fade-up overflow-auto rounded-card border border-line bg-surface shadow-pop">
                <div className="sticky top-0 z-10 border-b border-line bg-surface px-3.5 py-2.5">
                  <p className="text-[12.5px] font-semibold text-ink">Questions for the call</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-ink-3">
                    Start with the highlighted group: everything the diagram is guessing at. Answer a question as the
                    client talks, or remove it. Both are kept for this browser session.
                  </p>
                </div>
                {content.questions.map((g, gi) => {
                  const live = g.questions.map((q, i) => ({ q, key: questionKey(g.id, i) })).filter((x) => !qs.state.removed.includes(x.key))
                  if (!live.length) return null
                  const first = gi === 0
                  return (
                    <div key={g.id} className={cx('border-b border-line last:border-0', first && 'bg-assume-soft/40')}>
                      <div className={cx('px-3.5 py-1.5', first ? 'border-l-[3px] border-assume bg-assume-soft/80' : 'bg-surface-2/60')}>
                        <p className={cx('text-[10.5px] font-bold uppercase tracking-wider', first ? 'text-assume' : 'text-ink-2')}>
                          {first ? `Confirm these first · ${g.title}` : g.title}
                        </p>
                        {g.caption && <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-3">{g.caption}</p>}
                      </div>
                      {live.map(({ q, key }) => {
                        const open = openQ === key
                        const answer = qs.state.answers[key]
                        const isAnswering = answering === key
                        return (
                          <div key={key} className="group/q">
                            <div className="flex items-start gap-2 px-3.5 py-2">
                              <span className={cx('mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full', answer ? 'bg-ok' : 'bg-accent')} />
                              <button
                                type="button"
                                onClick={() => setOpenQ(open ? null : q.why ? key : null)}
                                className={cx('flex flex-1 items-start gap-1.5 text-left', q.why ? '' : 'cursor-default')}
                                title={q.why ? 'Why we are asking' : undefined}
                              >
                                <span className="flex-1 text-[11.5px] leading-relaxed text-ink">{q.q}</span>
                                {q.why && (
                                  <IconChevronRight
                                    size={12}
                                    className={cx('mt-[3px] shrink-0 text-ink-3 transition-transform duration-200', open && 'rotate-90')}
                                  />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAnswering(isAnswering ? null : key)
                                  setAnswerDraft(answer ?? '')
                                }}
                                className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-ink-2 transition-colors hover:border-accent/50 hover:bg-accent-soft/50"
                                title={answer ? 'Edit the answer' : 'Write the answer'}
                              >
                                {answer ? 'Edit answer' : 'Answer'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  qs.remove(key)
                                  if (answering === key) setAnswering(null)
                                }}
                                className="shrink-0 rounded-md p-0.5 text-ink-3 transition-colors hover:bg-high-soft hover:text-high"
                                title="Remove this question"
                                aria-label="Remove this question"
                              >
                                <IconClose size={13} />
                              </button>
                            </div>
                            {open && q.why && (
                              <p className="animate-fade-up mx-3.5 mb-2 ml-7 rounded-md border-l-2 border-accent bg-accent-soft/40 px-2.5 py-2 text-[11px] leading-relaxed text-ink-2">
                                {q.why}
                              </p>
                            )}
                            {answer && !isAnswering && (
                              <p className="mx-3.5 mb-2 ml-7 whitespace-pre-line rounded-md border-l-2 border-ok bg-ok-soft/60 px-2.5 py-1.5 text-[11px] leading-relaxed text-ink">
                                <span className="font-semibold text-ok">Answer: </span>
                                {answer}
                              </p>
                            )}
                            {isAnswering && (
                              <div className="animate-fade-up mx-3.5 mb-2.5 ml-7">
                                <textarea
                                  autoFocus
                                  rows={3}
                                  value={answerDraft}
                                  onChange={(e) => setAnswerDraft(e.target.value)}
                                  placeholder="What the client said"
                                  className="w-full resize-y rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-ink outline-none focus:border-accent/60"
                                />
                                <div className="mt-1 flex gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => {
                                      qs.setAnswer(key, answerDraft)
                                      setAnswering(null)
                                    }}
                                  >
                                    Save answer
                                  </Button>
                                  <Button size="sm" onClick={() => setAnswering(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
                {qs.state.removed.length > 0 && (
                  <div className="flex items-center justify-between border-t border-line px-3.5 py-2 text-[11px] text-ink-3">
                    <span>
                      {qs.state.removed.length} question{qs.state.removed.length === 1 ? '' : 's'} removed
                    </span>
                    <button type="button" onClick={qs.restoreAll} className="font-semibold text-ink-2 underline-offset-2 hover:underline">
                      Bring them back
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {exportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
          onClick={() => setExportOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setExportOpen(false)}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div
            role="dialog"
            aria-label="Export this flow"
            className="animate-fade-up w-full max-w-[400px] rounded-card border border-line bg-surface p-5 shadow-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[14px] font-semibold text-ink">Export this flow as a file</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              The file keeps every card, line and note on this view, so it can be imported later to carry on.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
              <input
                type="checkbox"
                checked={includeQ}
                onChange={(e) => setIncludeQ(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[rgb(var(--accent))]"
              />
              <span>
                <span className="block text-[12.5px] font-semibold text-ink">Include the questions and their answers</span>
                <span className="block text-[11px] leading-relaxed text-ink-3">
                  {qs.remaining} question{qs.remaining === 1 ? '' : 's'}, {qs.answered} answered. Removed questions are left out.
                  They stay in this browser session either way.
                </span>
              </span>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" onClick={() => setExportOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={() => exportJson(includeQ)}>
                <IconDownload size={13} /> Export file
              </Button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) importJson(f)
          e.target.value = ''
        }}
      />

      <div className="relative flex min-h-0 flex-1">
        <div ref={wrapRef} className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            // a click that wobbles a few pixels is still a click (it opens the
            // editor); only a real drag moves the card
            nodeDragThreshold={5}
            selectNodesOnDrag={false}
            onConnect={onConnect}
            onNodeClick={selectNode}
            onEdgeClick={(_, e) => {
              if (e.selectable === false) return
              setSel({ kind: 'edge', id: e.id })
            }}
            onPaneClick={() => setSel(null)}
            connectionMode={ConnectionMode.Loose}
            nodesDraggable
            nodesConnectable
            elementsSelectable
            deleteKeyCode={null}
            minZoom={0.12}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="bg-bg"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} className="opacity-60" />
            <Controls showInteractive={false} position="bottom-right" onFitView={() => fitTo()} />
          </ReactFlow>

          {/* The key sits on the canvas, not in the toolbar: five symbols do
              not fit next to the view switcher on a laptop. */}
          <div className="theme-t pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-line bg-surface/95 px-3 py-2 shadow-panel backdrop-blur-sm">
            <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-3">
              {src.symbols ? 'What each shape means' : 'Who does each step'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
              {legend.map((l) => (
                <span key={l.id} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-ink-2">
                  {l.shape ? (
                    <LegendSymbol shape={l.shape} colour={l.colour} />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: l.colour }} />
                  )}
                  {l.label}
                </span>
              ))}
            </div>
          </div>

        </div>

        {sel && (
          <div style={{ width: panelW }} className="theme-t relative flex min-h-0 animate-slide-in flex-col border-l border-line bg-surface">
            <div onPointerDown={startResize} title="Drag to resize" className="absolute left-0 top-0 z-10 h-full w-[6px] cursor-col-resize bg-transparent transition-colors duration-150 hover:bg-accent/25" />
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold tracking-tight text-ink">
                  {sel.kind === 'phase' ? 'Phase' : sel.kind === 'step' ? 'Step' : sel.kind === 'note' ? 'Note' : 'Connection'}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-3">Changes save as you type</p>
              </div>
              <button type="button" onClick={() => setSel(null)} className="rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">
                <IconClose size={14} />
              </button>
            </div>

            {/* Scrolled back to the top on every new selection. Without it,
                "Add step" lands you halfway down the new step's form with the
                title field above the fold. */}
            <div ref={panelBodyRef} className="min-h-0 flex-1 space-y-3.5 overflow-auto p-4">
              {selPhase && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={laneTone(selPhase.lane)}>{laneShort(src, selPhase.lane)}</Badge>
                  </div>

                  {/* On this view the SHAPE carries the meaning, so it has to be
                      correctable live. "That one is not done by hand, it is in
                      our system" is the most likely correction on a call. */}
                  {src.symbols ? (
                    <Field label="What kind of step this is">
                      <div className="grid grid-cols-2 gap-1.5">
                        {SHAPE_CHOICES.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => patchPhase(selPhase.id, { shape: o.id })}
                            className={cx(
                              'rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors',
                              (selPhase.shape ?? 'process') === o.id
                                ? 'border-accent bg-accent-soft font-semibold text-ink'
                                : 'border-line bg-surface-2 text-ink-2 hover:border-accent/40',
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </Field>
                  ) : (
                    /* On the ownership view the LANE carries the meaning, and
                       "no, we would keep that one" is the correction to expect. */
                    <Field label="Who does this step">
                      <div className="grid gap-1.5">
                        {src.lanes.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => patchPhase(selPhase.id, { lane: l.id })}
                            className={cx(
                              'rounded-md border px-2.5 py-1.5 text-left text-[11.5px] transition-colors',
                              selPhase.lane === l.id
                                ? 'border-accent bg-accent-soft font-semibold text-ink'
                                : 'border-line bg-surface-2 text-ink-2 hover:border-accent/40',
                            )}
                          >
                            {l.title}
                          </button>
                        ))}
                      </div>
                    </Field>
                  )}

                  <Field label="Title">
                    <TextInput value={selPhase.title} onChange={(v) => patchPhase(selPhase.id, { title: v })} />
                  </Field>
                  <Field label="What happens here">
                    <TextArea value={selPhase.summary} rows={4} onChange={(v) => patchPhase(selPhase.id, { summary: v })} />
                  </Field>
                  <Field label="Systems shown on the card" hint="Comma separated">
                    <TextInput
                      value={selPhase.systems.join(', ')}
                      onChange={(v) => patchPhase(selPhase.id, { systems: v.split(',').map((s) => s.trim()).filter(Boolean) })}
                    />
                  </Field>
                  <Field label="Note, with the reason behind it">
                    <TextArea value={selPhase.note ?? ''} rows={3} onChange={(v) => patchPhase(selPhase.id, { note: v })} />
                  </Field>
                  <Toggle checked={!!selPhase.assumption} label="Mark as an assumption, to confirm" onChange={(v) => patchPhase(selPhase.id, { assumption: v })} />
                  <div className="space-y-1.5 border-t border-line pt-3">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Steps inside this phase</p>
                    {selPhase.steps.map((s) => (
                      <button key={s.id} type="button" onClick={() => setSel({ kind: 'step', phaseId: selPhase.id, stepId: s.id })} className="block w-full rounded-md border border-line bg-surface-2 px-2.5 py-2 text-left text-[11.5px] text-ink transition-colors hover:border-accent/40 hover:bg-accent-soft">
                        {s.title}
                      </button>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button size="sm" onClick={() => addStep(selPhase.id)}>
                        <IconPlus size={12} /> Add step
                      </Button>
                      {selPhase.moved && (
                        <Button size="sm" onClick={() => putBack(selPhase.id)} title="Back to its place on the line">
                          <IconCollapse size={12} /> Put back in line
                        </Button>
                      )}
                      <Button size="sm" variant="danger" onClick={() => deletePhase(selPhase.id)}>
                        <IconTrash size={12} /> Delete phase
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {selStep && selStepPhase && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="neutral">in {selStepPhase.title}</Badge>
                    <Badge tone={laneTone(selStepPhase.lane)}>{laneShort(src, selStepPhase.lane)}</Badge>
                  </div>
                  <Field label="Title">
                    <TextInput value={selStep.title} onChange={(v) => patchStep(selStepPhase.id, selStep.id, { title: v })} />
                  </Field>
                  <Field label="What happens at this step">
                    <TextArea value={selStep.summary ?? ''} rows={4} onChange={(v) => patchStep(selStepPhase.id, selStep.id, { summary: v })} />
                  </Field>
                  <Field label="Who is responsible">
                    <TextInput value={selStep.responsible ?? ''} onChange={(v) => patchStep(selStepPhase.id, selStep.id, { responsible: v })} />
                  </Field>
                  <Field label="What gets recorded here">
                    <TextInput value={selStep.records ?? ''} onChange={(v) => patchStep(selStepPhase.id, selStep.id, { records: v })} />
                  </Field>
                  <Field label="Who gets told">
                    <TextInput value={selStep.notifies ?? ''} onChange={(v) => patchStep(selStepPhase.id, selStep.id, { notifies: v })} />
                  </Field>
                  <Field label="Note, with the reason or source">
                    <TextArea value={selStep.note ?? ''} rows={3} onChange={(v) => patchStep(selStepPhase.id, selStep.id, { note: v })} />
                  </Field>
                  <Toggle checked={!!selStep.assumption} label="Mark as an assumption, to confirm" onChange={(v) => patchStep(selStepPhase.id, selStep.id, { assumption: v })} />
                  <div className="border-t border-line pt-3">
                    <Button size="sm" variant="danger" onClick={() => deleteStep(selStepPhase.id, selStep.id)}>
                      <IconTrash size={12} /> Delete step
                    </Button>
                  </div>
                </>
              )}

              {selNote && (
                <>
                  {selNote.kind === 'assumption' && (
                    <Note tone="boundary">
                      This note carries a flagged assumption to confirm on the call.
                    </Note>
                  )}
                  <Field label="Note text">
                    <TextArea value={selNote.text} rows={10} onChange={(v) => setDoc((d) => ({ ...d, notes: d.notes.map((n) => (n.id === selNote.id ? { ...n, text: v } : n)) }))} />
                  </Field>
                  <p className="text-[11px] text-ink-3">Drag the note on the canvas to move it.</p>
                  <div className="border-t border-line pt-3">
                    <Button size="sm" variant="danger" onClick={() => deleteNote(selNote.id)}>
                      <IconTrash size={12} /> Delete note
                    </Button>
                  </div>
                </>
              )}

              {selEdge && (
                <>
                  <div className="rounded-md border border-line bg-surface-2 p-2.5 text-[11.5px] text-ink-2">
                    {phaseTitle(selEdge.source)} <span className="px-1 text-ink-3">→</span> {phaseTitle(selEdge.target)}
                  </div>
                  <Field label="Label, or the condition on this path">
                    <TextInput value={selEdge.label ?? ''} onChange={(v) => patchEdge(selEdge.id, { label: v })} />
                  </Field>
                  <Field label="Kind of path">
                    <div className="flex gap-2">
                      <Button size="sm" variant={selEdge.kind === 'main' ? 'primary' : 'quiet'} onClick={() => patchEdge(selEdge.id, { kind: 'main' })}>
                        Main path
                      </Button>
                      <Button size="sm" variant={selEdge.kind === 'branch' ? 'primary' : 'quiet'} onClick={() => patchEdge(selEdge.id, { kind: 'branch' })}>
                        Branch or exception
                      </Button>
                    </div>
                  </Field>
                  <p className="text-[11px] leading-relaxed text-ink-3">
                    The main path is solid. A branch is dashed, coloured by whose lane it leads into, and carries its condition as a label.
                  </p>
                  <div className="border-t border-line pt-3">
                    <Button size="sm" variant="danger" onClick={() => deleteEdge(selEdge.id)}>
                      <IconTrash size={12} /> Delete connection
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-lg border border-line bg-surface px-3.5 py-2 text-[11.5px] text-ink shadow-pop">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}

/** The key draws the real symbol, so the key and the canvas agree. */
function LegendSymbol({ shape, colour }: { shape: string; colour: string }) {
  const w = 18
  const h = 11
  const common = { fill: 'none', stroke: colour, strokeWidth: 1.6, strokeLinejoin: 'round' as const }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      {shape === 'terminator' && <rect x="1" y="1" width={w - 2} height={h - 2} rx={(h - 2) / 2} {...common} />}
      {shape === 'process' && <rect x="1" y="1" width={w - 2} height={h - 2} rx="1.5" {...common} />}
      {shape === 'decision' && <polygon points={`${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}`} {...common} />}
      {shape === 'manual' && <polygon points={`4,1 ${w - 4},1 ${w - 1},${h - 1} 1,${h - 1}`} {...common} />}
      {shape === 'document' && (
        <path d={`M1,1 L${w - 1},1 L${w - 1},${h - 3} C${w * 0.7},${h} ${w * 0.35},${h - 5} 1,${h - 2} Z`} {...common} />
      )}
    </svg>
  )
}

/* ------------------------------ tiny form kit ---------------------------- */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] text-ink-3">{hint}</span>}
    </label>
  )
}

const inputCls =
  'theme-t w-full rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[12px] text-ink outline-none transition-all duration-200 placeholder:text-ink-3 focus:border-accent/50 focus:bg-surface'

const TextInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
)

const TextArea = ({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) => (
  <textarea className={cx(inputCls, 'resize-y leading-relaxed')} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
)

const Toggle = ({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) => (
  <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-left transition-colors duration-200 hover:border-line-strong">
    <span className={cx('flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded border transition-colors duration-200', checked ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface')}>
      {checked && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
          <path d="m4.5 12.5 5 5 10-11" />
        </svg>
      )}
    </span>
    <span className="text-[11.5px] text-ink">{label}</span>
  </button>
)

/** The standard flowchart symbols, in the words a client would use. */
const SHAPE_CHOICES: { id: FlowShape; label: string }[] = [
  { id: 'terminator', label: 'Start or end' },
  { id: 'document', label: 'A document' },
  { id: 'process', label: 'A step in a system' },
  { id: 'manual', label: 'Done by hand' },
  { id: 'decision', label: 'A decision' },
]

export function ProcessFlow() {
  // Open on the client's own process. Showing them their job first, and being
  // corrected on it, is worth more than leading with what we would sell.
  const [variant, setVariant] = useState<FlowVariant>('today')
  const src = FLOW_SOURCES[variant]
  return (
    <ReactFlowProvider key={variant}>
      <FlowInner key={variant} src={src} variant={variant} setVariant={setVariant} />
    </ReactFlowProvider>
  )
}
