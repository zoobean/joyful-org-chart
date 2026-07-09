// Derived, read-only indexes over the org data. Pure — no rendering here.
// Keeps org.js as plain, editable data while giving components O(1) lookups.
import { org, teams } from './org.js'

const personById = new Map()
const managerById = new Map()

// Flatten the reporting tree into id → person and id → manager indexes.
;(function index(node, manager) {
  personById.set(node.id, node)
  if (manager) managerById.set(node.id, manager)
  node.reports.forEach((r) => index(r, node))
})(org, null)

export const getPerson = (id) => personById.get(id)

/** The person this id reports to (their manager), or null for the CEO. */
export const getManager = (id) => managerById.get(id) || null

export const teamById = new Map(teams.map((t) => [t.id, t]))
export const teamByHead = new Map(teams.map((t) => [t.head, t]))
export const getTeam = (id) => teamById.get(id)
