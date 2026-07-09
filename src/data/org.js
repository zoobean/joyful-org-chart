// ─────────────────────────────────────────────────────────────────────────
// Joyful Reading Co — org data
//
// This file is the single source of truth for the chart. It is plain data,
// fully separated from rendering. Edit names, titles, structure, and layout
// here; the components derive everything else.
//
// Three separate concerns live below:
//   1. `org`    — the reporting tree (who reports to whom)
//   2. `teams`  — team/function metadata (a name + the id of its head)
//   3. `layout` — the visual column arrangement (left → right)
//
// KEY MODELING DECISION: visual column placement and reporting line are
// SEPARATE. A card can render beside a column but report to someone outside
// it. The chart's proof case is Lindsey Hill: she reports to Lainey Franks
// (see the `org` tree), but her card renders as its own column beside Business
// operations (see `layout` → `extras`). Never collapse these two ideas together.
// ─────────────────────────────────────────────────────────────────────────

/** A person node. `reports` are the people who report to this person. */
const p = (id, name, title, reports = []) => ({ id, name, title, reports })

// ── 1. Reporting tree ──────────────────────────────────────────────────────
// `reports` drives BOTH the within-column hierarchy (elbow spines) and the
// cross-column connector buses. Every person has a stable, unique id.
export const org = p('felix-lloyd', 'Felix Lloyd', 'CEO', [
  p('kelly-hiser', 'Kelly Hiser', 'VP of Product', [
    p('moni-barrette', 'Moni Barrette', 'Collection Development Team Lead', [
      p('amber-mitchell', 'Amber Mitchell', 'Metadata Manager'),
      p('rob-randle', 'Rob Randle', 'Content Manager'),
    ]),
    p('mike-kuzin', 'Mike Kuzin', 'Principal Designer'),
    p('brooke-keene', 'Brooke Keene', 'Beanstack Product Manager'),
    p('elizabeth-ross', 'Elizabeth Ross', 'Product Support Team Manager', [
      p('camille-perez', 'Camille Perez', 'Product Support Specialist'),
      p('jenny-plummer', 'Jenny Plummer', 'Product Support Team Lead', [
        p('simon-desalvo', 'Simon Desalvo', 'Product Support Associate'),
      ]),
    ]),
  ]),

  p('lainey-franks', 'Lainey Franks', 'Chief Business Officer', [
    p('kelly-burke', 'Kelly Burke', 'Sr. Director of Marketing', [
      p('meghan-olivier', 'Meghan Olivier', 'Senior Marketing Manager, Growth'),
      p('lilly-sundell-thomas', 'Lilly Sundell-Thomas', 'Marketing Manager, Client Engagement'),
      p('brittinee-phillips', 'Brittinee Phillips', 'Associate Marketing Manager, Growth'),
      p('paktra-lynch', 'Paktra Lynch', 'Assoc. Marketing Manager, Social & Events'),
      p('sophie-houghton', 'Sophie Houghton', 'Marketing Designer'),
    ]),
    p('akshat-khandelwal', 'Akshat Khandelwal', 'Sr. Director of Business Operations', [
      p('alex-burnsides', 'Alex Burnsides', 'Revenue Enablement & Ops Manager'),
      p('katlin-williams', 'Katlin Williams', 'Hubspot Specialist'),
      p('troy-pender', 'Troy Pender', 'Business Operations Manager'),
    ]),
    // Reports to Lainey, but rendered as its own column beside Business operations (see layout).
    p('lindsey-hill', 'Lindsey Hill', 'Executive Business Partner'),
  ]),

  p('ian-singer', 'Ian Singer', 'GM, Public Libraries & Academic', [
    p('jillian-tweet', 'Jillian Tweet', 'Account Executive'),
    p('joe-barrette', 'Joe Barrette', 'Account Executive'),
    p('cleo-joyce', 'Cleo Joyce', 'Manager of PAL Success', [
      p('heidi-kunkel', 'Heidi Kunkel', 'Library Success Manager'),
      p('kat-gatcomb', 'Kat Gatcomb', 'Library Success Manager'),
    ]),
  ]),

  p('dave-hopp', 'Dave Hopp', 'VP of Sales', [
    p('don-giacomini', 'Don Giacomini', 'Principal Account Executive'),
    p('becca-traxler', 'Becca Traxler', 'Account Executive'),
    p('beth-halaz', 'Beth Halaz', 'Account Executive'),
    p('bryana-snyder', 'Bryana Snyder', 'Account Executive'),
    p('chelsea-mccoy', 'Chelsea McCoy', 'Account Executive'),
    p('jessica-fulton', 'Jessica Fulton', 'Account Executive'),
    p('amanda-taylor', 'Amanda Taylor', 'Associate Account Executive'),
    p('lauren-brami', 'Lauren Brami', 'Business Development Team Lead', [
      p('andrea-mullon', 'Andrea Mullon', 'Business Development Rep'),
      p('steven-dimiceli', 'Steven DiMiceli', 'Business Development Rep'),
      p('francheska-savage', 'Francheska Savage', 'Business Development Rep'),
      p('ciera-baker', 'Ciera Baker', 'Assoc. Business Development Rep'),
    ]),
    p('michael-kideckel', 'Michael Kideckel', 'Business Development Team Lead', [
      p('esmy-clavel', 'Esmy Clavel', 'Business Development Rep'),
      p('akua-peprah', 'Akua Peprah', 'Assoc. Business Development Rep'),
      p('amanda-garner', 'Amanda Garner', 'Assoc. Business Development Rep'),
    ]),
    p('haven-gotham', 'Haven Gotham', 'Business Development Rep'),
  ]),

  p('shaun-conway', 'Shaun Conway', 'VP of Client Success', [
    p('lauren-hantzes', 'Lauren Hantzes', 'School Success Team Lead', [
      p('danysha-ligon', 'Danysha Ligon', 'School Success Manager'),
      p('hugh-burke', 'Hugh Burke', 'School Success Manager'),
    ]),
    p('tammy-mcintyre', 'Tammy McIntyre', 'School Success Team Lead', [
      p('vickie-blankenship', 'Vickie Blankenship', 'School Success Manager'),
      p('alexandra-tolbert', 'Alexandra Tolbert', 'School Success Manager'),
    ]),
    p('emily-peterson', 'Emily Peterson', 'School Success Manager'),
    p('kelly-williams', 'Kelly Williams', 'School Success Manager'),
    p('stella-bromley', 'Stella Bromley', 'School Success Manager'),
  ]),

  p('tyler-ewing', 'Tyler Ewing', 'CTO', [
    p('josh-oiknine', 'Josh Oiknine', 'Director of Eng, Comics Plus'),
    p('mike-berse', 'Mike Berse', 'Dir. of Product Dev, Comics Plus'),
    p('jade-ornelas', 'Jade Ornelas', 'Staff Site Reliability Engineer'),
    p('antonio-chavez', 'Antonio Chavez', 'Staff Engineer'),
    p('vincent-mendiola', 'Vincent Mendiola', 'Senior Developer'),
    p('alejandro-zaizar', 'Alejandro Zaizar', 'Engineer'),
    p('josh-joson', 'Josh Joson', 'Engineer'),
    p('armando-duran', 'Armando Duran', 'Senior React Native Developer'),
    p('rachel-mcgrane', 'Rachel McGrane', 'Front End Design Engineer'),
  ]),
])

// ── 2. Teams / functions ─────────────────────────────────────────────────────
// A team is a name + the id of the person who heads it. The team pill renders
// under the head card. Teams are metadata — deliberately NOT baked into the tree.
export const teams = [
  { id: 'product', name: 'Product', head: 'kelly-hiser' },
  { id: 'business-optimization', name: 'Business optimization', head: 'lainey-franks' },
  { id: 'marketing', name: 'Marketing', head: 'kelly-burke' },
  { id: 'business-operations', name: 'Business operations', head: 'akshat-khandelwal' },
  { id: 'pal', name: 'PAL', head: 'ian-singer' },
  { id: 'school-sales', name: 'School sales', head: 'dave-hopp' },
  { id: 'school-client-success', name: 'School client success', head: 'shaun-conway' },
  { id: 'engineering', name: 'Engineering', head: 'tyler-ewing' },
]

// ── 3. Layout ────────────────────────────────────────────────────────────────
// The visual column arrangement, LEFT → RIGHT. A column renders a team head and
// that head's reports. Placement is separate from reporting:
//   • `group`      — a leader card (Lainey) spanning a row of sub-columns. A
//                    sub-column is either `{ team }` (a team head + its own
//                    pill/reports, e.g. Marketing) or `{ reports }` (a plain
//                    chunk of the group leader's own direct reports, rendered
//                    as an elbow-spine list with no head/pill of its own —
//                    e.g. Dave Hopp's reports split across two columns).
//   • `extras`     — ids of cards rendered as their own column immediately to
//                    the right of a `{ team }` sub-column, for layout reasons,
//                    whose reporting line points elsewhere (Lindsey → reports
//                    to Lainey).
//   • `slim`       — the narrower column width used inside the group.
//   • `showLabel`  — set false to keep a `{ team }` column's head→reports
//                    spine (and its line-drawing pill-row) without the visible
//                    name badge — for sub-columns already named by their
//                    head's own card.
export const layout = {
  ceo: 'felix-lloyd',
  columns: [
    { team: 'product' },
    {
      group: {
        leader: 'lainey-franks',
        leaderTeam: 'business-optimization',
        columns: [
          { team: 'marketing', slim: true },
          { team: 'business-operations', slim: true, extras: ['lindsey-hill'] },
        ],
      },
    },
    { team: 'pal' },
    {
      group: {
        leader: 'dave-hopp',
        leaderTeam: 'school-sales',
        columns: [
          {
            reports: [
              'don-giacomini',
              'becca-traxler',
              'beth-halaz',
              'bryana-snyder',
              'chelsea-mccoy',
              'jessica-fulton',
              'amanda-taylor',
            ],
            slim: true,
          },
          { reports: ['lauren-brami', 'michael-kideckel', 'haven-gotham'], slim: true },
        ],
      },
    },
    { team: 'school-client-success' },
    { team: 'engineering' },
  ],
}
