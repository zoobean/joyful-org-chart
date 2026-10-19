// The presentation graphics: one per group, cut from Version 1 unless a group
// names another `version`.
//
// A graphic is a group's leader with their direct reports laid out in columns,
// the same shape as Dave Hopp's group on the chart. Each column lists the
// leader's direct reports; anyone with reports of their own brings them along
// beneath. The columns are chosen to keep each graphic short and wide, since
// they have to fit a 768x250 frame.
//
// `team` colours the graphic (PALS is not a team in Version 1, so export.css
// gives it a colour of its own). `boss`, when given, puts that person's card
// beside the leader.
//
// Two options for graphics that aren't a department cut to the frame:
//   `flat`  — just the cards named in `columns`, with no one beneath them, each
//             in its own department's colours.
//   `fit: 'content'` — no 768x250 frame: the image is cut to the graphic itself,
//             at the chart's own card size.
// And `center` puts the leader in the middle above the row of reports, with a
// drop into the top of each, rather than at the left.

export const FRAME = { width: 768, height: 250 }

const CS_COLUMNS = [
  ['lauren-hantzes'],
  ['tammy-mcintyre'],
  ['tbd-associate-ssm'],
  ['cleo-joyce'],
  ['elizabeth-ross'],
]

export const GROUPS = [
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
    columns: [['moni-barrette'], ['mike-kuzin', 'jenny-plummer', 'tbd-senior-product-manager']],
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
    // The sales slide uses the nameless Version 2: roles only, no names.
    version: 'v2',
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
    id: 'pals',
    leader: 'jillian-tweet',
    boss: 'lainey-franks',
    team: 'pals',
    columns: [['joe-barrette']],
  },
  {
    id: 'cs',
    leader: 'shaun-conway',
    team: 'school-client-success',
    columns: CS_COLUMNS,
  },
  {
    // The same graphic from the nameless Version 2.
    id: 'cs-nameless',
    version: 'v2',
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
