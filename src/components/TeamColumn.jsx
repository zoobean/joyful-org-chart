import PersonCard from './PersonCard.jsx'
import TeamPill from './TeamPill.jsx'
import { getPerson } from '../data/selectors.js'
import './TeamColumn.css'

// A report and its descendants. The CSS elbow spine (see TeamColumn.css) is
// driven purely by the `.oc-children > .oc-node` structure, so recursion is
// all that's needed here. Report cards are not connector anchors, so they take
// no ref.
function ReportNode({ person }) {
  return (
    <div className="oc-node">
      <PersonCard person={person} />
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
