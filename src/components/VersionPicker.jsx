import { versions } from '../data/versions.js'
import './VersionPicker.css'

// Switches the chart between the current org and the proposed re-org
// versions. Only rendered behind the versions password (see PasswordGate).
//
// The visible "Viewing" label is gone, so the control carries its own
// accessible name — without it a screen reader announces only the selected
// version, with nothing saying what the control changes.
export default function VersionPicker({ versionId, onChange }) {
  return (
    <select
      className="oc-version__select"
      aria-label="Org chart version"
      value={versionId}
      onChange={(e) => onChange(e.target.value)}
    >
      {versions.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  )
}
