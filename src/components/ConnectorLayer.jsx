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
// (Lindsey, Don), or every id in a plain `{ reports }` column (Dave Hopp's
// own direct reports, split across columns with no team head) — all equal
// bus targets, since a `{ reports }` column is a flat list of peers, not a
// parent-child chain (see ReportColumn).
const groupBuses = layout.columns
  .filter((col) => col.group)
  .map((col) => ({
    leader: col.group.leader,
    targets: col.group.columns.flatMap((c) => (c.reports ? c.reports : [getTeam(c.team).head, ...(c.extras || [])])),
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
    midY: (r.top - cRect.top) / scale + r.height / scale / 2,
  }
}

// Reads the canvas's CURRENTLY RENDERED scale directly off its own computed
// transform, rather than trusting the `scale` prop — the canvas transform now
// eases via a CSS transition (see OrgChart), so a synchronous read straight
// after a scale change can catch it mid-transition, before the prop's target
// value is actually what's painted. Deriving numerator (getBoundingClientRect)
// and denominator (this) from the same live paint avoids a mismatch between
// the two.
function readScale(canvas) {
  const t = getComputedStyle(canvas).transform
  const m = t.match(/matrix\(([^,]+),/)
  return m ? parseFloat(m[1]) : 1
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

// A manager → children bus, with a curved, side-on approach into each child
// (drop beside the card, elbow right into its left edge at mid-height)
// instead of a straight drop into its top — matching the CSS elbow spine's
// own look (see TeamColumn.css), since these targets read as peers beside
// the leader rather than a single head's direct line-of-cards. Used for both
// the CEO bus and every group bus (Lainey's, Dave Hopp's sub-columns).
//
// Every corner here is rounded, including the two that a straight H/V path
// would otherwise leave sharp: the leader's own turn into the rail, and each
// kid's turn off the rail into its drop. The indent CSS (.oc-columns,
// .oc-group-cols) is tuned so the leader's own x (mx) always exactly equals
// the FIRST kid's gutter x — that kid's drop is then just a continuation of
// the leader's own vertical line past the rail, not a separate branch, so it
// skips the rail-branch curve the other kids get.
function curvedBusPath(m, kids) {
  const mx = leftX(m)
  // 10px is the geometric floor: a non-aligned kid's own rail-branch curve
  // (radius 7, landing at railY+7) needs to end before the kid's own top, so
  // this must exceed 7. Kept as close to that floor as possible — anything
  // bigger and this margin, plus the CSS margins that set the manager's
  // distance from the rail (.oc-ceo-row, .oc-leader-wrap), stop lining up as
  // one consistent gap everywhere.
  const railY = Math.min(...kids.map((k) => k.top)) - 10
  const gx = (k) => k.left - 10
  const maxX = Math.max(...kids.map(gx), mx)
  const r = 7 // corner radius, matching the existing card-entry curve
  const aligned = kids.find((k) => Math.abs(gx(k) - mx) < 1)

  // The manager's own drop either curves into the rail (no aligned kid to
  // hand off to) or, when one kid's gx exactly matches mx, continues
  // straight through as ONE path into that kid's own entry curve. Bending
  // it into the rail regardless (as an earlier version did) drew two
  // separate, slightly offset curves through the same corner — the rail's
  // own turn ends at mx+r, but the aligned kid's line started fresh at mx —
  // leaving a visible notch where they almost, but didn't quite, meet.
  let d = aligned
    ? `M ${mx} ${m.bottom} V ${aligned.midY - r} Q ${mx} ${aligned.midY} ${mx + r} ${aligned.midY} H ${aligned.left}`
    : // The rightmost kid's own curve peels away starting r px before its gx
      // (see the Q below) — if the rail were drawn all the way to maxX, that
      // last stretch would sit past where the curve already diverges,
      // leaving a short straight stub poking out on its own. Stopping the
      // rail there instead lets it end exactly where that kid's curve picks
      // up (unless maxX is mx itself, meaning there's only the one kid, with
      // no curve to hand off to, and the rail needs to reach it exactly).
      `M ${mx} ${m.bottom} V ${railY - r} Q ${mx} ${railY} ${mx + r} ${railY} H ${maxX === mx ? maxX : maxX - r}`

  // The rail for any OTHER kids branches off the manager's straight line at
  // railY — a plain T, no leading curve of its own, since the line above
  // already passes through this exact point.
  if (aligned && kids.length > 1) {
    d += ` M ${mx} ${railY} H ${maxX === mx ? maxX : maxX - r}`
  }

  // Any OTHER kid sharing the same x as mx (e.g. the rest of a stacked
  // `{ reports }` column, all left-aligned with each other and with the
  // manager) is also a plain drop straight from the rail, no curve-off-rail
  // hook — that hook is only needed when a kid's x genuinely differs from
  // the rail's.
  kids.forEach((k) => {
    if (k === aligned) return
    const x = gx(k)
    d +=
      Math.abs(x - mx) < 1
        ? ` M ${x} ${railY} V ${k.midY - r} Q ${x} ${k.midY} ${x + r} ${k.midY} H ${k.left}`
        : ` M ${x - r} ${railY} Q ${x} ${railY} ${x} ${railY + r} V ${k.midY - r} Q ${x} ${k.midY} ${x + r} ${k.midY} H ${k.left}`
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
      const liveScale = readScale(canvas)
      const B = (id) => box(anchors.get(id), cRect, liveScale)
      // A group leader's registered anchor is its whole block — card + team
      // pill — so the leader's OWN outgoing spine can start below the pill
      // (continuing its spine-out line). But that same anchor, when used as
      // ANOTHER bus's target, needs just the card's own geometry: the block's
      // extra height (from the pill) would otherwise skew midY well past the
      // card's actual center. Plain cards (no pill wrapper) are unaffected.
      const Bcard = (id) => {
        const el = anchors.get(id)
        return box(el.matches('.oc-card') ? el : el.querySelector('.oc-card'), cRect, liveScale)
      }
      const ds = []

      // 1. CEO → column heads, with the same curved side-on approach as
      // every other bus (see curvedBusPath above).
      ds.push(curvedBusPath(B(layout.ceo), ceoTargets.map(Bcard)))

      // 2. Each group leader → its sub-column heads (and beside-column extras).
      groupBuses.forEach((g) => {
        ds.push(curvedBusPath(B(g.leader), g.targets.map(Bcard)))
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
        <path key={i} d={d} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="butt" />
      ))}
    </svg>
  )
}
