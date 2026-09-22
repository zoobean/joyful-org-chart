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

/**
 * Gives everyone in `ids` whatever title `sourceId` already has — for the
 * common "same title as <person>" change. Reads from the source rather than
 * repeating the string, so editing that title in org.js carries through.
 */
function matchTitle(d, sourceId, ids) {
  const source = find(d.org, sourceId)
  if (!source) throw new Error(`matchTitle: no person "${sourceId}"`)
  ids.forEach((id) => retitle(d, id, source.title))
}

/** Drops a person AND their remaining reports. Move anyone who stays first. */
const remove = (d, id) => void detach(d, id)

/**
 * Swaps a person out for a new card in the same slot, keeping whoever
 * reported to them — a replacement takes over the seat, not just the row.
 */
function replacePerson(d, id, person) {
  const parent = parentOf(d.org, id)
  if (!parent) throw new Error(`replacePerson: no parent for "${id}"`)
  const i = parent.reports.findIndex((r) => r.id === id)
  parent.reports[i] = { ...person, reports: parent.reports[i].reports }
}

/** Adds a brand-new person under a manager — e.g. an unfilled seat. */
function addReport(d, managerId, person) {
  const manager = find(d.org, managerId)
  if (!manager) throw new Error(`addReport: no manager "${managerId}"`)
  manager.reports.push({ ...person, reports: [] })
}

// ── Layout helpers ─────────────────────────────────────────────────────────
// Reporting line and visual placement are separate concerns (see org.js), so
// a version that re-parents someone usually has to say where they now render.

/** Removes a team and its whole top-level column from the chart. */
function dropTeam(d, teamId) {
  d.teams = d.teams.filter((t) => t.id !== teamId)
  d.layout.columns = d.layout.columns.filter((c) => c.team !== teamId)
}

/**
 * Stops listing `ids` as top-level cards in a group's `{ reports }` columns.
 * Needed after re-parenting someone under a card that is itself in that
 * column: they would otherwise render TWICE, once as a listed entry and once
 * nested under their new manager (see ReportColumn and ReportNode).
 */
function unrender(d, leaderId, ids) {
  const group = d.layout.columns.find((c) => c.group?.leader === leaderId)?.group
  if (!group) throw new Error(`unrender: no group for "${leaderId}"`)
  group.columns.forEach((c) => {
    if (c.reports) c.reports = c.reports.filter((id) => !ids.includes(id))
  })
}

/**
 * Turns a plain team column into a GROUP — a leader card spanning a row of
 * sub-columns, the shape Dave Hopp's column already has. Each sub-column is a
 * flat list of the leader's own direct reports; anyone reporting to THEM
 * still nests underneath as usual.
 *
 * Every one of the leader's reports has to appear in exactly one of the
 * lists: a group's columns name their cards explicitly, so anyone left out
 * simply stops rendering.
 */
function regroup(d, teamId, columns) {
  const team = d.teams.find((t) => t.id === teamId)
  const i = d.layout.columns.findIndex((c) => c.team === teamId)
  if (!team || i === -1) throw new Error(`regroup: no team column "${teamId}"`)
  d.layout.columns[i] = {
    group: {
      leader: team.head,
      leaderTeam: teamId,
      columns: columns.map((reports) => ({ reports, slim: true })),
    },
  }
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

      // Product Support moves from Kelly Hiser to Shaun. Moving Elizabeth
      // carries Camille, Jenny and Simon with her — they are her subtree.
      move(d, 'elizabeth-ross', 'shaun-conway')

      // Two unfilled product seats, following the chart's TBD convention.
      // Brooke's is a replacement, so it keeps her place in Kelly's list.
      replacePerson(d, 'brooke-keene', {
        id: 'tbd-pm-delivery',
        name: 'TBD',
        title: 'Product Manager, Delivery',
      })
      addReport(d, 'kelly-hiser', {
        id: 'tbd-apm-quality-support',
        name: 'TBD',
        title: 'Associate Product Manager, Quality and Support',
      })

      // Don and Bryana step up to Coley's level; Haven joins the other two
      // business development team leads.
      matchTitle(d, 'coley-martin', ['don-giacomini', 'bryana-snyder'])
      matchTitle(d, 'lauren-brami', ['haven-gotham'])

      // The AE book splits across the three regional managers. Each mover
      // also stops being a top-level card in Hopp's column, since they now
      // render nested under their new manager there.
      const books = {
        'coley-martin': ['jessica-fulton', 'becca-traxler', 'chelsea-mccoy'],
        'don-giacomini': ['beth-halaz'],
        'bryana-snyder': ['amanda-taylor'],
      }
      Object.entries(books).forEach(([manager, ids]) => {
        ids.forEach((id) => move(d, id, manager))
        unrender(d, 'dave-hopp', ids)
      })

      // Unfilled seats, following this chart's earlier convention for them:
      // the card is named TBD and carries the role as its title.
      addReport(d, 'haven-gotham', { id: 'tbd-bdr-1', name: 'TBD', title: 'Business Development Rep' })
      addReport(d, 'haven-gotham', { id: 'tbd-bdr-2', name: 'TBD', title: 'Business Development Rep' })
      addReport(d, 'coley-martin', { id: 'tbd-ae-1', name: 'TBD', title: 'Account Executive' })
      addReport(d, 'don-giacomini', { id: 'tbd-ae-2', name: 'TBD', title: 'Account Executive' })

      // Only now is Ian childless and safe to drop without taking anyone with him.
      remove(d, 'ian-singer')
      dropTeam(d, 'pal')

      // Client Success splits into two columns like Sales: the school success
      // people, then the two teams that moved in above.
      regroup(d, 'school-client-success', [
        ['lauren-hantzes', 'tammy-mcintyre', 'emily-peterson', 'kelly-williams', 'stella-bromley'],
        ['cleo-joyce', 'elizabeth-ross'],
      ])

      // Jillian renders in the same column as Coley, after him. Joe comes
      // along without being named here — he is nested under her in the tree.
      unrender(d, 'dave-hopp', ['jillian-tweet'])
      renderAfter(d, 'dave-hopp', 'coley-martin', 'jillian-tweet')
      return d
    },
  },
]

export const DEFAULT_VERSION_ID = 'current'

export const getVersion = (id) => versions.find((v) => v.id === id) || versions[0]
