import PersonCard from './PersonCard.jsx'
import TeamPill from './TeamPill.jsx'
import { getPerson } from '../data/selectors.js'
import './TeamColumn.css'

// A report and its descendants. The CSS elbow spine (see TeamColumn.css) is
// driven purely by the `.oc-children > .oc-node` structure, so recursion is
// all that's needed here. Report cards are connector anchors only when
// explicitly registered — a plain `{ reports }` layout column (see
// ReportColumn in OrgChart.jsx) registers its top-level entries directly
// (each drawn by the SVG bus, not a CSS elbow, since they're flat peers, not
// each other's parent/child), but recursive calls below never pass `register`
// on, since nested reports only ever need the local CSS spine.
export function ReportNode({ person, register }) {
  return (
    <div className="oc-node">
      <PersonCard ref={register?.(person.id)} person={person} />
      {person.reports.length > 0 && (
        <div className="oc-children">
          {person.reports.map((r) => (
            <ReportNode key={r.id} person={r} />
          ))}
        </div>
      )}
    </div>
  )
}

// A single column: a team head, its pill, and the head's reports. The head is
// a connector anchor, so it registers its card element via `register(id)`.
export default function TeamColumn({ team, slim = false, showLabel = true, register = () => () => {} }) {
  const head = getPerson(team.head)
  return (
    <div className={slim ? 'oc-col oc-col--slim' : 'oc-col'}>
      <div className="oc-node">
        <PersonCard ref={register(head.id)} person={head} />
        <TeamPill name={team.name} showLabel={showLabel} />
        <div className="oc-children">
          {head.reports.map((r) => (
            <ReportNode key={r.id} person={r} />
          ))}
        </div>
      </div>
    </div>
  )
}
