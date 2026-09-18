// Derived, read-only indexes over an org dataset. Pure — no rendering here.
//
// A FACTORY rather than module-level singletons: the chart can render any of
// several org versions (see versions.js), each its own `{ org, teams, layout }`
// triple, so the indexes have to be built per dataset instead of once from the
// base import. Components reach the active set through the org context
// (orgContext.js) rather than importing these directly.
export function createOrgData({ org, teams, layout }) {
  const personById = new Map()
  const managerById = new Map()

  // Flatten the reporting tree into id → person and id → manager indexes.
  ;(function index(node, manager) {
    personById.set(node.id, node)
    if (manager) managerById.set(node.id, manager)
    node.reports.forEach((r) => index(r, node))
  })(org, null)

  const teamById = new Map(teams.map((t) => [t.id, t]))
  const teamByHead = new Map(teams.map((t) => [t.head, t]))

  return {
    org,
    teams,
    layout,
    getPerson: (id) => personById.get(id),
    /** The person this id reports to (their manager), or null for the CEO. */
    getManager: (id) => managerById.get(id) || null,
    teamById,
    teamByHead,
    getTeam: (id) => teamById.get(id),
  }
}
