import { useState } from 'react'
import './PasswordGate.css'

// Either password unlocks the chart. "Stack" used to add a version picker; with
// one chart left both do the same thing, and both stay valid so nobody who
// knows the old one is locked out.
const PASSWORDS = ['Beans', 'Stack']

const SESSION_KEY = 'oc-unlocked'

// Earlier builds stored the unlocked MODE ('current' or 'versions'), and before
// that '1'. Any of them still reads as unlocked, so a session left open across a
// deploy isn't bounced back to the prompt. New unlocks keep writing 'current'.
const UNLOCKED = 'current'
const STORED_UNLOCKED = ['1', UNLOCKED, 'versions']
const readUnlocked = () => STORED_UNLOCKED.includes(sessionStorage.getItem(SESSION_KEY))

// Blurs `children` behind a password prompt until unlocked. The unlock state
// is saved to sessionStorage (not localStorage) so it clears when the browser
// session ends, per the requirement that this re-lock on a fresh session.
export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(readUnlocked)
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (PASSWORDS.includes(value)) {
      sessionStorage.setItem(SESSION_KEY, UNLOCKED)
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
