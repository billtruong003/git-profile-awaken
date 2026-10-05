# User guide

Git Profile Awaken draws your GitHub activity as the System window from a LitRPG: a rank from E to EX, a level, a job class, titles you earn, sixteen achievements, and your last year of contributions played as a small game. This guide covers setting it up, every option, and what to do when something looks wrong.

## How it works

There are two ways to use it.

**The GitHub Action (recommended).** A workflow in your profile repository runs once a night. It reads your GitHub data, draws every widget as an SVG in both a dark and a light version, saves them in your repository, and rewrites one marked block of your README. Nothing depends on an outside server, the images load instantly, and you get the widgets that need more data (commit hours, achievements based on them).

**The hosted endpoint.** You paste image URLs into your README and a server draws each widget when someone views it. It is quicker to try, but the first view of a new profile waits for a few seconds of GitHub queries, and commit hours are not available.

## Set up the Action

You need your profile repository: the public repository named exactly like your username (for example `octocat/octocat`). Its README is what GitHub shows on your profile page. Create it if you do not have one.

### 1. Add `awaken.json`

At the root of the profile repository:

```json
{
  "username": "YOUR_USERNAME",
  "theme": "solo_leveling",
  "activity": "arise",
  "title": "auto",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

The [configurator](https://git-profile-awaken.vercel.app/#setup) on the website writes this file for you.

### 2. Add the workflow

Create `.github/workflows/awaken.yml`:

```yaml
name: Awaken

on:
  schedule:
    - cron: "10 17 * * *"
  workflow_dispatch:
  push:
    branches: [main]
    paths: [awaken.json]

permissions:
  contents: write

concurrency:
  group: awaken
  cancel-in-progress: true

jobs:
  awaken:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: billtruong003/git-profile-awaken@main
```

The workflow runs every night, whenever you change `awaken.json`, and whenever you start it by hand from the Actions tab.

### 3. Mark where the widgets go

Put these two lines in your `README.md`, where the widgets should appear:

```md
<!-- AWAKEN:START -->
<!-- AWAKEN:END -->
```

Everything between them is replaced on each run, so do not edit inside the block. If the markers are missing, the block is added at the end of the README.

### 4. Run it once

Open the Actions tab of your profile repository, pick **Awaken**, and press **Run workflow**. After about half a minute an `awaken/` folder and the filled README block appear in a new commit.

## Run it at night

GitHub schedules are written in UTC. The nightly run should start a few minutes after midnight in your timezone, so that the daily quest and the streak see a finished day.

| Your timezone | Cron for 00:10 local time |
|---|---|
| UTC−8 (Los Angeles, winter) | `10 8 * * *` |
| UTC−5 (New York, winter) | `10 5 * * *` |
| UTC (London, winter) | `10 0 * * *` |
| UTC+1 (Berlin, winter) | `10 23 * * *` |
| UTC+5:30 (India) | `40 18 * * *` |
| UTC+7 (Vietnam, Thailand) | `10 17 * * *` |
| UTC+8 (Singapore, China) | `10 16 * * *` |
| UTC+9 (Japan, Korea) | `10 15 * * *` |

The configurator works this out from the timezone you pick. GitHub may start scheduled runs a few minutes late when it is busy; that is normal.

Set `timezone` in `awaken.json` to the same zone. It decides which hour each commit counts in, when the daily quest resets, and which day "today" is.

## Configuration reference

| Field | Default | What it does |
|---|---|---|
| `username` | the repository owner | Whose profile to draw. |
| `theme` | `solo_leveling` | One of the [themes](#themes). |
| `title` | `auto` | The title shown under your name, by achievement id. `auto` picks your highest-tier achievement. |
| `activity` | `arise` | `arise` or `raid`. See [Activity](#activity). |
| `icons` | `rune` | Skill icons: `rune` draws one rune per class; `brand` uses language logos where one exists. |
| `motion` | `full` | `full` loops the glow, pulse and flicker; `calm` plays each entrance once and stops; `none` draws still images. |
| `timezone` | `UTC` | An IANA zone such as `Europe/Berlin` or `Asia/Tokyo`. |
| `hours` | `true` | Read your commit times. Needed for Hunting Hours, Night Owl and Early Bird. Turn it off to make runs faster. |
| `widgets` | all | Which widgets to draw, in README order. |
| `outDir` | `awaken` | The folder for the SVGs. |
| `readme` | `README.md` | The file whose block gets replaced. `null` leaves your README alone. |

Mistakes in `awaken.json` stop the run with a message that lists every problem at once, for example `"theme" must be one of: …`.

Viewers who turned on reduced motion in their operating system always see still images, whatever `motion` says.

## Widgets

Full-width widgets get a row each. Half-width widgets pair up two to a row in the order you list them, and the six stat runes go four to a row.

| Id | Width | Shows |
|---|---|---|
| `hunter` | full | Hunter rank, level, class, equipped title, the six stats. |
| `status` | full | Level, EXP and MP bars, the six stats with progress to the next rank, and a radar. |
| `achievements` | full | Your equipped title and all sixteen achievements with their tiers. |
| `activity` | full | Your last year as ARISE or Dungeon Raid. |
| `quest` | half | Your most recently pushed repository as the active quest. |
| `skills` | half | Your top languages by code size. |
| `contribution` | half | The year's total, daily average, current and best streak, and the last 16 weeks. |
| `combat` | half | Pull requests merged into other people's repositories, pull request accuracy, reviews, repositories opened, active days, best day, organizations. |
| `hours` | half | A 24-hour clock of your commit times, and contributions per weekday. |
| `daily` | half | Today's daily quest, or the Penalty Zone after a day without contributions. |
| `runes` | rune | One card per stat. |

## Stats, ranks and level

| Stat | Counts |
|---|---|
| STR | Commits, every year since you joined |
| AGI | Pull requests you opened |
| INT | Issues you opened |
| VIT | Repositories you committed to in the last year |
| LUK | Stars on your repositories |
| CHA | Followers |

Each stat has a rank: E, D, C, B, A, S, SS, SSS, EX. Under each stat a thin bar shows how far you are toward the next rank. Your overall rank is the weighted average of the six (STR counts double, AGI and LUK one and a half times).

Your level comes from EXP, which every kind of contribution adds to: commits, pull requests (more if they were merged into someone else's project), reviews, issues, active repositories, stars and followers. Each level needs a little more EXP than the one before.

## Activity

**ARISE.** A violet wave sweeps across your last 53 weeks. Every day with at least one contribution rises as a shadow knight as the wave passes. Days with ten or more contributions rise as glowing marshals, the elites of your army.

**Dungeon Raid.** Your year is a dungeon. Each day with contributions holds a monster: a slime for 1–3, an imp for 4–9, a demon for 10 or more. A hunter clears the dungeon week by week. Your busiest week is the boss room; when the hunter reaches it, the boss HP bar drains and the room is cleared.

## Achievements and titles

Every achievement has three tiers. Tier I unlocks its title; set `"title"` to the achievement's id to wear it.

| Id | Achievement | Tiers |
|---|---|---|
| `relentless` | Relentless | 100 / 1,000 / 5,000 commits |
| `unbroken` | Unbroken | best streak of 7 / 30 / 100 days |
| `night-owl` | Night Owl | 20 / 30 / 45 % of commits between 22:00 and 05:00 |
| `early-bird` | Early Bird | 15 / 25 / 40 % of commits between 05:00 and 09:00 |
| `weekend-warrior` | Weekend Warrior | 20 / 30 / 45 % of contributions on Saturday and Sunday |
| `gate-opener` | Gate Opener | 5 / 20 / 50 repositories created in the last year |
| `raider` | Raider | 1 / 10 / 50 pull requests merged into other people's repositories |
| `flawless` | Flawless | 80 / 90 / 100 % of your pull requests merged (from 10 pull requests) |
| `healer` | Healer | 10 / 50 / 200 reviews |
| `polyglot` | Polyglot | 3 / 5 / 8 languages making up at least 1% of your code |
| `star-collector` | Star Collector | 10 / 100 / 1,000 stars |
| `beacon` | Beacon | 10 / 100 / 1,000 followers |
| `guild-hopper` | Guild Hopper | member of 1 / 3 / 7 organizations |
| `veteran` | Veteran | 1 / 3 / 5 years on GitHub |
| `berserker` | Berserker | 10 / 30 / 60 contributions in one day |
| `diligent` | Diligent | 50 / 150 / 300 active days in the last year |

If you ask for a title you have not earned yet, the widgets show your best earned title instead and the run log says so.

## The daily quest and the Penalty Zone

The `daily` widget gives you three tasks that reset at midnight in your timezone: make one contribution, push to your active quest repository, and keep at least 14 contributions over the last 14 days. Clear all three and it becomes **Quest Complete**.

A day with no contributions sends you to the **Penalty Zone**: the widget turns red, counts the days you have spent there, and shows how to get out (one contribution).

Today never breaks your streak while it is still going on; the streak only resets once a day ends without a contribution.

## Themes

`solo_leveling` (the default), `shadow_monarch`, `red_gate`, `frost_elf`, `demon_castle`, `hunter_association`, `daylight`, `cyberpunk`, `dracula`, `tokyonight`, `monokai`, `gruvbox`, `nord`, `synthwave`, `matrix`, `hollow_knight`, `genshin_anemo`, `genshin_geo`, `genshin_electro`, `elden_ring`, `nier`, `bloodborne`, `valorant`, `hextech`, `retrowave`, `abyssal`, `infernal`.

Themes change the panels, text, frame and accent colors. Rank colors stay the same in every theme, so an S is always gold. Some themes come with their own light version; the rest use their dark version in both modes.

## Private contributions

The workflow's built-in token can read your public activity. To count private repositories:

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new) with read-only access to the repositories you want counted (Contents and Metadata: read).
2. In your profile repository, add it under Settings → Secrets and variables → Actions as `AWAKEN_TOKEN`.
3. Pass it to the step:

   ```yaml
   - uses: billtruong003/git-profile-awaken@main
     with:
       token: ${{ secrets.AWAKEN_TOKEN }}
   ```

Your private repository names are never drawn on the widgets, but the active quest uses your most recently pushed repository; if that one is private and you do not want its name shown, leave `quest` out of `widgets`.

## Hosted endpoint

Each widget is also available as an image URL:

```md
![Status](https://git-profile-awaken.vercel.app/api?username=YOUR_USERNAME&widget=status&theme=solo_leveling)
```

| Parameter | Values |
|---|---|
| `username` | Required. |
| `widget` | Any widget id, or `rune-str` … `rune-cha`. Old links with `widget=stat&target=STR` and `widget=skill` still work. |
| `theme` | Any theme id. |
| `mode` | `dark` (default) or `light`. |
| `activity`, `icons`, `motion`, `title`, `timezone` | As in `awaken.json`. |

The server keeps every profile it has drawn and refreshes it each night, so after the first view the images load straight away. The very first view of a new profile can take a few seconds; if GitHub shows a broken image the first time, reload the page.

## Troubleshooting

**The workflow fails with "Permission denied" or "403" when pushing.** The workflow needs `permissions: contents: write`. Also check Settings → Actions → General → Workflow permissions in the profile repository.

**The images on my profile did not change after a run.** GitHub caches README images for a while. Open the SVG file in the repository to see the new version; the profile follows within a few minutes to an hour.

**Commits are missing.** GitHub counts a commit for you only when its author email is one of the emails on your account. Add the email you commit with under Settings → Emails. The active quest counts every commit in its repository, so it can show more than your contribution graph.

**My title is not the one I chose.** You have not reached tier I of that achievement yet. The run log names the title it used instead.

**Hunting Hours says commit hours are off.** Set `"hours": true`.

**The run says my `awaken.json` has problems.** The message lists each field and the values it accepts.
