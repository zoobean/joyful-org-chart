import { useCallback, useMemo, useRef, useState } from 'react'
import OrgChart from './components/OrgChart.jsx'
import Logo from './components/Logo.jsx'
import Toolbar from './components/Toolbar.jsx'
import PasswordGate from './components/PasswordGate.jsx'
import { OrgDataContext } from './data/orgContext.js'
import { createOrgData } from './data/selectors.js'
import { buildOrg } from './data/versions.js'

import './App.css'

function Chart() {
  const [isSavingPdf, setIsSavingPdf] = useState(false)
  const orgChartRef = useRef(null)

  // Build the dataset (and its indexes) once rather than on every render —
  // buildOrg() walks and clones the whole tree.
  const orgData = useMemo(() => createOrgData(buildOrg()), [])

  // The pan/zoom canvas ref/state lives inside OrgChart; exportPdf is exposed
  // imperatively so the trigger button can stay here in the header, next to
  // the other page-level controls, instead of moving into the canvas itself.
  const handleSavePdf = useCallback(async () => {
    setIsSavingPdf(true)
    try {
      await orgChartRef.current?.exportPdf()
    } finally {
      setIsSavingPdf(false)
    }
  }, [])

  return (
    <OrgDataContext.Provider value={orgData}>
      <div className="oc-app">
        <header className="oc-header">
          <Logo />
          <div className="oc-header__controls">
            <Toolbar onSavePdf={handleSavePdf} isSavingPdf={isSavingPdf} />
          </div>
        </header>
        <main className="oc-main">
          <OrgChart ref={orgChartRef} />
        </main>
      </div>
    </OrgDataContext.Provider>
  )
}

export default function App() {
  return (
    <PasswordGate>
      <Chart />
    </PasswordGate>
  )
}
