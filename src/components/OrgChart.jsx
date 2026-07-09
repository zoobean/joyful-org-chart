import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import 'svg2pdf.js' // side-effect import: adds pdf.svg(element, opts) to jsPDF
import PersonCard from './PersonCard.jsx'
import TeamPill from './TeamPill.jsx'
import TeamColumn, { ReportNode } from './TeamColumn.jsx'
import ConnectorLayer from './ConnectorLayer.jsx'
import { layout } from '../data/org.js'
import { getPerson, getTeam } from '../data/selectors.js'
import './OrgChart.css'

const MIN_SCALE = 0.25
const MAX_SCALE = 2.5
const FIT_PADDING = 40
const DOUBLE_CLICK_ZOOM_FACTOR = 1.6

const EXPORT_MARGIN = 40
const EXPORT_LOGO_GAP = 24
const EXPORT_LOGO_HEIGHT = 32
const EXPORT_PAGE_BG = [250, 250, 248] // --oc-bg, as addImage/rect want it: r, g, b
const LINE_RGB = [201, 236, 243] // --oc-line (#c9ecf3), for the native-drawn connector lines

// A card placed beside a column for layout reasons whose reporting line
// points elsewhere (e.g. Lindsey, beside Business operations) — a bare card
// with no pill or reports. It's still a connector anchor (registers via
// `register(id)`); its connector is drawn by the SVG layer's gutter route
// rather than a CSS spine.
function ExtraColumn({ id, slim, register }) {
  return (
    <div className={slim ? 'oc-col oc-col--slim' : 'oc-col'}>
      <PersonCard ref={register(id)} person={getPerson(id)} />
    </div>
  )
}

// A column that's just a chunk of the group leader's own direct reports — no
// team/head/pill of its own (e.g. Dave Hopp's reports split across two
// columns). Every entry here is a PEER (all direct reports of the same
// leader), not a parent-child chain, so each registers as its own connector
// anchor and gets its own curved entry straight from the group's bus — same
// as Kelly Burke/Akshat do in a team-based sub-column. No shared indent: a
// person's OWN reports (Lauren's Andrea et al) still nest normally underneath
// their own card via ReportNode's usual recursion, just not relative to
// their flat-list siblings (Michael, Haven, ...).
function ReportColumn({ ids, slim, register }) {
  return (
    <div className={slim ? 'oc-col oc-col--slim' : 'oc-col'}>
      {ids.map((id) => (
        <ReportNode key={id} person={getPerson(id)} register={register} />
      ))}
    </div>
  )
}

// A group: a leader card (Lainey) that spans a row of sub-columns. The leader's
// pill uses the spine-out variant so its spine continues down to the bus that
// feeds the sub-column heads. The whole block (card + pill) is the connector
// anchor for the leader — the bus drop starts below the pill — so the ref goes
// on the block, not the inner card.
function Group({ group, register }) {
  const leader = getPerson(group.leader)
  const leaderTeam = getTeam(group.leaderTeam)
  return (
    <div className="oc-group">
      <div className="oc-leader-wrap">
        <div className="oc-leader-block" ref={register(group.leader)}>
          <PersonCard person={leader} />
          <TeamPill name={leaderTeam.name} variant="spine-out" />
        </div>
      </div>
      <div className="oc-group-cols">
        {group.columns.map((col, i) =>
          col.reports ? (
            <ReportColumn key={i} ids={col.reports} slim={col.slim} register={register} />
          ) : (
            <Fragment key={col.team}>
              <TeamColumn team={getTeam(col.team)} slim={col.slim} showLabel={col.showLabel} register={register} />
              {(col.extras || []).map((id) => (
                <ExtraColumn key={id} id={id} slim={col.slim} register={register} />
              ))}
            </Fragment>
          )
        )}
      </div>
    </div>
  )
}

const OrgChart = forwardRef(function OrgChart(_props, ref) {
  const ceo = getPerson(layout.ceo)
  const canvasRef = useRef(null)
  const viewportRef = useRef(null)
  const anchorsRef = useRef(new Map())
  const dragRef = useRef(null)
  const [view, setView] = useState({ x: FIT_PADDING, y: FIT_PADDING, scale: 1 })
  // Dragging tracks the pointer 1:1 (no transition — anything else lags
  // behind the cursor), but every other view change (wheel, buttons,
  // double-click, the resize re-fit below) eases smoothly instead of
  // snapping straight to its target.
  const [isPanning, setIsPanning] = useState(false)
  // Print/export force the view to scale 1 and read the result within a
  // couple of animation frames — an eased transition there would get
  // captured mid-animation, at the wrong scale/position. Suppressed
  // separately from isPanning since it brackets an async operation, not a
  // single drag gesture.
  const [isSnapping, setIsSnapping] = useState(false)

  // Returns a ref callback that registers/unregisters an anchor card by id.
  const register = useCallback(
    (id) => (el) => {
      const anchors = anchorsRef.current
      if (el) anchors.set(id, el)
      else anchors.delete(id)
    },
    []
  )

  // Scales (and, if needed, shrinks) the view so the whole chart fits the
  // viewport. scrollWidth/Height are layout properties — unaffected by the
  // canvas's own transform — so this reads the chart's true natural size
  // regardless of the current pan/zoom state.
  const fitToView = useCallback(() => {
    const canvas = canvasRef.current
    const viewport = viewportRef.current
    if (!canvas || !viewport) return
    const naturalW = canvas.scrollWidth
    const naturalH = canvas.scrollHeight
    if (!naturalW || !naturalH) return
    const vw = viewport.clientWidth
    const vh = viewport.clientHeight
    const scale = Math.min(1, (vw - FIT_PADDING * 2) / naturalW, (vh - FIT_PADDING * 2) / naturalH)
    setView({
      scale,
      x: Math.max(FIT_PADDING, (vw - naturalW * scale) / 2),
      y: Math.max(FIT_PADDING, (vh - naturalH * scale) / 2),
    })
  }, [])

  useLayoutEffect(() => {
    fitToView()
  }, [fitToView])

  // Re-fit (and re-center) whenever the viewport itself resizes — e.g. the
  // browser window is resized, or a sidebar toggles — rather than only once
  // on mount. rAF-throttled since resize fires continuously while a window
  // edge is being dragged.
  useEffect(() => {
    let raf = null
    const onResize = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        fitToView()
      })
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [fitToView])

  // Mirrors `view` in a ref so effects that must attach exactly once (print,
  // export) can always read the LATEST view without listing it as a
  // dependency — see the comment on the print effect below for why that
  // matters.
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])

  // Printing forces the canvas's transform to `none` via CSS (see index.css)
  // so the full chart prints at natural size regardless of on-screen pan/zoom.
  // Print preview does trigger a reflow, and if that happens to fire a
  // connector recompute mid-print, ConnectorLayer would divide by the
  // on-screen zoom level while the actual render is pinned at scale 1 — so
  // the view is forced to scale 1 for the duration of printing to keep the
  // two in sync, then restored once the print dialog closes.
  //
  // This effect must attach exactly once: if it re-ran on every view change,
  // calling setView from onBeforePrint would itself retrigger the effect and
  // reset `saved` to null before onAfterPrint could read it.
  useEffect(() => {
    let saved = null
    const onBeforePrint = () => {
      saved = viewRef.current
      setIsSnapping(true)
      setView({ x: 0, y: 0, scale: 1 })
    }
    const onAfterPrint = () => {
      if (saved) setView(saved)
      setIsSnapping(false)
    }
    window.addEventListener('beforeprint', onBeforePrint)
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', onBeforePrint)
      window.removeEventListener('afterprint', onAfterPrint)
    }
  }, [])

  // Draws one connector path's `d` string using jsPDF's own line-drawing API
  // — svg2pdf.js is NOT used for these at all. It rendered some paths fine
  // and unpredictably dropped others (a curved gutter-drop in one export, a
  // straight horizontal rail in another) — different failures on different
  // attempts, neither reproducible in an isolated test SVG, so rather than
  // keep chasing a third-party parser's edge cases, every connector line is
  // drawn directly here. This is safe to do because the grammar is always
  // simple: "M x y" starts a sub-path, then one or more V/H/Q commands chase
  // off it (see ConnectorLayer's busPath and gutter-drop construction) — no
  // curves beyond a single quadratic, elevated to the cubic jsPDF's `lines()`
  // expects via the standard control-point formula (P0 + 2/3·(QP−P0), etc.).
  const drawConnectorPathD = useCallback((pdf, d, offsetX, offsetY) => {
    const subpaths = d.trim().split(/(?=M)/).filter(Boolean)
    subpaths.forEach((sub) => {
      const tokens = sub.match(/[MVHQ]|-?[\d.]+/g)
      let cur = null
      let i = 0
      while (i < tokens.length) {
        const cmd = tokens[i]
        if (cmd === 'M') {
          cur = { x: Number(tokens[i + 1]) + offsetX, y: Number(tokens[i + 2]) + offsetY }
          i += 3
        } else if (cmd === 'V') {
          const y = Number(tokens[i + 1]) + offsetY
          pdf.line(cur.x, cur.y, cur.x, y)
          cur = { x: cur.x, y }
          i += 2
        } else if (cmd === 'H') {
          const x = Number(tokens[i + 1]) + offsetX
          pdf.line(cur.x, cur.y, x, cur.y)
          cur = { x, y: cur.y }
          i += 2
        } else {
          // Q cx cy x y
          const qcx = Number(tokens[i + 1]) + offsetX
          const qcy = Number(tokens[i + 2]) + offsetY
          const qx = Number(tokens[i + 3]) + offsetX
          const qy = Number(tokens[i + 4]) + offsetY
          const c1x = cur.x + (2 / 3) * (qcx - cur.x)
          const c1y = cur.y + (2 / 3) * (qcy - cur.y)
          const c2x = qx + (2 / 3) * (qcx - qx)
          const c2y = qy + (2 / 3) * (qcy - qy)
          pdf.lines(
            [[c1x - cur.x, c1y - cur.y, c2x - cur.x, c2y - cur.y, qx - cur.x, qy - cur.y]],
            cur.x,
            cur.y,
            [1, 1],
            'S',
            false
          )
          cur = { x: qx, y: qy }
          i += 5
        }
      }
    })
  }, [])

  // Builds a one-page PDF, downloaded directly (no print dialog), at natural
  // scale regardless of the current pan/zoom. Cards, pills, and the CSS elbow
  // spines are rasterized (html-to-image) — there's no reasonable way to
  // vectorize arbitrary styled/wrapped HTML text without reimplementing card
  // layout a second time. The cross-column bus lines, though, are drawn as
  // TRUE VECTOR content via drawConnectorPathD above, layered on top of the
  // raster image at the same offset — long, thin strokes over mostly-blank
  // space are exactly where rasterization softness is most visible. The logo
  // is real vector SVG already, drawn via svg2pdf.js (reliable for this one,
  // simple, single-element case).
  const exportPdf = useCallback(async () => {
    const canvas = canvasRef.current
    const linesEl = canvas?.querySelector('.oc-canvas__lines')
    const logoEl = document.querySelector('.oc-logo')
    if (!canvas || !linesEl || !logoEl) return

    const saved = viewRef.current
    setIsSnapping(true)
    setView({ x: 0, y: 0, scale: 1 })
    // Two rAFs: the first fires before the next paint is scheduled, the
    // second after it has happened — so by then the scale-1 layout (and any
    // connector recompute it triggered) has actually painted.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    // Nunito Sans loads from Google Fonts async — without this, a fast click
    // right after page load can rasterize before it's ready, silently
    // falling back to Arial for that export.
    await document.fonts.ready

    const prevLinesDisplay = linesEl.style.display
    linesEl.style.display = 'none' // exclude from the raster; drawn as vector below instead
    const pathDs = [...linesEl.querySelectorAll('path')].map((p) => p.getAttribute('d'))

    try {
      const contentDataUrl = await toPng(canvas, {
        pixelRatio: 2,
        backgroundColor: `rgb(${EXPORT_PAGE_BG.join(',')})`,
      })
      linesEl.style.display = prevLinesDisplay

      const contentW = canvas.scrollWidth
      const contentH = canvas.scrollHeight
      const logoAspect = logoEl.viewBox.baseVal.width / logoEl.viewBox.baseVal.height
      const logoW = EXPORT_LOGO_HEIGHT * logoAspect

      const pageW = EXPORT_MARGIN * 2 + contentW
      const pageH = EXPORT_MARGIN * 2 + EXPORT_LOGO_HEIGHT + EXPORT_LOGO_GAP + contentH
      const contentY = EXPORT_MARGIN + EXPORT_LOGO_HEIGHT + EXPORT_LOGO_GAP

      const pdf = new jsPDF({
        orientation: pageW >= pageH ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pageW, pageH],
        hotfixes: ['px_scaling'],
      })

      pdf.setFillColor(...EXPORT_PAGE_BG)
      pdf.rect(0, 0, pageW, pageH, 'F')

      // jsPDF embeds images uncompressed by default — for this chart (mostly
      // flat color + text) that's tens of MB. 'SLOW' deflate-compresses the
      // image data before embedding, dropping it to ~500KB with no visible
      // quality loss (lossless compression, not a resolution trade-off) —
      // worth the extra CPU time for a one-off export.
      pdf.addImage(contentDataUrl, 'PNG', EXPORT_MARGIN, contentY, contentW, contentH, undefined, 'SLOW')

      pdf.setDrawColor(...LINE_RGB)
      pdf.setLineWidth(2)
      pdf.setLineCap('round')
      pathDs.forEach((d) => drawConnectorPathD(pdf, d, EXPORT_MARGIN, contentY))

      await pdf.svg(logoEl, { x: EXPORT_MARGIN, y: EXPORT_MARGIN, width: logoW, height: EXPORT_LOGO_HEIGHT })

      pdf.save('joyful-reading-co-org-chart.pdf')
    } finally {
      linesEl.style.display = prevLinesDisplay
      setView(saved)
      setIsSnapping(false)
    }
  }, [drawConnectorPathD])

  useImperativeHandle(ref, () => ({ exportPdf }), [exportPdf])

  // Zooms so the point under (cursorX, cursorY) — in viewport-local pixels —
  // stays fixed on screen.
  const zoomAt = useCallback((cursorX, cursorY, factor) => {
    setView((v) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor))
      const ratio = nextScale / v.scale
      return {
        scale: nextScale,
        x: cursorX - (cursorX - v.x) * ratio,
        y: cursorY - (cursorY - v.y) * ratio,
      }
    })
  }, [])

  const zoomByButton = useCallback(
    (factor) => {
      const viewport = viewportRef.current
      if (!viewport) return
      zoomAt(viewport.clientWidth / 2, viewport.clientHeight / 2, factor)
    },
    [zoomAt]
  )

  // Wheel always zooms at the cursor; dragging is the pan gesture (below).
  // Attached natively with { passive: false } — React's onWheel can't
  // reliably preventDefault on every browser/version.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = viewport.getBoundingClientRect()
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.01))
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  // Double-click/double-tap zooms in a fixed step at the click point.
  const handleDoubleClick = useCallback(
    (e) => {
      if (e.target.closest('.oc-zoom-controls')) return
      const viewport = viewportRef.current
      if (!viewport) return
      const rect = viewport.getBoundingClientRect()
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, DOUBLE_CLICK_ZOOM_FACTOR)
    },
    [zoomAt]
  )

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0 || e.target.closest('.oc-zoom-controls')) return
    dragRef.current = { startX: e.clientX, startY: e.clientY }
    setIsPanning(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    drag.startX = e.clientX
    drag.startY = e.clientY
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
  }, [])

  const endDrag = useCallback((e) => {
    dragRef.current = null
    setIsPanning(false)
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }, [])

  return (
    <div
      className="oc-viewport"
      ref={viewportRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onDoubleClick={handleDoubleClick}
      onPointerLeave={endDrag}
    >
      <div
        className="oc-canvas"
        ref={canvasRef}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transition: isPanning || isSnapping ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="oc-content">
          <div className="oc-ceo-row">
            <PersonCard ref={register(layout.ceo)} person={ceo} />
          </div>
          <div className="oc-columns">
            {layout.columns.map((col) =>
              col.group ? (
                <Group key={col.group.leader} group={col.group} register={register} />
              ) : (
                <TeamColumn key={col.team} team={getTeam(col.team)} register={register} />
              )
            )}
          </div>
        </div>
        {/* Rendered after the content so anchor refs are attached before this
            layer's layout effect runs; kept visually behind via z-index. */}
        <ConnectorLayer canvasRef={canvasRef} anchorsRef={anchorsRef} scale={view.scale} />
      </div>

      <div className="oc-zoom-controls">
        <button type="button" onClick={() => zoomByButton(0.8)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={fitToView} aria-label="Reset view">
          {Math.round(view.scale * 100)}%
        </button>
        <button type="button" onClick={() => zoomByButton(1.25)} aria-label="Zoom in">
          +
        </button>
      </div>
    </div>
  )
})

export default OrgChart
