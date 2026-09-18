// ─────────────────────────────────────────────────────────────────────────
// Proposed org versions — "what if we reorganized like this?"
//
// The chart normally renders org.js exactly as written. A version is that
// same data with a short list of edits applied on top, so org.js stays the
// single source of truth and a version only ever states its own DIFFERENCES.
// Nothing here mutates the base data: every build() starts from a deep clone.
//
// Versions are only reachable behind the versions password (see
// PasswordGate) — the default view is, and stays, the current chart.
//
// TO ADD A VERSION: append an entry below with a `name` and a `build()` that
// applies the helpers to a fresh clone. The picker lists whatever is here.
// ─────────────────────────────────────────────────────────────────────────
import { org as baseOrg, teams as baseTeams, layout as baseLayout } from './org.js'

const clonePerson = (n) => ({ ...n, reports: n.reports.map(clonePerson) })

/** A fresh, fully detached copy of the base dataset for a version to edit. */
const cloneBase = () => ({
  org: clonePerson(baseOrg),
  teams: baseTeams.map((t) => ({ ...t })),
  layout: structuredClone(baseLayout),
})

// ── Tree helpers ───────────────────────────────────────────────────────────
const find = (node, id) =>
  node.id === id ? node : node.reports.reduce((hit, r) => hit || find(r, id), null)

const parentOf = (node, id) =>
  node.reports.some((r) => r.id === id)
    ? node
    : node.reports.reduce((hit, r) => hit || parentOf(r, id), null)

/** Lifts a person (and everyone under them) out of the tree, and returns them. */
function detach(d, id) {
  const parent = parentOf(d.org, id)
  if (!parent) throw new Error(`detach: no parent for "${id}"`)
  return parent.reports.splice(parent.reports.findIndex((r) => r.id === id), 1)[0]
}

/** Re-parents a person under a new manager, bringing their own reports along. */
function move(d, id, managerId) {
  const person = detach(d, id)
  const manager = find(d.org, managerId)
  if (!manager) throw new Error(`move: no manager "${managerId}"`)
  manager.reports.push(person)
}

function retitle(d, id, title) {
  const person = find(d.org, id)
  if (!person) throw new Error(`retitle: no person "${id}"`)
  person.title = title
}

/** Drops a person AND their remaining reports. Move anyone who stays first. */
const remove = (d, id) => void detach(d, id)

// ── Layout helpers ─────────────────────────────────────────────────────────
// Reporting line and visual placement are separate concerns (see org.js), so
// a version that re-parents someone usually has to say where they now render.

/** Removes a team and its whole top-level column from the chart. */
function dropTeam(d, teamId) {
  d.teams = d.teams.filter((t) => t.id !== teamId)
  d.layout.columns = d.layout.columns.filter((c) => c.team !== teamId)
}

/**
 * Renders `id` inside a group leader's `{ reports }` column, directly after
 * `afterId`. Without this a newly re-parented card never appears: a group's
 * columns list their cards explicitly.
 */
function renderAfter(d, leaderId, afterId, id) {
  const group = d.layout.columns.find((c) => c.group?.leader === leaderId)?.group
  const col = group?.columns.find((c) => c.reports?.includes(afterId))
  if (!col) throw new Error(`renderAfter: no column holding "${afterId}"`)
  col.reports.splice(col.reports.indexOf(afterId) + 1, 0, id)
}

// ── The versions ───────────────────────────────────────────────────────────
export const versions = [
  {
    id: 'current',
    name: 'Current Org Chart',
    build: cloneBase,
  },
  {
    id: 'v1',
    name: 'Version 1',
    // PAL is dissolved. Its three members move under Sales and Client
    // Success; Ian Singer, who headed it, leaves the chart with the team.
    build() {
      const d = cloneBase()

      // Jillian takes the PAL book as a sales manager under Hopp, with Joe
      // now reporting to her rather than alongside her.
      move(d, 'jillian-tweet', 'dave-hopp')
      retitle(d, 'jillian-tweet', 'National Sales Manager, PALS')
      move(d, 'joe-barrette', 'jillian-tweet')

      // Cleo keeps her title and both Library Success Managers, under Shaun.
      move(d, 'cleo-joyce', 'shaun-conway')

      // Only now is Ian childless and safe to drop without taking anyone with him.
      remove(d, 'ian-singer')
      dropTeam(d, 'pal')

      // Placed with Hopp's other cards that carry reports of their own,
      // rather than appended below the lone IC at the end of that column.
      renderAfter(d, 'dave-hopp', 'michael-kideckel', 'jillian-tweet')
      return d
    },
  },
]

export const DEFAULT_VERSION_ID = 'current'

export const getVersion = (id) => versions.find((v) => v.id === id) || versions[0]
