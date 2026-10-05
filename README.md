<div align="center">

# Git Profile Awaken

**[ SYSTEM NOTIFICATION ] You have been chosen as a Player.**

Your GitHub profile, rendered as the System window from a LitRPG: ranks from E to EX, a job class, titles you earn, achievements, and a year of contributions that rises as a shadow army. A GitHub Action rebuilds it every day.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="demo/hunter-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="demo/hunter-light.svg">
  <img src="demo/hunter-dark.svg" width="100%" alt="Hunter license: rank C, level 14, Holy Knight, title Night Owl">
</picture>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="demo/activity-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="demo/activity-light.svg">
  <img src="demo/activity-dark.svg" width="100%" alt="ARISE: every active day of the last year rises as a shadow knight">
</picture>

</div>

Every number on these images is real and comes from the GitHub API. They are regenerated daily from [billtruong003](https://github.com/billtruong003).

## Quick start

You need a profile repository (the repository named after your username, the one whose README shows on your profile).

1. Add `awaken.json` at its root:

   ```json
   {
     "username": "YOUR_USERNAME",
     "theme": "solo_leveling",
     "activity": "arise",
     "timezone": "Asia/Ho_Chi_Minh"
   }
   ```

2. Add `.github/workflows/awaken.yml`:

   ```yaml
   name: Awaken
   on:
     schedule:
       - cron: "7 17 * * *"   # once a day; pick a time just after your midnight
     workflow_dispatch:
     push:
       branches: [main]
       paths: [awaken.json]
   permissions:
     contents: write
   jobs:
     awaken:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: billtruong003/git-profile-awaken@main
   ```

3. Put these two lines where the widgets should appear in your `README.md`, then run the workflow once from the Actions tab:

   ```md
   <!-- AWAKEN:START -->
   <!-- AWAKEN:END -->
   ```

The Action writes the SVGs to `awaken/`, fills the block with `<picture>` tags that switch between dark and light with the viewer's GitHub theme, and commits both. Change `awaken.json` and it runs again.

A full working profile is in [`examples/profile`](examples/profile).

## Configuration

| Field | Default | What it does |
|---|---|---|
| `username` | repository owner | The player. |
| `theme` | `solo_leveling` | One of the [themes](#themes). |
| `title` | `auto` | The title to equip, by achievement id (`night-owl`, `raider`…). An unearned title falls back to your best one, with a warning in the run log. |
| `activity` | `arise` | `arise` (shadow extraction) or `raid` (dungeon raid). |
| `icons` | `rune` | Skill icons: `rune` (one rune per class) or `brand` (language logos). |
| `motion` | `full` | `full` loops glow, pulse and flicker; `calm` plays each entrance once; `none` draws a still image. Viewers with reduced motion always get the still image. |
| `timezone` | `UTC` | IANA zone used for commit hours, the daily quest and dates. |
| `hours` | `true` | Fetch commit times for the Hunting Hours clock and the hour-based achievements. |
| `widgets` | all | Which widgets to build, in README order. Half-width widgets pair up; runes go four to a row. |
| `outDir` | `awaken` | Where the SVGs go. |
| `readme` | `README.md` | The file whose block gets replaced, or `null` to leave READMEs alone. |

The default token reads public activity. To include private contributions, create a fine-grained token with read-only access, save it as the `AWAKEN_TOKEN` secret, and pass `token: ${{ secrets.AWAKEN_TOKEN }}` to the step.

## Widgets

<table>
<tr><td colspan="2"><img src="demo/status-dark.svg" width="100%" alt="Status window"></td></tr>
<tr><td colspan="2"><img src="demo/achievements-dark.svg" width="100%" alt="Achievements"></td></tr>
<tr><td><img src="demo/quest-dark.svg" alt="Active quest"></td><td><img src="demo/skills-dark.svg" alt="Passive skills"></td></tr>
<tr><td><img src="demo/contribution-dark.svg" alt="Contribution log"></td><td><img src="demo/combat-dark.svg" alt="Combat record"></td></tr>
<tr><td><img src="demo/hours-dark.svg" alt="Hunting hours"></td><td><img src="demo/daily-dark.svg" alt="Daily quest or penalty zone"></td></tr>
</table>

| Id | Size | Shows |
|---|---|---|
| `hunter` | full | Rank, level, class, equipped title, the six stats. |
| `status` | full | Level, EXP and MP, the six stats with progress to the next rank, radar. |
| `achievements` | full | Equipped title and sixteen achievements with three tiers each. |
| `activity` | full | The last year as a game: ARISE or Dungeon Raid. |
| `quest` | half | Your most recently pushed repository as the active quest. |
| `skills` | half | Top languages by code size, with rune or logo icons. |
| `contribution` | half | Year total, daily average, streaks, the last 16 weeks. |
| `combat` | half | PRs merged into other people's repos, PR accuracy, reviews, active days, organizations. |
| `hours` | half | 24-hour clock of your commit times and contributions per weekday. |
| `daily` | half | Today's quest, or the Penalty Zone after a day without contributions. |
| `runes` | rune | One card per stat (six files). |

## Stats and ranks

| Stat | Source | Rank D from | A from | EX from |
|---|---|---|---|---|
| STR | Commits, all years | 50 | 1,000 | 25,000 |
| AGI | Pull requests | 5 | 100 | 2,500 |
| INT | Issues opened | 5 | 100 | 2,000 |
| VIT | Repositories with commits in the last year | 3 | 20 | 150 |
| LUK | Stars on your repositories | 10 | 500 | 100,000 |
| CHA | Followers | 10 | 500 | 100,000 |

Ranks run E, D, C, B, A, S, SS, SSS, EX. The overall rank is the weighted mean of the six (STR counts double, AGI and LUK one and a half). The thresholds live in [`src/application/ranks.ts`](src/application/ranks.ts) and are provisional until there is enough data for a percentile model.

Commits are counted year by year from the contribution calendar, so forks and mirrored history are not counted many times over.

## Activity

**ARISE** (`"activity": "arise"`): a violet wave sweeps the year; every day with a contribution rises as a shadow knight, and days with ten or more become glowing marshals.

**Dungeon Raid** (`"activity": "raid"`): the hunter clears the year week by week. Each day is a monster whose strength comes from that day's count, and your busiest week is the boss, with an HP bar that drains when the hunter reaches it.

<img src="demo/raid-dark.svg" width="100%" alt="Dungeon Raid">

## Achievements

Each achievement has three tiers. Reaching tier I unlocks its title.

| Id | Achievement | Tiers |
|---|---|---|
| `relentless` | Relentless | 100 / 1,000 / 5,000 commits |
| `unbroken` | Unbroken | 7 / 30 / 100 day streak |
| `night-owl` | Night Owl | 20 / 30 / 45 % of commits between 22:00 and 05:00 |
| `early-bird` | Early Bird | 15 / 25 / 40 % of commits between 05:00 and 09:00 |
| `weekend-warrior` | Weekend Warrior | 20 / 30 / 45 % of contributions on weekends |
| `gate-opener` | Gate Opener | 5 / 20 / 50 repositories created this year |
| `raider` | Raider | 1 / 10 / 50 PRs merged into other people's repositories |
| `flawless` | Flawless | 80 / 90 / 100 % of PRs merged (10 PRs minimum) |
| `healer` | Healer | 10 / 50 / 200 reviews |
| `polyglot` | Polyglot | 3 / 5 / 8 languages at 1% or more |
| `star-collector` | Star Collector | 10 / 100 / 1,000 stars |
| `beacon` | Beacon | 10 / 100 / 1,000 followers |
| `guild-hopper` | Guild Hopper | 1 / 3 / 7 organizations |
| `veteran` | Veteran | 1 / 3 / 5 years on GitHub |
| `berserker` | Berserker | 10 / 30 / 60 contributions in one day |
| `diligent` | Diligent | 50 / 150 / 300 active days in a year |

## Themes

Every theme is checked by the test suite against the same contrast rules (body text 7:1, labels 4.5:1, rank letters 3:1), in both dark and light.

<table>
<tr>
<td><img src="demo/themes/solo_leveling.svg" alt="solo_leveling"><br><code>solo_leveling</code></td>
<td><img src="demo/themes/shadow_monarch.svg" alt="shadow_monarch"><br><code>shadow_monarch</code></td>
<td><img src="demo/themes/red_gate.svg" alt="red_gate"><br><code>red_gate</code></td>
</tr>
<tr>
<td><img src="demo/themes/frost_elf.svg" alt="frost_elf"><br><code>frost_elf</code></td>
<td><img src="demo/themes/demon_castle.svg" alt="demon_castle"><br><code>demon_castle</code></td>
<td><img src="demo/themes/hunter_association.svg" alt="hunter_association"><br><code>hunter_association</code></td>
</tr>
</table>

Also: `daylight`, `cyberpunk`, `dracula`, `tokyonight`, `monokai`, `gruvbox`, `nord`, `synthwave`, `matrix`, `hollow_knight`, `genshin_anemo`, `genshin_geo`, `genshin_electro`, `elden_ring`, `nier`, `bloodborne`, `valorant`, `hextech`, `retrowave`, `abyssal`, `infernal`. Previews of all of them are in [`demo/themes`](demo/themes).

## Hosted endpoint

If you would rather not run an Action, the endpoint renders single widgets on request (without commit hours, which take too long to fetch per request):

```md
![Status](https://git-profile-awaken.vercel.app/api?username=YOUR_USERNAME&widget=status&theme=solo_leveling)
```

Parameters: `username`, `widget` (any id above, or `rune-str` … `rune-cha`), `theme`, `mode` (`dark` or `light`), `activity`, `icons`, `motion`, `title`, `timezone`.

To host your own, import the repository into Vercel and set `GITHUB_TOKEN`.

## Development

Node 22 or newer.

```bash
npm install
GITHUB_TOKEN=$(gh auth token) npm run generate -- --username YOUR_USERNAME --no-readme
npm test
```

`npm run dev` serves the previewer at `http://localhost:3000`. `npm run demo` refreshes the images in this README.

The code is split by job: [`infrastructure`](src/infrastructure) talks to GitHub and embeds fonts, [`application`](src/application) holds the game rules, [`presentation`](src/presentation) draws SVG from the design tokens, and [`cli`](src/cli) is what the Action runs.

To add a theme, add six seed colors to [`themes.ts`](src/presentation/theme/themes.ts); the contrast rules are applied for you and the tests check the result.

## Credits

Fonts: [Chakra Petch](https://fonts.google.com/specimen/Chakra+Petch) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/), both under the SIL Open Font License, embedded as subsets. Language logos come from [Simple Icons](https://simpleicons.org) (CC0); the logos are trademarks of their owners. Inspired by the System in *Solo Leveling*; this project is not affiliated with it.

MIT © [BillTheDev](https://github.com/billtruong003)
