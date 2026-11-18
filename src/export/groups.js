// The presentation graphics: one per group, cut from the chart — or from its
// nameless copy (roles only) when a group sets `nameless: true`.
//
// A graphic is a group's leader with their direct reports laid out in columns,
// the same shape as Dave Hopp's group on the chart. Each column lists the
// leader's direct reports; anyone with reports of their own brings them along
// beneath. The columns are chosen to keep each graphic short and wide, since
// they have to fit a 768x250 frame.
//
// `team` colours the graphic. `boss`, when given, puts that person's card
// beside the leader.
//
// Two options for graphics that aren't a department cut to the frame:
//   `flat`  — just the cards named in `columns`, with no one beneath them, each
//             in its own department's colours.
//   `fit: 'content'` — no 768x250 frame: the image is cut to the graphic itself,
//             at the chart's own card size.
// `people` changes how particular cards read in this graphic only — a `name`
// and/or `title` per person id — without touching the chart itself.
// And `center` puts the leader in the middle above the row of reports, with a
// drop into the top of each, rather than at the left.
// `frame` ({ width, height }) cuts a graphic to a slot other than FRAME.

export const FRAME = { width: 768, height: 250 }

// The sales graphic's people, shared by the full-width graphic and the tall one.
const SALES_PEOPLE = {
  'coley-martin': { name: 'Coley Martin' },
  'don-giacomini': { name: 'Don Giacomini' },
  'lauren-brami': { name: 'Lauren Brami', title: 'Business Development Team Manager - Buildings' },
  'michael-kideckel': {
    name: 'Michael Kideckel',
    title: 'Business Development Team Manager - Districts',
  },
}

const CS_COLUMNS = [
  ['lauren-hantzes'],
  ['tammy-mcintyre'],
  ['tbd-associate-ssm'],
  ['cleo-joyce'],
  ['camille-perez'],
]

export const GROUPS = [
  {
    // Lainey and the people who report to her, and no one below them. Jillian is
    // not a department head, so her card keeps Lainey's own colours.
    id: 'lainey-direct-reports',
    leader: 'lainey-franks',
    team: 'business-optimization',
    flat: true,
    fit: 'content',
    center: true,
    columns: [['kelly-burke'], ['akshat-khandelwal'], ['jillian-tweet']],
  },
  {
    // Felix and the people who report to him, and no one below them.
    id: 'felix-direct-reports',
    leader: 'felix-lloyd',
    team: 'neutral',
    flat: true,
    fit: 'content',
    center: true,
    columns: [['kelly-hiser'], ['lainey-franks'], ['dave-hopp'], ['shaun-conway'], ['tyler-ewing']],
  },
  {
    id: 'product',
    leader: 'kelly-hiser',
    team: 'product',
    columns: [['moni-barrette'], ['mike-kuzin', 'jenny-plummer', 'elizabeth-ross']],
  },
  {
    id: 'engineering',
    leader: 'tyler-ewing',
    team: 'engineering',
    columns: [
      ['antonio-chavez'],
      ['mike-berse', 'jade-ornelas', 'josh-oiknine'],
      ['tbd-associate-engineer', 'tbd-senior-engineer'],
    ],
  },
  {
    id: 'marketing',
    leader: 'kelly-burke',
    boss: 'lainey-franks',
    team: 'marketing',
    columns: [
      ['meghan-olivier', 'lilly-sundell-thomas'],
      ['sophie-houghton', 'tbd-marketing-manager-community-events'],
    ],
  },
  {
    id: 'sales',
    // The sales slide uses the nameless chart: roles only, no names — except
    // the four team heads, who are named, and the two BDR leads, whose titles say
    // which side they lead.
    nameless: true,
    people: SALES_PEOPLE,
    leader: 'dave-hopp',
    team: 'school-sales',
    columns: [
      ['coley-martin'],
      ['don-giacomini'],
      ['lauren-brami'],
      ['michael-kideckel'],
      ['lindsey-hill', 'tbd-account-executives', 'tbd-business-development-reps'],
    ],
  },
  {
    // The sales graphic for a two-thirds-width slot beside text (494x250): the
    // same people, with the two regional managers' teams stacked in one column so
    // it comes out taller.
    id: 'sales-tall',
    nameless: true,
    people: SALES_PEOPLE,
    leader: 'dave-hopp',
    team: 'school-sales',
    frame: { width: 494, height: 250 },
    columns: [
      ['coley-martin', 'don-giacomini'],
      ['lauren-brami'],
      ['michael-kideckel'],
      ['lindsey-hill', 'tbd-account-executives', 'tbd-business-development-reps'],
    ],
  },
  {
    id: 'pals',
    leader: 'jillian-tweet',
    boss: 'lainey-franks',
    team: 'pals-sales',
    columns: [['joe-barrette']],
  },
  {
    id: 'cs',
    leader: 'shaun-conway',
    team: 'school-client-success',
    columns: CS_COLUMNS,
  },
  {
    // The same graphic from the nameless chart.
    id: 'cs-nameless',
    nameless: true,
    leader: 'shaun-conway',
    team: 'school-client-success',
    columns: CS_COLUMNS,
  },
  {
    id: 'finance',
    leader: 'akshat-khandelwal',
    boss: 'lainey-franks',
    team: 'business-operations',
    columns: [
      ['alex-burnsides', 'katlin-williams', 'troy-pender'],
      ['tbd-finance-controller', 'tbd-junior-financial-operations'],
    ],
  },
]
