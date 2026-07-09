# Joyful Reading Co — Org Chart

A pannable, zoomable company org chart, built with Vite + React. Live at
**[zoobean.github.io/joyful-org-chart](https://zoobean.github.io/joyful-org-chart/)**.

## Features

- Pan/zoom canvas — drag, scroll wheel, double-click/double-tap, or the zoom controls
- One-click PDF export at full resolution, no print dialog
- A toggle to show/hide job titles
- A lightweight session-based password gate (blurs the chart until unlocked; resets when the browser session ends)

## Data model

`src/data/org.js` is the single source of truth, and deliberately keeps three concerns separate:

1. **`org`** — the reporting tree (who reports to whom)
2. **`teams`** — team/function metadata (a name + the id of its head)
3. **`layout`** — the visual column arrangement, left to right

Visual placement and reporting line are independent: a person can be rendered in one column while
reporting to someone elsewhere in the tree (see the `extras` field in `layout`, e.g. Lindsey Hill
renders beside Business Operations but reports to Lainey Franks).

## Development

Requires Node 22 (pinned in `.tool-versions`) and pnpm (pinned in `package.json`'s `packageManager`
field; run via [corepack](https://nodejs.org/api/corepack.html)).

```sh
pnpm install
pnpm dev       # start the dev server
pnpm build     # production build to dist/
pnpm preview   # serve the production build locally
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app and deploys it to
GitHub Pages automatically.
