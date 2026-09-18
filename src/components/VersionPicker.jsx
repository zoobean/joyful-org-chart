import { versions } from '../data/versions.js'
import './VersionPicker.css'

// Switches the chart between the current org and the proposed re-org
// versions. Only rendered behind the versions password (see PasswordGate).
export default function VersionPicker({ versionId, onChange }) {
  return (
    <label className="oc-version">
      <span className="oc-version__label">Viewing</span>
      <select
        className="oc-version__select"
        value={versionId}
        onChange={(e) => onChange(e.target.value)}
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </label>
  )
}
