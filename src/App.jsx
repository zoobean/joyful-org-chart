import { useCallback, useRef, useState } from 'react'
import OrgChart from './components/OrgChart.jsx'
import Logo from './components/Logo.jsx'
import Toolbar from './components/Toolbar.jsx'
import PasswordGate from './components/PasswordGate.jsx'
import './App.css'

export default function App() {
  const [isSavingPdf, setIsSavingPdf] = useState(false)
  const orgChartRef = useRef(null)

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
    <PasswordGate>
      <div className="oc-app">
        <header className="oc-header">
          <Logo />
          <Toolbar onSavePdf={handleSavePdf} isSavingPdf={isSavingPdf} />
        </header>
        <main className="oc-main">
          <OrgChart ref={orgChartRef} />
        </main>
      </div>
    </PasswordGate>
  )
}
