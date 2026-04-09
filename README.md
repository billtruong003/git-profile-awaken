<div align="center">

# ⚔️ Git Profile Awaken

**[SYSTEM NOTIFICATION] You have been chosen as a Player.**

Drawing inspiration from the iconic System interfaces found in LitRPG and progression fantasy literature, this project gamifies your developer journey. Your commits materialize as **STR**, pull requests as **AGI**, and your overall GitHub operational activity is quantitatively ranked on a definitive scale from **E** to **EX**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/BillTheDev/git-profile-awaken&env=GITHUB_TOKEN&envDescription=GitHub%20Personal%20Access%20Token&envLink=https://github.com/settings/tokens)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## ⚡ Quick Start

You can use the public global gateway instantly. Add this to your GitHub profile `README.md` — replace `YOUR_GITHUB_USERNAME` with your actual username:

```md
![RPG Status](https://git-profile-awaken.vercel.app/api?username=YOUR_GITHUB_USERNAME)
```

That's it. One line. Your profile now has an RPG Status Window.

---

## 🎮 The System Arsenal ([Live Demos](https://git-profile-awaken.vercel.app/))

*Note: The following visual data is rendered using System Monarch Authority (`mode=admin`) to demonstrate maximum potential output.*

### Status Window *(Core Widget)*
The complete RPG character sheet — level, rank, all 6 core attributes, radar chart, mana bar, and job class.
*(Theme: `solo_leveling`)*

<p align="center">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=solo_leveling&widget=status" alt="Status Window">
</p>

```md
![Status](https://git-profile-awaken.vercel.app/api?username=YOUR_GITHUB_USERNAME&theme=solo_leveling&widget=status)
```

### Active Quest
Shows your latest repository as an RPG quest with dynamic rank based on repo size.
*(Theme: `cyberpunk`)*

<p align="center">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=cyberpunk&widget=quest" alt="Active Quest">
</p>

```md
![Quest](https://git-profile-awaken.vercel.app/api?username=YOUR_GITHUB_USERNAME&theme=cyberpunk&widget=quest)
```

### Passive Skills
Top 4 programming languages displayed as skill masteries with level indicators.
*(Theme: `tokyonight`)*

<p align="center">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=tokyonight&widget=skill" alt="Passive Skills">
</p>

```md
![Skills](https://git-profile-awaken.vercel.app/api?username=YOUR_GITHUB_USERNAME&theme=tokyonight&widget=skill)
```

### Contribution Analysis
Weekly activity bar chart, streaks, daily average, and contribution grade.
*(Theme: `dracula`)*

<p align="center">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=dracula&widget=contribution" alt="Contribution Analysis">
</p>

```md
![Contributions](https://git-profile-awaken.vercel.app/api?username=YOUR_GITHUB_USERNAME&theme=dracula&widget=contribution)
```

### Individual Stat Runes
Single stat cards for any of the 6 core attributes. Mix and match to build your own layout.

<p align="center">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=matrix&widget=stat&target=STR" width="32%" alt="STR">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=genshin_electro&widget=stat&target=AGI" width="32%" alt="AGI">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=elden_ring&widget=stat&target=INT" width="32%" alt="INT">
</p>
<p align="center">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=valorant&widget=stat&target=VIT" width="32%" alt="VIT">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=hextech&widget=stat&target=LUK" width="32%" alt="LUK">
  <img src="https://git-profile-awaken.vercel.app/api?username=billtruong003&mode=admin&theme=abyssal&widget=stat&target=CHA" width="32%" alt="CHA">
</p>

```md
![STR](https://git-profile-awaken.vercel.app/api?username=YOUR_GITHUB_USERNAME&widget=stat&target=STR)
![AGI](https://git-profile-awaken.vercel.app/api?username=YOUR_GITHUB_USERNAME&widget=stat&target=AGI)
![INT](https://git-profile-awaken.vercel.app/api?username=YOUR_GITHUB_USERNAME&widget=stat&target=INT)
```

---

## 🎲 Core Attributes

| Code | Attribute | Source | What it measures |
|------|-----------|--------|-----------------|
| **STR** | Strength | Total Commits | Raw coding output |
| **AGI** | Agility | Pull Requests | Code review & collaboration speed |
| **INT** | Intelligence | Issues | Problem identification & analysis |
| **VIT** | Vitality | Repos Contributed To | Ecosystem involvement |
| **LUK** | Luck | Total Stars | Community recognition |
| **CHA** | Charisma | Followers | Developer influence |

**Rank Scale:** `E → D → C → B → A → S → SS → SSS → EX`

---

## 🎨 Dimension Themes

Append `&theme=THEME_NAME` to any widget URL. The System currently supports **21 unique dimensions**:

| Original Series / Games | IDE / Editor Aesthetics | Dark Fantasy / Sci-Fi |
|-------------------------|-------------------------|-----------------------|
| `solo_leveling` *(Default)* | `dracula` | `cyberpunk` |
| `genshin_anemo` | `tokyonight` | `matrix` |
| `genshin_geo` | `monokai` | `retrowave` |
| `genshin_electro` | `gruvbox` | `abyssal` |
| `hollow_knight` | `nord` | `infernal` |
| `elden_ring` | `synthwave` | |
| `nier` | | |
| `bloodborne` | | |
| `valorant` | | |
| `hextech` | | |

---

## 🚀 Deploy Private Instance (Self-Hosted)

If you prefer to run your own gateway to ensure maximum uptime and API rate limits, deploy via Vercel:

1. Fork this repository.
2. Generate a GitHub Personal Access Token ([github.com/settings/tokens](https://github.com/settings/tokens)) with `read:user` and `repo` scopes.
3. Import your fork to Vercel.
4. Add the Environment Variable `GITHUB_TOKEN` with your newly created token.
5. Deploy and replace `git-profile-awaken.vercel.app` with your new Vercel domain.

---

## 💻 Local Development

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/BillTheDev/git-profile-awaken.git
cd git-profile-awaken
npm install
cp .env.example .env
npm run dev
```

Navigate to `http://localhost:3000` in your browser to access the System Terminal UI for previewing all widgets instantly.

---

## 📡 API Reference

**Base URL:** `https://git-profile-awaken.vercel.app/api`

### Query Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `username` | ✅ | — | Target GitHub username |
| `theme` | ❌ | `solo_leveling` | Color dimension (see theme list) |
| `widget` | ❌ | `status` | Output format: `status`, `quest`, `skill`, `stat`, `contribution` |
| `target` | ❌ | `STR` | Specific stat code (only used when `widget=stat`) |
| `mode` | ❌ | — | Set `mortal` to bypass admin privileges |
| `refresh` | ❌ | `false` | Set `true` to bypass the 5-minute system cache |

All `/api` responses emit `image/svg+xml` with status `200`. Anomalies are dynamically rendered as styled SVG error alerts.

---

## 🏗️ Architecture

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ (Native `node:http`) |
| Language | TypeScript (Strict Mode) |
| Engine | Pure SVG generation (Zero external UI libraries) |
| Data Source | GitHub GraphQL API + REST Search API |
| Hosting | Vercel Serverless Functions |
| Design Pattern| Clean Architecture / Domain-Driven Design |

---

## 🤝 System Expansion (Contributing)

**Registering a New Theme:**
1. Access `src/presentation/theme/themes.ts`.
2. Append a new dimension to the `THEMES` object utilizing `buildTheme()`.
3. Submit a Pull Request.

**Forging a New Widget:**
1. Construct your SVG builder function inside `src/presentation/svg/widgetBuilders.ts`.
2. Register the routing logic in `src/presentation/http/router.ts`.
3. Append the new identifier to `VALID_WIDGETS`.
4. Submit a Pull Request.

---

## 📄 License

MIT © [BillTheDev](https://www.billthedev.com)

---

<div align="center">

*"I alone level up."* — Sung Jinwoo

**[⬆ Back to Top](#️-git-profile-awaken)**

</div>
