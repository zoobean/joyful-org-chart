import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Group } from '../components/OrgChart.jsx'
import { box, curvedBusPath } from '../components/ConnectorLayer.jsx'
import { OrgDataContext } from '../data/orgContext.js'
import { createOrgData } from '../data/selectors.js'
import { getVersion } from '../data/versions.js'
import { FRAME, GROUPS } from './groups.js'
import '../components/ConnectorLayer.css'
import './export.css'

const PADDING = 12
// Card widths to try, widest first. A wide group wants narrow cards to fit
// the frame; a tall one wants wide cards so titles don't wrap and add height.
// Each graphic gets whichever of these lets it render largest.
const CARD_WIDTHS = [240, 230, 220, 210, 200, 190, 180, 170, 160]
// Small groups are left at their natural size rather than blown up to fill
// the frame, so a card reads the same size from one graphic to the next.
const MAX_SCALE = 1

// One group, drawn the way the chart draws it (a Group: the leader and a bus
// down to the columns, minus the team pill) and then scaled to fit the frame.
// The graphic is Version 1's data unless the group names another version. Once
// the web font has loaded and everything is measured, `window.__exportReady`
// flips to true — that is what the export script waits for before taking its
// picture.
export default function GroupGraphic({ id }) {
  const spec = GROUPS.find((g) => g.id === id)
  if (!spec) throw new Error(`No group graphic "${id}"`)

  const data = useMemo(() => {
    const d = getVersion(spec.version ?? 'v1').build()
    if (!d.teams.some((t) => t.id === spec.team)) {
      d.teams.push({ id: spec.team, name: spec.label, head: spec.leader })
    }
    return createOrgData(d)
  }, [spec])

  const group = useMemo(
    () => ({
      leader: spec.leader,
      leaderTeam: spec.team,
      columns: spec.columns.map((reports) => ({ reports, slim: true })),
    }),
    [spec]
  )

  const stageRef = useRef(null)
  const anchorsRef = useRef(new Map())
  const [layout, setLayout] = useState(null)

  const register = useCallback(
    (anchorId) => (el) => {
      if (el) anchorsRef.current.set(anchorId, el)
      else anchorsRef.current.delete(anchorId)
    },
    []
  )

  useLayoutEffect(() => {
    let cancelled = false
    document.fonts.ready.then(() => {
      const stage = stageRef.current
      if (cancelled || !stage) return
      const anchors = anchorsRef.current

      const fit = () => {
        const width = stage.offsetWidth
        const height = stage.offsetHeight
        const scale = Math.min(
          MAX_SCALE,
          (FRAME.width - PADDING * 2) / width,
          (FRAME.height - PADDING * 2) / height
        )
        return { width, height, scale }
      }
      let best = null
      for (const cardWidth of CARD_WIDTHS) {
        stage.style.setProperty('--gg-card-width', `${cardWidth}px`)
        const f = fit()
        // Widest wins a tie: only a real gain in size moves the choice.
        if (!best || f.scale > best.scale + 0.001) best = { ...f, cardWidth }
      }
      stage.style.setProperty('--gg-card-width', `${best.cardWidth}px`)
      // Measured before any scale is applied, so these are natural pixels.
      const cRect = stage.getBoundingClientRect()
      const card = (anchorId) => {
        const el = anchors.get(anchorId)
        return box(el.matches('.oc-card') ? el : el.querySelector('.oc-card'), cRect, 1)
      }
      const color = getComputedStyle(anchors.get(spec.leader).closest('[data-team]'))
        .getPropertyValue('--oc-team-bg')
        .trim()
      const kids = spec.columns.flat().map((kid) => ({ ...card(kid), color }))
      const paths = curvedBusPath(box(anchors.get(spec.leader), cRect, 1), kids, color)

      setLayout({ paths, width: best.width, height: best.height, scale: best.scale, cardWidth: best.cardWidth })
      // After React has painted the scaled result.
      requestAnimationFrame(() => requestAnimationFrame(() => (window.__exportReady = true)))
    })
    return () => {
      cancelled = true
    }
  }, [spec])

  const scale = layout?.scale ?? 1
  const x = layout ? (FRAME.width - layout.width * scale) / 2 : 0
  const y = layout ? (FRAME.height - layout.height * scale) / 2 : 0

  return (
    <OrgDataContext.Provider value={data}>
      <div className="gg-frame" style={{ width: FRAME.width, height: FRAME.height }}>
        <div
          className="gg-stage"
          ref={stageRef}
          style={{
            '--gg-card-width': layout ? `${layout.cardWidth}px` : undefined,
            transform: `translate(${x}px, ${y}px) scale(${scale})`,
          }}
        >
          <Group group={group} register={register} />
          {layout && (
            <svg className="oc-canvas__lines" width={layout.width} height={layout.height} aria-hidden="true">
              {layout.paths.map((p, i) => (
                <path key={i} d={p.d} stroke={p.color} />
              ))}
            </svg>
          )}
        </div>
      </div>
    </OrgDataContext.Provider>
  )
}
