import { forwardRef } from 'react'
import './PersonCard.css'

// One normalized card style for everyone — no emphasis variants, left-aligned.
// Open positions are named "TBD" in the data; their card gets a dotted border
// instead of solid, to read as an open req rather than a filled seat.
// A person with an empty name shows only their title — a role-only card, which
// is not the same thing as an open req (those are named "TBD").
// An optional `note` ({ text, icon }) shows beneath the title — for an open
// role, when it is to be filled, with a small icon beside the words.
// Little line icons for the note, drawn on a 24-unit grid. Decorative: the
// note's text says everything the icon does.
const NOTE_ICONS = {
  bolt: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  hourglass: (
    <>
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </>
  ),
}

const NoteIcon = ({ name }) => (
  <svg
    className="oc-card__note-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {NOTE_ICONS[name]}
  </svg>
)

// Forwards its ref so the connector layer can measure anchor cards by id.
const PersonCard = forwardRef(function PersonCard({ person }, ref) {
  const isOpenReq = person.name === 'TBD'
  return (
    <div className={`oc-card${isOpenReq ? ' oc-card--open' : ''}`} ref={ref}>
      {person.name && <div className="oc-card__name">{person.name}</div>}
      <div className="oc-card__title">{person.title}</div>
      {person.note && (
        <div className="oc-card__note">
          <NoteIcon name={person.note.icon} />
          <span>{person.note.text}</span>
        </div>
      )}
    </div>
  )
})

export default PersonCard
