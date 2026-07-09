import { createContext } from 'react'

// Display options that affect how the chart renders. Provided by App, consumed
// by PersonCard (what to show) and ConnectorLayer (to recompute when card
// heights change).
export const ChartOptionsContext = createContext({ showTitles: true })
