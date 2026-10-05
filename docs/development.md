# Developer guide

How the project is put together, how to run it locally, and how to add themes, widgets and achievements without breaking the design rules.

## Requirements

- Node.js 22 or newer
- A GitHub token for local runs. With the GitHub CLI: `gh auth token`.

```bash
git clone https://github.com/billtruong003/git-profile-awaken.git
cd git-profile-awaken
npm install
cp .env.example .env    # put a token in GITHUB_TOKEN
```

| Command | Does |
|---|---|
| `npm run dev` | Website and API at `http://localhost:3000`, restarting on changes. |
| `npm run generate -- --username NAME --no-readme` | What the Action runs: writes every SVG to `awaken/`. |
| `npm test` | Game rules, contrast rules for every theme, and a render of every widget in every combination. |
| `npm run typecheck` | Strict TypeScript over source, tests and scripts. |
| `npm run demo` | Rebuilds the images in `demo/` used by the README and the website. |
| `npm run vendor:icons` | Re-copies language logos from Simple Icons into `src/presentation/svg/brandIcons.ts`. |

## Layout

```
src/
  domain/types.ts            shared types: RawProfile, Player, AwakenConfig…
  infrastructure/
    githubClient.ts          GraphQL queries, run in parallel
    fonts.ts                 subsets and embeds the two fonts into each SVG
    store.ts                 profile cache: Upstash Redis or memory
    players.ts               memory → store → GitHub, and the nightly refresh
  application/               the game rules, no I/O
    ranks.ts                 thresholds, overall rank, level curve
    classes.ts               language → job class
    activity.ts              calendar → weeks, streaks, best week
    achievements.ts          the sixteen achievements and title choice
    player.ts                RawProfile → Player
  config/config.ts           awaken.json validation and defaults
  presentation/
    theme/                   tokens, contrast helpers, the 27 themes
    svg/                     kit (frame, sigil, gauge, text), icons, document wrapper
    widgets/                 one function per widget, Player → SVG body
    http/router.ts           /api, /api/cron/refresh, static demo files
    web/                     the website: home, docs pages, layout
  cli/                       the Action entry point and README block writer
api/index.ts                 Vercel function, forwards to the router
action.yml                   the composite Action
docs/                        this guide and the user guide (also served at /docs)
test/                        node:test suites
```

The direction of dependencies is one way: `presentation` and `cli` use `application`, which uses `domain`. `application` never fetches anything, so every rule is tested with plain fixtures.

## Data flow

1. **Fetch** (`githubClient.ts`). One profile is about a dozen GraphQL requests. The identity, the last year's calendar, merged pull requests, the active quest and the lifetime commit totals start at once. The repository list is paged (at most three pages, most-starred first) and each page's languages are requested in batches of ten as soon as that page arrives. Typical times: 2–4 s for a few hundred repositories, about 7 s for the largest accounts.
2. **Rules** (`application/`). `buildPlayer` turns the raw numbers into stats, ranks, level, class, achievements, the equipped title and the activity summary.
3. **Draw** (`presentation/widgets`). Each widget is a function `(ctx, player) → { width, height, body, symbols, css }`. `toSvg` wraps it with the type styles, motion keyframes, filters and the icon symbols it used.
4. **Fonts** (`fonts.ts`). Chakra Petch and JetBrains Mono are cut down to the characters the SVG draws and embedded as base64 WOFF2, because GitHub's image proxy cannot load web fonts.

## Design rules the code enforces

The visual language is the **Awaken System** design system. The parts that matter in code:

- **Tokens, not colors.** Widgets only use `ctx.t.*`. A theme is six seed colors; `derive()` in `themes.ts` builds the rest and moves any color that fails its contrast target: ink 7:1 on panels, labels and the system color 4.5:1, frames and rank colors 3:1. `test/render.test.ts` checks every theme in both modes.
- **Rank colors are only for ranks.** They appear on rank letters of at least 20 px bold and on the thin progress lines next to them, never as interface color. The `shadow` token is the violet for activity widgets.
- **Cut, not rounded.** Shapes use `cut()` (45° corners on the top left and bottom right). Nothing is rounded beyond 2 px.
- **Closed type scale.** Use the styles in `TYPE` (`kit.ts`); do not add sizes.
- **Motion has three levels.** Ambient effects (`pulse`, `breathe`, `flicker`, `sweep`) only exist in `full`; `calm` plays entrances once; `none` and reduced motion draw the final frame. Light themes never glow.
- **Real numbers only.** Every value on a widget comes from `Player`. Demo images are made from a real account.

## Adding a theme

Add a line to `THEMES` in `src/presentation/theme/themes.ts`:

```ts
fromSeed('my_theme', 'My Theme',
  seed(bg, panel, ink, muted, system, border),          // dark
  seed(bg, panel, ink, muted, system, border)),         // optional light
```

Run `npm test`; the contrast test tells you if a seed could not be brought up to standard. Then `npm run demo` to add its preview.

## Adding an achievement

Add an entry to `ACHIEVEMENTS` in `src/application/achievements.ts`:

```ts
{ id: 'archivist', name: 'Archivist', title: 'Archivist', icon: 'scroll',
  unit: 'issues closed', goals: [10, 50, 200], measure: (raw) => raw.issues },
```

`measure` returns `null` when the data behind it was not fetched; the badge then shows as unavailable instead of locked. The icon is a key of `ICONS` in `src/presentation/svg/icons.ts`. Add a case to `test/rules.test.ts` and a row to the table in `docs/guide.md`. The widget lays badges out four to a row, so a seventeenth one adds a row; raise the widget height in `achievementsWidget` to match.

## Adding an icon

Icons are single filled paths on a 16 × 16 grid in `ICONS`, drawn with `fill-rule="evenodd"` so cut-outs work and one fill color tints them. Keep shapes solid; they are drawn as small as 12 px.

## Adding a widget

1. Add its id to `WIDGET_IDS` in `src/domain/types.ts`.
2. Write `(ctx, player) => Rendered` in `src/presentation/widgets/`. Start with `frame(ctx, width, height, 'TITLE')`; it returns the drawable box. Width is 840 (full), 420 (half) or 200 (rune); the README writer pairs widgets by width.
3. Register it in the `switch` in `src/presentation/widgets/index.ts`.
4. Run `npm test`. The render test draws it in every theme, mode and motion level and checks that tags balance, that every `<use>` has its symbol, and that no `undefined` or `NaN` leaked into the output.

## The hosted endpoint

`api/index.ts` runs `handleRequest` on Vercel.

| Route | Does |
|---|---|
| `/` | The website. |
| `/docs`, `/docs/development` | These guides, rendered from `docs/`. |
| `/api?username=…&widget=…` | One widget as SVG. |
| `/api/cron/refresh` | Refreshes stored profiles. Needs `Authorization: Bearer $CRON_SECRET`. |
| `/demo/*` | The demo images. |
| `/health`, `/themes` | JSON. |

**Caching.** A profile is looked up in memory (10 minutes), then in the store, and only then fetched from GitHub. A stored profile is served for up to three days; the nightly job replaces it long before that. Responses also carry `CDN-Cache-Control: s-maxage=1800, stale-while-revalidate=86400`, so Vercel's CDN answers most views without running the function.

**The nightly job.** `vercel.json` schedules `/api/cron/refresh` at 17:00 UTC (midnight in UTC+7). It refreshes every player viewed in the last 30 days and not refreshed in the last 20 hours, stalest first, three at a time, until 50 seconds have passed, and reports how many remain. If more players are waiting than one run can handle, call the endpoint again (the `nightly-refresh` workflow in this repository does that in a loop).

### Environment variables

| Variable | Needed | For |
|---|---|---|
| `GITHUB_TOKEN` | yes | Reading GitHub. A classic token with no scopes is enough for public data. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | recommended | Upstash Redis, shared by all function instances. Vercel's Upstash integration sets them. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` work too. Without them the cache lives in each instance's memory and the nightly job has nothing to refresh. |
| `CRON_SECRET` | for the nightly job | Any long random string. Vercel sends it to cron routes. |

### Deploying your own

1. Import the repository into Vercel.
2. Add `GITHUB_TOKEN` and `CRON_SECRET`.
3. In the Vercel dashboard, add the Upstash for Redis integration to the project (the free plan is enough).
4. Redeploy. `/health` reports whether the store is shared.

## The Action

`action.yml` is a composite action: it sets up Node 22, installs this package's runtime dependencies, runs `src/cli/generate.ts` with `tsx`, and commits `outDir` and the README with the `github-actions[bot]` identity. Commits made with the workflow token do not trigger other workflows, so there is no loop.

To release, tag a version (`git tag v2.0.0 && git push --tags`) and move a major tag (`v2`) to it, so users can pin `@v2`.

## Tests

`npm test` runs two suites with `node:test`:

- `test/rules.test.ts`: rank thresholds and edges, the overall rank, the level curve, class matching, streaks, weeks, achievement tiers, title fallback, config validation, legacy API links.
- `test/render.test.ts`: contrast for every theme and mode; every widget for every theme × mode × motion × activity; escaping; the Penalty Zone switch; font embedding size; the README block writer.

CI runs typecheck and tests on every push and pull request.
