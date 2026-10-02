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

/**
 * Re-parents a person to the TOP of a manager's reports rather than the
 * bottom. Card order within a column follows tree order, so this states the
 * placement outright instead of leaving it to where the call happens to sit.
 */
function moveToTop(d, id, managerId) {
  const person = detach(d, id)
  const manager = find(d.org, managerId)
  if (!manager) throw new Error(`moveToTop: no manager "${managerId}"`)
  manager.reports.unshift(person)
}

/**
 * Puts a manager's reports in exactly this order. Card order follows the tree,
 * so this states it outright. It refuses to run unless `ids` names precisely
 * the manager's current reports — nobody left out, nobody extra — so a person
 * omitted from a restructure fails loudly here rather than silently vanishing
 * from the chart.
 */
function orderReports(d, managerId, ids) {
  const manager = find(d.org, managerId)
  if (!manager) throw new Error(`orderReports: no manager "${managerId}"`)
  const have = manager.reports.map((r) => r.id)
  const missing = have.filter((id) => !ids.includes(id))
  const extra = ids.filter((id) => !have.includes(id))
  if (missing.length || extra.length || ids.length !== new Set(ids).size) {
    throw new Error(
      `orderReports("${managerId}"): left out [${missing}] / not a report [${extra}]`
    )
  }
  manager.reports = ids.map((id) => manager.reports.find((r) => r.id === id))
}

/** Swaps two of a manager's reports around — card order follows the tree. */
function swapReports(d, managerId, idA, idB) {
  const manager = find(d.org, managerId)
  if (!manager) throw new Error(`swapReports: no manager "${managerId}"`)
  const i = manager.reports.findIndex((r) => r.id === idA)
  const j = manager.reports.findIndex((r) => r.id === idB)
  if (i === -1 || j === -1) {
    throw new Error(`swapReports: "${idA}" and "${idB}" are not both under "${managerId}"`)
  }
  ;[manager.reports[i], manager.reports[j]] = [manager.reports[j], manager.reports[i]]
}

/**
 * Places `people` under `managerId` in the order given, retitling each — a
 * whole team stated at once rather than as a series of separate edits.
 */
function assignTeam(d, managerId, people) {
  people.forEach(([id, title]) => {
    move(d, id, managerId)
    retitle(d, id, title)
  })
}

/** Changes the name shown on a card. The id, title and reporting line stay. */
function rename(d, id, name) {
  const person = find(d.org, id)
  if (!person) throw new Error(`rename: no person "${id}"`)
  person.name = name
}

/**
 * Swaps one WORD for another inside every title, keeping a leading capital. Whole
 * words only, so replacing "Developer" never touches "Development". Throws if no
 * title contains it, since a swap that matches nothing is almost certainly
 * working from a stale picture of the chart.
 */
function replaceWordInTitles(d, from, to) {
  const re = new RegExp(`\\b${from}\\b`, 'gi')
  const cased = (match) =>
    (match[0] === match[0].toUpperCase() ? to[0].toUpperCase() : to[0].toLowerCase()) + to.slice(1)
  let n = 0
  ;(function walk(node) {
    node.title = node.title.replace(re, (match) => {
      n += 1
      return cased(match)
    })
    node.reports.forEach(walk)
  })(d.org)
  if (!n) throw new Error(`replaceWordInTitles: no title contains "${from}"`)
  return n
}

/**
 * Replaces one title with another wherever it appears — an EXACT match, so
 * "Account Executive" never touches "Principal Account Executive". Throws if
 * nothing carries the title, since a swap that matches no one is almost
 * certainly working from a stale picture of the chart.
 */
function retitleAll(d, from, to) {
  let n = 0
  ;(function walk(node) {
    if (node.title === from) {
      node.title = to
      n += 1
    }
    node.reports.forEach(walk)
  })(d.org)
  if (!n) throw new Error(`retitleAll: nobody has the title "${from}"`)
  return n
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

/**
 * Blanks the NAME of everyone under `managerId`, at any depth, leaving the
 * manager's own name and every title, id and reporting line as they were. The
 * cards become role-only. Walks the tree rather than taking a list of people, so
 * it follows whatever structure the version has built up to this point.
 */
function blankNamesUnder(d, managerId) {
  const manager = find(d.org, managerId)
  if (!manager) throw new Error(`blankNamesUnder: no manager "${managerId}"`)
  ;(function blank(node) {
    node.reports.forEach((r) => {
      r.name = ''
      blank(r)
    })
  })(manager)
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
 * Stops listing `ids` as top-level cards in a group — in its `{ reports }`
 * columns or in the `extras` beside a team sub-column.
 * Needed after re-parenting someone under a card that is itself in that
 * column: they would otherwise render TWICE, once as a listed entry and once
 * nested under their new manager (see ReportColumn and ReportNode).
 */
function unrender(d, leaderId, ids) {
  const group = d.layout.columns.find((c) => c.group?.leader === leaderId)?.group
  if (!group) throw new Error(`unrender: no group for "${leaderId}"`)
  group.columns.forEach((c) => {
    if (c.reports) c.reports = c.reports.filter((id) => !ids.includes(id))
    if (c.extras) c.extras = c.extras.filter((id) => !ids.includes(id))
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
 * Appends a `{ reports }` column to a group. Use this rather than an `extras`
 * slot for anyone who has reports of their own: `extras` renders a bare card
 * and would silently drop them.
 */
function addGroupColumn(d, leaderId, reports) {
  const col = d.layout.columns.find((c) => c.group?.leader === leaderId)
  if (!col) throw new Error(`addGroupColumn: no group for "${leaderId}"`)
  col.group.columns.push({ reports, slim: true })
}

/** Removes whichever `{ reports }` column of a group holds `id`. */
function dropGroupColumn(d, leaderId, id) {
  const col = d.layout.columns.find((c) => c.group?.leader === leaderId)
  if (!col) throw new Error(`dropGroupColumn: no group for "${leaderId}"`)
  col.group.columns = col.group.columns.filter((c) => !c.reports?.includes(id))
}

/**
 * Gives a person a TOP-LEVEL column of their own, reporting straight to the
 * CEO. The CEO's reports are the layout's top-level columns, and a column needs
 * a team head to hang from — so this adds a team for them. `belowExecRow` starts
 * it a row down with the team name as a chip above, for someone who reports to
 * the CEO but is not on the exec team.
 * It goes before
 * `beforeLeaderId`'s group when one is given, and at the far right otherwise.
 * `showLabel: false` keeps the head-to-reports spine without a name badge, for
 * a column already named by its head's own title.
 */
function addTopLevelColumn(d, { teamId, name, headId, beforeLeaderId, belowExecRow = false }) {
  d.teams.push({ id: teamId, name, head: headId })
  const column = { team: teamId, showLabel: false, ...(belowExecRow && { belowExecRow }) }
  if (!beforeLeaderId) {
    d.layout.columns.push(column)
    return
  }
  const i = d.layout.columns.findIndex((c) => c.group?.leader === beforeLeaderId)
  if (i === -1) throw new Error(`addTopLevelColumn: no group for "${beforeLeaderId}"`)
  d.layout.columns.splice(i, 0, column)
}

/** Replaces a group's sub-columns outright with the given lists of cards. */
function setGroupColumns(d, leaderId, columns) {
  const col = d.layout.columns.find((c) => c.group?.leader === leaderId)
  if (!col) throw new Error(`setGroupColumns: no group for "${leaderId}"`)
  col.group.columns = columns.map((reports) => ({ reports, slim: true }))
}

/**
 * Renders `id` at the TOP of a group leader's first `{ reports }` column. A
 * group's card order comes from its layout lists rather than the tree, so this
 * states the placement outright.
 */
function renderFirst(d, leaderId, id) {
  const group = d.layout.columns.find((c) => c.group?.leader === leaderId)?.group
  const col = group?.columns.find((c) => c.reports)
  if (!col) throw new Error(`renderFirst: no { reports } column in "${leaderId}"'s group`)
  col.reports.unshift(id)
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
      move(d, 'jillian-tweet', 'lainey-franks')
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
        title: 'Senior Product Manager, Delivery',
      })
      // Jenny fills the APM seat, so it is hers rather than a TBD. Simon
      // stays in Product Support, moving up to Elizabeth.
      move(d, 'simon-desalvo', 'elizabeth-ross')
      move(d, 'jenny-plummer', 'kelly-hiser')
      retitle(d, 'jenny-plummer', 'Product Operations Lead')
      swapReports(d, 'kelly-hiser', 'jenny-plummer', 'tbd-pm-delivery')

      // Lindsey joins Sales under Hopp himself. She rendered beside Business
      // operations as a card whose reporting line pointed at Lainey, so that
      // placement goes too — otherwise she would draw twice. Reporting to the
      // group leader, she needs her own entry in one of his columns.
      move(d, 'lindsey-hill', 'dave-hopp')
      retitle(d, 'lindsey-hill', 'Principal Account Executive')
      unrender(d, 'lainey-franks', ['lindsey-hill'])

      // ── Sales ────────────────────────────────────────────────────────────
      // The finished shape, stated outright rather than as a series of edits,
      // so these read the way the two columns do on screen. Everyone in Hopp's
      // org is placed explicitly here, which is what lets the column lists at
      // the end be complete — a group renders only the cards it names.
      retitle(d, 'coley-martin', 'Regional Sales Manager')
      retitle(d, 'don-giacomini', 'Regional Sales Manager')

      // Bryana and Don are both being considered for the two seats below — a
      // Regional Sales Manager and an Account Executive — and which of them takes
      // which is not settled, so both cards carry the shared name. The ids stay
      // as they were.
      rename(d, 'don-giacomini', 'Bryana/Don')
      rename(d, 'bryana-snyder', 'Bryana/Don')

      assignTeam(d, 'coley-martin', [
        ['chelsea-mccoy', 'Senior Account Executive'],
        ['bryana-snyder', 'Account Executive'],
        ['jessica-fulton', 'Account Executive'],
      ])
      assignTeam(d, 'don-giacomini', [
        ['becca-traxler', 'Account Executive'],
        ['beth-halaz', 'Account Executive'],
        ['amanda-taylor', 'Associate Account Executive'],
      ])
      assignTeam(d, 'jillian-tweet', [['joe-barrette', 'Account Executive, PALS']])
      assignTeam(d, 'lauren-brami', [
        ['haven-gotham', 'Strategic BDR'],
        ['andrea-mullon', 'BDR'],
        ['esmy-clavel', 'BDR'],
        ['steven-dimiceli', 'BDR'],
      ])
      assignTeam(d, 'michael-kideckel', [
        ['ciera-baker', 'BDR'],
        ['amanda-garner', 'Associate BDR'],
        ['akua-peprah', 'Associate BDR'],
        ['jessica-molloy', 'Associate BDR'],
      ])

      // Jillian reports to Lainey, so she renders in Lainey's group instead —
      // in a column of her own, which carries Joe along beneath her.
      addGroupColumn(d, 'lainey-franks', ['jillian-tweet'])

      setGroupColumns(d, 'dave-hopp', [
        ['coley-martin', 'don-giacomini', 'lindsey-hill'],
        ['lauren-brami', 'michael-kideckel'],
      ])

      // Only now is Ian childless and safe to drop without taking anyone with him.
      remove(d, 'ian-singer')
      dropTeam(d, 'pal')

      retitle(d, 'lilly-sundell-thomas', 'Marketing Manager, Product & Engagement')

      // Brittinee's seat is unfilled. Paktra's is gone with no replacement.
      replacePerson(d, 'brittinee-phillips', {
        id: 'tbd-mm-community-social',
        name: 'TBD',
        title: 'Marketing Manager, Community & Social',
      })
      remove(d, 'paktra-lynch')

      // An unfilled finance seat under Akshat.
      addReport(d, 'akshat-khandelwal', {
        id: 'tbd-financial-controller',
        name: 'TBD',
        title: 'Financial Controller',
      })

      // ── Engineering ──────────────────────────────────────────────────────
      // Stated as its finished shape. Everyone keeps their existing title; the
      // open seats follow the TBD convention. Rachel's role is removed
      // outright. orderReports checks each list is complete, so anyone left
      // out of this outline fails here instead of dropping off the chart.
      remove(d, 'rachel-mcgrane')

      move(d, 'alejandro-zaizar', 'antonio-chavez')
      move(d, 'vincent-mendiola', 'antonio-chavez')

      // Mike has no reports of his own: Armando and Josh J. report to a new,
      // unfilled Senior Engineer, who reports to Tyler. (Vincent also holds
      // the title Senior Engineer; that is a separate, existing person.)
      addReport(d, 'tyler-ewing', { id: 'tbd-senior-developer', name: 'TBD', title: 'Senior Engineer' })
      move(d, 'armando-duran', 'tbd-senior-developer')
      move(d, 'josh-joson', 'tbd-senior-developer')

      addReport(d, 'jade-ornelas', { id: 'tbd-junior-developer', name: 'TBD', title: 'Junior Engineer' })

      orderReports(d, 'tyler-ewing', [
        'antonio-chavez',
        'mike-berse',
        'tbd-senior-developer',
        'jade-ornelas',
        'josh-oiknine',
      ])
      orderReports(d, 'antonio-chavez', ['alejandro-zaizar', 'vincent-mendiola'])
      orderReports(d, 'mike-berse', [])
      orderReports(d, 'tbd-senior-developer', ['armando-duran', 'josh-joson'])
      orderReports(d, 'jade-ornelas', ['tbd-junior-developer'])

      // Client Success splits into two columns like Sales: the school success
      // people, then the two teams that moved in above.
      regroup(d, 'school-client-success', [
        ['lauren-hantzes', 'tammy-mcintyre', 'emily-peterson', 'kelly-williams', 'stella-bromley'],
        ['cleo-joyce', 'elizabeth-ross'],
      ])
      // Developer is Engineer in this version, wherever it appears. This is what
      // reaches the base-data titles (Vincent, Armando), which are not edited
      // directly because the current chart keeps them.
      replaceWordInTitles(d, 'Developer', 'Engineer')

      return d
    },
  },
  {
    id: 'v2',
    name: 'Version 2',
    // Version 1, except School Sales shows roles only: every name under Hopp is
    // removed, with all the titles and the structure left exactly as they are.
    // Jillian and Joe report to Lainey here, as in Version 1, so they are not
    // part of School Sales and keep their names. Built ON Version 1 rather than
    // copied from it, so Version 1's own definition is untouched — but later
    // edits to Version 1 flow through to this one.
    build() {
      const d = versions.find((v) => v.id === 'v1').build()

      blankNamesUnder(d, 'dave-hopp')

      // Plain titles: no seniority or qualifier. Exact-match swaps, applied
      // chart-wide, so Principal Account Executive and the PALS titles stay.
      retitleAll(d, 'Senior Account Executive', 'Account Executive')
      retitleAll(d, 'Associate Account Executive', 'Account Executive')
      retitleAll(d, 'Strategic BDR', 'BDR')
      retitleAll(d, 'Associate BDR', 'BDR')
      return d
    },
  },
]

export const DEFAULT_VERSION_ID = 'current'

export const getVersion = (id) => versions.find((v) => v.id === id) || versions[0]
