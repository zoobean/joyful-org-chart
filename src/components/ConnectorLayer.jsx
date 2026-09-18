import { useLayoutEffect, useMemo, useState } from 'react'
import { useOrgData } from '../data/orgContext.js'
import './ConnectorLayer.css'

// ── Which nodes each bus connects (derived from the layout) ──────────────────
// Derived per dataset rather than once at module scope: the chart can render
// any of several org versions (see versions.js), and a version may add, drop,
// or re-parent whole columns — so the bus topology has to be rebuilt whenever
// the active layout changes.
function busTopology(layout, getTeam) {
  // The head anchor for a layout column: a team's head, or a group's leader.
  const columnAnchor = (col) => (col.group ? col.group.leader : getTeam(col.team).head)

  return {
    // CEO → every top-level column head/leader.
    ceoTargets: layout.columns.map(columnAnchor),

    // Each group leader → its sub-column heads plus any extras beside them
    // (Lindsey, Don), or every id in a plain `{ reports }` column (Dave Hopp's
    // own direct reports, split across columns with no team head) — all equal
    // bus targets, since a `{ reports }` column is a flat list of peers, not a
    // parent-child chain (see ReportColumn).
    groupBuses: layout.columns
      .filter((col) => col.group)
      .map((col) => ({
        leader: col.group.leader,
        targets: col.group.columns.flatMap((c) =>
          c.reports ? c.reports : [getTeam(c.team).head, ...(c.extras || [])]
        ),
      })),
  }
}

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
function curvedBusPath(m, kids, managerColor) {
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

  // Each kid's approach is drawn in ITS OWN department's color, so a line
  // arriving at a card matches that card. The manager's stem and the rail take
  // the manager's color — for the CEO bus, which fans out across every
  // department, that's the neutral root line.
  const segments = []

  // The manager's own stem down to the rail. When one kid's gutter x exactly
  // matches mx the stem and that kid's drop are collinear: originally one
  // path, split here only so the two can carry different colors. A straight
  // vertical join is seamless — unlike the curve-to-curve join the merge was
  // there to avoid. Otherwise the stem curves into the rail itself.
  segments.push(
    aligned
      ? { d: `M ${mx} ${m.bottom} V ${railY}`, color: managerColor }
      : {
          d: `M ${mx} ${m.bottom} V ${railY - r} Q ${mx} ${railY} ${mx + r} ${railY}`,
          color: managerColor,
        }
  )

  // The rail, BROKEN AT EACH KID'S GUTTER. A stretch runs from one kid's drop
  // to the next kid's, which means it passes over that first kid's column — so
  // it takes that column's color. Drawn as one path instead, the rail is a
  // single color cutting straight across every department it spans, which
  // leaves e.g. a teal line hanging over the green school sales column.
  //
  // The last kid gets no stretch: the rail stops short of its gutter (railEnd),
  // where that kid's own curve peels away.
  const stops = [...kids]
    .sort((a, b) => gx(a) - gx(b))
    // A kid whose gutter differs from the manager's peels off the rail with a
    // curve that starts r px EARLY (see the kid paths below), so the stretch
    // feeding it has to stop there. Running to the kid's gutter instead
    // overshoots by r into the curve — invisible when the whole rail was one
    // color, but now it paints the previous department over the start of the
    // next one's approach.
    .map((k) => ({ x: gx(k), color: k.color, curves: Math.abs(gx(k) - mx) >= 1 }))
  // A manager not aligned with its first kid owns the stretch up to it.
  if (!aligned) stops.unshift({ x: mx + r, color: managerColor, curves: false })

  for (let i = 0; i < stops.length - 1; i++) {
    const next = stops[i + 1]
    const to = next.curves ? next.x - r : next.x
    if (to > stops[i].x) {
      segments.push({ d: `M ${stops[i].x} ${railY} H ${to}`, color: stops[i].color })
    }
  }

  kids.forEach((k) => {
    const x = gx(k)
    // A kid sharing the manager's x (the aligned one, or the rest of a stacked
    // `{ reports }` column) drops straight from the rail with no curve-off-rail
    // hook — that hook is only needed when a kid's x genuinely differs.
    const d =
      Math.abs(x - mx) < 1
        ? `M ${mx} ${railY} V ${k.midY - r} Q ${mx} ${k.midY} ${mx + r} ${k.midY} H ${k.left}`
        : `M ${x - r} ${railY} Q ${x} ${railY} ${x} ${railY + r} V ${k.midY - r} Q ${x} ${k.midY} ${x + r} ${k.midY} H ${k.left}`
    segments.push({ d, color: k.color })
  })

  return segments
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
  const { layout, getTeam } = useOrgData()
  const { ceoTargets, groupBuses } = useMemo(() => busTopology(layout, getTeam), [layout, getTeam])
  const [{ width, height, paths }, setState] = useState({ width: 0, height: 0, paths: [] })

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

      // Read from the CSS token here rather than at module scope: main.jsx
      // imports App (and this module, transitively) before index.css, so a
      // module-level read would run before the stylesheet is injected and
      // always come back empty in dev. This effect runs post-mount, after
      // every module's top-level code (including index.css's) has run.
      const rootLine = getComputedStyle(document.documentElement).getPropertyValue('--oc-line').trim()

      // A card's department color, taken from the same cascade that colors the
      // card itself: the nearest [data-team] ancestor (a team column, or the
      // group a plain report column sits in). The CEO has no department, so he
      // falls back to the neutral line.
      const teamColor = (id) => {
        const scope = anchors.get(id)?.closest('[data-team]')
        const value = scope && getComputedStyle(scope).getPropertyValue('--oc-team-bg').trim()
        return value || rootLine
      }

      const B = (id) => box(anchors.get(id), cRect, liveScale)
      // A group leader's registered anchor is its whole block — card + team
      // pill — so the leader's OWN outgoing spine can start below the pill
      // (continuing its spine-out line). But that same anchor, when used as
      // ANOTHER bus's target, needs just the card's own geometry: the block's
      // extra height (from the pill) would otherwise skew midY well past the
      // card's actual center. Plain cards (no pill wrapper) are unaffected.
      const Bcard = (id) => {
        const el = anchors.get(id)
        return {
          ...box(el.matches('.oc-card') ? el : el.querySelector('.oc-card'), cRect, liveScale),
          color: teamColor(id),
        }
      }
      const ds = []

      // 1. CEO → column heads, with the same curved side-on approach as
      // every other bus (see curvedBusPath above).
      ds.push(...curvedBusPath(B(layout.ceo), ceoTargets.map(Bcard), teamColor(layout.ceo)))

      // 2. Each group leader → its sub-column heads (and beside-column extras).
      // A group's bus BELONGS TO ITS LEADER's department, so the whole thing —
      // stem, rail and every drop — is one color. Letting each drop take its
      // own sub-column instead (as the CEO bus does) broke Lainey's bus into
      // pink over Marketing and amber over Business operations, when the bus
      // is business optimization's own. The CEO has no department, so his rail
      // still borrows whichever column it passes over.
      groupBuses.forEach((g) => {
        const leaderColor = teamColor(g.leader)
        const kids = g.targets.map((id) => ({ ...Bcard(id), color: leaderColor }))
        ds.push(...curvedBusPath(B(g.leader), kids, leaderColor))
      })

      setState({ width: canvas.scrollWidth, height: canvas.scrollHeight, paths: ds })
    }

    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(canvas)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [canvasRef, anchorsRef, scale, layout, ceoTargets, groupBuses])

  return (
    <svg className="oc-canvas__lines" width={width} height={height} aria-hidden="true">
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinecap="butt" />
      ))}
    </svg>
  )
}
