import './TeamPill.css'

// A rounded team-name pill that hangs off the spine on its own elbow stub.
// `variant`:
//   'team'      — pill under a column head; spine continues down into reports.
//   'spine-out' — pill under a group leader (Lainey); spine continues out the
//                 bottom of the block to feed the cross-column bus below.
// `showLabel` — false for columns that need the spine (head → reports) but no
// visible name badge, e.g. Lauren's/Michael's sub-columns, where the head's
// own card already names them and a repeated label pill would be redundant.
export default function TeamPill({ name, variant = 'team', showLabel = true }) {
  const modifier = variant === 'spine-out' ? 'oc-pill-row--spine-out' : 'oc-pill-row--team'
  return (
    <div className={`oc-pill-row ${modifier}`}>
      {showLabel && <span className="oc-pill">{name}</span>}
    </div>
  )
}
