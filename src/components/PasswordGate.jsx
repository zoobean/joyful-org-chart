import { useState } from 'react'
import './PasswordGate.css'

const PASSWORD = 'Beans'
const SESSION_KEY = 'oc-unlocked'

// Blurs `children` behind a password prompt until unlocked. The unlock state
// is saved to sessionStorage (not localStorage) so it clears when the browser
// session ends, per the requirement that this re-lock on a fresh session.
export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (value === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
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
        {children}
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
