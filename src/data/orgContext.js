import { createContext, useContext } from 'react'

// The org dataset the chart is rendering (built in versions.js). Components read
// the tree through this rather than importing org.js directly, so the whole
// dataset is swapped in one place — which is also how the graphics export hands
// the same components its own data.
export const OrgDataContext = createContext(null)

export const useOrgData = () => useContext(OrgDataContext)
