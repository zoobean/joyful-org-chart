// The presentation graphics: one per group, cut from Version 1.
//
// A graphic is a group's leader with their direct reports laid out in columns,
// the same shape as Dave Hopp's group on the chart. Each column lists the
// leader's direct reports; anyone with reports of their own brings them along
// beneath. The columns are chosen to keep each graphic short and wide, since
// they have to fit a 768x250 frame.
//
// `team` colours the graphic. A team that Version 1 doesn't have (PALS) is made
// up from `label`, which nothing shows — a graphic has no team pill.

export const FRAME = { width: 768, height: 250 }

export const GROUPS = [
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
    team: 'marketing',
    columns: [
      ['meghan-olivier', 'lilly-sundell-thomas'],
      ['sophie-houghton', 'tbd-marketing-manager-community-events'],
    ],
  },
  {
    id: 'sales',
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
    team: 'pals',
    label: 'PALS',
    columns: [['joe-barrette']],
  },
  {
    id: 'cs',
    leader: 'shaun-conway',
    team: 'school-client-success',
    columns: [
      ['lauren-hantzes'],
      ['tammy-mcintyre'],
      ['kelly-williams', 'stella-bromley'],
      ['tbd-associate-ssm', 'tbd-ssm-february', 'tbd-ssm-2027'],
      ['cleo-joyce'],
      ['elizabeth-ross'],
    ],
  },
  {
    id: 'finance',
    leader: 'akshat-khandelwal',
    team: 'business-operations',
    columns: [
      ['alex-burnsides', 'katlin-williams', 'troy-pender'],
      ['tbd-finance-controller', 'tbd-junior-financial-operations'],
    ],
  },
]
