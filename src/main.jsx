import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const root = createRoot(document.getElementById('root'))

// `?export=<group>` renders one group's presentation graphic instead of the app
// (see src/export). Dev server only: the condition is a build-time constant, so
// none of that code ships.
const exportId = import.meta.env.DEV ? new URLSearchParams(location.search).get('export') : null

if (exportId) {
  import('./export/GroupGraphic.jsx').then(({ default: GroupGraphic }) => {
    root.render(<GroupGraphic id={exportId} />)
  })
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
