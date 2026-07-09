import { useContext, useLayoutEffect, useState } from 'react'
import { layout } from '../data/org.js'
import { getTeam } from '../data/selectors.js'
import { ChartOptionsContext } from '../ChartOptionsContext.js'
import './ConnectorLayer.css'

// ── Which nodes each bus connects (derived from the layout) ──────────────────
// The head anchor for a layout column: a team's head, or a group's leader.
const columnAnchor = (col) => (col.group ? col.group.leader : getTeam(col.team).head)

// CEO → every top-level column head/leader.
const ceoTargets = layout.columns.map(columnAnchor)

// Each group leader → its sub-column heads plus any extras beside them
// (Lindsey, Don) — every one is an equal bus target, dropping straight into
// its own card from the shared rail.
const groupBuses = layout.columns
  .filter((col) => col.group)
  .map((col) => ({
    leader: col.group.leader,
    targets: col.group.columns.flatMap((c) => [getTeam(c.team).head, ...(c.extras || [])]),
  }))

// ── Geometry (ported from the reference) ─────────────────────────────────────
// Every measurement is relative to the canvas's top-left origin, in the
// canvas's own natural (unscaled) pixels. getBoundingClientRect reflects the
// canvas's current pan/zoom transform, so raw offsets come back pre-multiplied
// by the current zoom — dividing by `scale` here converts them back to
// natural units, which is what lets the SVG (itself a scaled child of the
// same transformed canvas) line up with the cards at any zoom level.
function box(el, cRect, scale) {
  const r = el.getBoundingClientRect()
  return {
    x: (r.left - cRect.left) / scale + r.width / scale / 2,
    left: (r.left - cRect.left) / scale,
    top: (r.top - cRect.top) / scale,
    bottom: (r.top - cRect.top) / scale + r.height / scale,
  }
}

// Every card's own outgoing team-pill line is a CSS `border-left` at
// `left: 10px`, which paints inward from the box edge (pixels 10–12) — an SVG
// stroke of the same weight is centered on its coordinate, so it needs +11 to
// land on the same visual pixels as that border's center. Using the same +11
// for an INCOMING bus drop means the line entering a card's top and the line
// leaving via its own pill below sit at the identical x — one continuous
// stroke through the card, rather than a line landing center-top and a
// separate pill-line starting 80-some px to the left of it.
const leftX = (box) => box.left + 11

// A manager → children bus: drop from the manager, a horizontal rail 18px above
// the highest child, then a vertical drop into each child (landing at each
// child's leftX, per above). `spineLeft` starts the manager's own drop from
// its leftX instead of its center, to continue a leader's spine-out pill line.
function busPath(m, kids, opts = {}) {
  const mx = opts.spineLeft ? leftX(m) : m.x
  const railY = Math.min(...kids.map((k) => k.top)) - 18
  let d = `M ${mx} ${m.bottom} V ${railY}`
  const xs = kids.map(leftX).concat(mx)
  d += ` M ${Math.min(...xs)} ${railY} H ${Math.max(...xs)}`
  kids.forEach((k) => {
    d += ` M ${leftX(k)} ${railY} V ${k.top}`
  })
  return d
}

// SVG overlay that draws the cross-column buses. Measures registered anchor
// cards against the positioned canvas and recomputes on mount and whenever the
// canvas resizes. The CSS elbow spines (within-team hierarchy) and these paths
// share the same line tokens, so the two layers read as one system.
//
// `scale` is the canvas's current pan/zoom scale (see OrgChart). Panning alone
// never changes anchors' relative offsets, so only zoom needs to trigger a
// recompute — but since natural-unit coordinates are scale-invariant by
// construction (box() divides it back out), this recompute is cheap and safe
// to run on every zoom tick rather than needing a stale-closure workaround.
export default function ConnectorLayer({ canvasRef, anchorsRef, scale }) {
  const { showTitles } = useContext(ChartOptionsContext)
  const [{ width, height, paths, lineColor }, setState] = useState({
    width: 0,
    height: 0,
    paths: [],
    lineColor: '',
  })

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const anchors = anchorsRef.current

    const recompute = () => {
      // Bail until every anchor this layer needs has registered.
      const need = [layout.ceo, ...ceoTargets, ...groupBuses.flatMap((g) => [g.leader, ...g.targets])]
      if (need.some((id) => !anchors.get(id))) return

      const cRect = canvas.getBoundingClientRect()
      const B = (id) => box(anchors.get(id), cRect, scale)
      const ds = []

      // 1. CEO → column heads. Drops from the card's left edge, not center.
      ds.push(busPath(B(layout.ceo), ceoTargets.map(B), { spineLeft: true }))

      // 2. Each group leader → its sub-column heads (and beside-column extras).
      groupBuses.forEach((g) => {
        ds.push(busPath(B(g.leader), g.targets.map(B), { spineLeft: true }))
      })

      // Read from the CSS token here rather than at module scope: main.jsx
      // imports App (and this module, transitively) before index.css, so a
      // module-level read would run before the stylesheet is injected and
      // always come back empty in dev. This effect runs post-mount, after
      // every module's top-level code (including index.css's) has run.
      const lineColor = getComputedStyle(document.documentElement).getPropertyValue('--oc-line').trim()
      setState({ width: canvas.scrollWidth, height: canvas.scrollHeight, paths: ds, lineColor })
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(canvas)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [canvasRef, anchorsRef, showTitles, scale])

  return (
    <svg className="oc-canvas__lines" width={width} height={height} aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" />
      ))}
    </svg>
  )
}
