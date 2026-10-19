import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import PersonCard from '../components/PersonCard.jsx'
import { ReportNode } from '../components/TeamColumn.jsx'
import { box, curvedBusPath } from '../components/ConnectorLayer.jsx'
import { OrgDataContext, useOrgData } from '../data/orgContext.js'
import { createOrgData } from '../data/selectors.js'
import { getVersion } from '../data/versions.js'
import { FRAME, GROUPS } from './groups.js'
import '../components/ConnectorLayer.css'
import '../components/OrgChart.css'
import './export.css'

const PADDING = 12
// Card widths to try, widest first. A wide group wants narrow cards to fit
// the frame; a tall one wants wide cards so titles don't wrap and add height.
// Each graphic gets whichever of these lets it render largest.
const CARD_WIDTHS = [240, 230, 220, 210, 200, 190, 180, 170, 160]
// Small groups are left at their natural size rather than blown up to fill
// the frame, so a card reads the same size from one graphic to the next.
const MAX_SCALE = 1

// A group laid out the way the chart lays out one (see Group in OrgChart.jsx):
// the leader, then a bus down to columns of their direct reports. There is no
// team pill. If the group has a `boss`, that person's card sits to the leader's
// left, level with it and joined by a line, in the group's colours like the rest.
function ExportGroup({ spec, register }) {
  const { getPerson } = useOrgData()
  return (
    <div className={`oc-group${spec.boss ? ' gg-has-boss' : ''}`} data-team={spec.team}>
      <div className="oc-leader-wrap gg-lead-row">
        {spec.boss && (
          <div className="gg-boss">
            <PersonCard ref={register(spec.boss)} person={getPerson(spec.boss)} />
          </div>
        )}
        <div className="oc-leader-block" ref={register(spec.leader)}>
          <PersonCard person={getPerson(spec.leader)} />
        </div>
      </div>
      <div className="oc-group-cols">
        {spec.columns.map((ids) => (
          <div key={ids[0]} className="oc-col oc-col--slim">
            {ids.map((kid) => (
              <ReportNode key={kid} person={getPerson(kid)} register={register} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// One group, drawn the way the chart draws it and then scaled to fit the frame.
// The graphic is Version 1's data unless the group names another version. Once
// the web font has loaded and everything is measured, `window.__exportReady`
// flips to true — that is what the export script waits for before taking its
// picture.
export default function GroupGraphic({ id }) {
  const spec = GROUPS.find((g) => g.id === id)
  if (!spec) throw new Error(`No group graphic "${id}"`)

  const data = useMemo(() => createOrgData(getVersion(spec.version ?? 'v1').build()), [spec])

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

      // The boss's line runs straight across to the leader's card (they are
      // centred on one another), in the group's colour.
      if (spec.boss) {
        const bossCard = anchors.get(spec.boss)
        const leaderCard = anchors.get(spec.leader).querySelector('.oc-card')
        const from = bossCard.getBoundingClientRect()
        const to = leaderCard.getBoundingClientRect()
        const y = from.top + from.height / 2 - cRect.top
        paths.push({ d: `M ${from.right - cRect.left} ${y} H ${to.left - cRect.left}`, color })
      }

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
          <ExportGroup spec={spec} register={register} />
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
