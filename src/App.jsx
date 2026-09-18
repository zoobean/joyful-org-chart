import { useCallback, useMemo, useRef, useState } from 'react'
import OrgChart from './components/OrgChart.jsx'
import Logo from './components/Logo.jsx'
import Toolbar from './components/Toolbar.jsx'
import PasswordGate from './components/PasswordGate.jsx'
import VersionPicker from './components/VersionPicker.jsx'
import { OrgDataContext } from './data/orgContext.js'
import { createOrgData } from './data/selectors.js'
import { DEFAULT_VERSION_ID, getVersion } from './data/versions.js'

import './App.css'

function Chart({ showVersions }) {
  const [isSavingPdf, setIsSavingPdf] = useState(false)
  const [versionId, setVersionId] = useState(DEFAULT_VERSION_ID)
  const orgChartRef = useRef(null)

  // Build the selected dataset (and its indexes) once per version rather than
  // on every render — build() walks and clones the whole tree.
  const orgData = useMemo(() => createOrgData(getVersion(versionId).build()), [versionId])

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
            {showVersions && <VersionPicker versionId={versionId} onChange={setVersionId} />}
            <Toolbar onSavePdf={handleSavePdf} isSavingPdf={isSavingPdf} />
          </div>
        </header>
        <main className="oc-main">
          {/* Keyed on the version so a switch remounts the chart: the anchor
              map and the fit-to-view pass are both mount-time state, and a
              version can add, drop, or re-parent cards — remounting re-fits
              the new shape and leaves no stale anchors behind. */}
          <OrgChart key={versionId} ref={orgChartRef} />
        </main>
      </div>
    </OrgDataContext.Provider>
  )
}

export default function App() {
  return <PasswordGate>{(mode) => <Chart showVersions={mode === 'versions'} />}</PasswordGate>
}
