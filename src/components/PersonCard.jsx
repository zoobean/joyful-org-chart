import { forwardRef, useContext } from 'react'
import { ChartOptionsContext } from '../ChartOptionsContext.js'
import './PersonCard.css'

// One normalized card style for everyone — no emphasis variants, left-aligned.
// Open positions are named "TBD" in the data; their card gets a dotted border
// instead of solid, to read as an open req rather than a filled seat.
// Forwards its ref so the connector layer can measure anchor cards by id.
const PersonCard = forwardRef(function PersonCard({ person }, ref) {
  const { showTitles } = useContext(ChartOptionsContext)
  const isOpenReq = person.name === 'TBD'
  return (
    <div className={`oc-card${isOpenReq ? ' oc-card--open' : ''}`} ref={ref}>
      <div className="oc-card__name">{person.name}</div>
      {showTitles && <div className="oc-card__title">{person.title}</div>}
    </div>
  )
})

export default PersonCard
