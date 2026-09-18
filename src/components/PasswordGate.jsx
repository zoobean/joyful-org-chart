import { useState } from 'react'
import './PasswordGate.css'

// Two ways in, and the password decides what you get:
//   Beans → the current chart, exactly as it stands. No version controls.
//   Stack → the same chart plus a picker for the proposed re-org versions.
// Anyone with the everyday password sees no hint that the versions exist.
const MODES = {
  Beans: 'current',
  Stack: 'versions',
}

const SESSION_KEY = 'oc-unlocked'

// The stored value is the MODE, so a reload keeps you in the same view. '1' is
// what earlier builds wrote before there were two modes; it reads as 'current'
// so existing sessions stay unlocked rather than being bounced to the prompt.
const readStoredMode = () => {
  const stored = sessionStorage.getItem(SESSION_KEY)
  if (stored === '1') return 'current'
  return Object.values(MODES).includes(stored) ? stored : null
}

// Blurs `children` behind a password prompt until unlocked. The unlock state
// is saved to sessionStorage (not localStorage) so it clears when the browser
// session ends, per the requirement that this re-lock on a fresh session.
//
// `children` is a function of the unlocked mode. While still locked the
// blurred chart behind the prompt renders in 'current' mode — the plain chart,
// with nothing about versions visible until someone actually unlocks it.
export default function PasswordGate({ children }) {
  const [mode, setMode] = useState(readStoredMode)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const unlocked = mode !== null

  const handleSubmit = (e) => {
    e.preventDefault()
    const matched = MODES[value]
    if (matched) {
      sessionStorage.setItem(SESSION_KEY, matched)
      setMode(matched)
    } else {
      setError(true)
      setValue('')
    }
  }

  return (
    <>
      <div
        className={unlocked ? 'oc-gate-content' : 'oc-gate-content oc-gate-content--locked'}
        {...(unlocked ? {} : { inert: '' })}
      >
        {children(mode ?? 'current')}
      </div>
      {!unlocked && (
        <div className="oc-gate-overlay">
          <form className="oc-gate-card" onSubmit={handleSubmit}>
            <div className="oc-gate-title">Password required</div>
            <input
              type="password"
              className="oc-gate-input"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError(false)
              }}
              placeholder="Password"
              autoFocus
            />
            {error && <div className="oc-gate-error">Incorrect password</div>}
            <button type="submit" className="oc-gate-submit">
              Unlock
            </button>
          </form>
        </div>
      )}
    </>
  )
}
