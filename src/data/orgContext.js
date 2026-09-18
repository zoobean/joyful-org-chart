import { createContext, useContext } from 'react'

// The org dataset the chart is currently rendering — the base data, or one of
// the alternate versions (see versions.js). Components read the tree through
// this rather than importing org.js directly, so switching versions swaps the
// whole dataset in one place.
export const OrgDataContext = createContext(null)

export const useOrgData = () => useContext(OrgDataContext)
