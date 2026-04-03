# gaming-profile — Project Context for Claude

## Working Style

- **Be honest with opinions.** When asked for a preference or recommendation, give a direct, genuine answer — not a diplomatic non-answer.
- **Push back before implementing bad ideas.** If asked to add or change something that seems like a poor UX, visual, or technical decision, say so clearly and explain why before doing it. Do not silently implement something you think is wrong — always confirm first.
- **Discuss before building when uncertain.** For UI/UX decisions especially, a short discussion upfront saves rework.

---

Personal gaming statistics dashboard aggregating RetroAchievements (RA) and Steam data. Static site with no build tool — React, Tailwind, and Lucide are all loaded via CDN. Data is fetched by Node.js pipelines running on GitHub Actions hourly, stored as JSON files committed to the repo, and consumed directly by the browser.

---

## Directory Structure

```
gaming-profile/
├── index.html                      # Hub landing page (vanilla JS, no React)
├── changelog.md                    # Project changelog (Markdown, parsed by changelog app)
├── CLAUDE.md                       # This file
│
├── assets/                         # Static images (avatar, platform icons)
│
├── data/                           # JSON data written by pipelines, read by apps
│   ├── hub/config.json             # Site config: username, motto, platform visibility
│   ├── ra/
│   │   ├── profile.json            # RA user profile, stats, awards, recent achievements
│   │   ├── games.json              # All RA games with per-achievement details
│   │   └── achievements/
│   │       ├── 1.json – 4.json     # Recent achievements chunked by quarter (91 days each)
│   │       └── heatmap.json        # { "YYYY-MM-DD": { count, points } }
│   └── steam/
│       ├── profile.json            # Steam profile, stats, recently played
│       ├── games/
│       │   ├── index.json          # All games, no achievements[] — fast initial load (~200KB)
│       │   ├── {appId}.json        # Full game data + achievements[], lazy-fetched per game
│       │   └── sentinel.json       # Pipeline-only: no-achievement game cache (never loaded by frontend)
│       └── achievements/
│           ├── 1.json – 4.json     # Recent achievements chunked by quarter
│           └── heatmap.json        # { "YYYY-MM-DD": { count } }
│
├── profile/
│   ├── ra/
│   │   ├── index.html
│   │   ├── app.js                  # ~2500 LOC — GameCard, tabs, awards, backlog
│   │   └── utils/
│   │       ├── constants.js        # MEDIA_URL, SITE_URL, TILDE_TAG_COLORS
│   │       ├── helpers.js          # formatTimeAgo, formatDate, getMediaUrl, parseTitle
│   │       └── transform.js        # transformData() — merges profile + games + progress
│   └── steam/
│       ├── index.html
│       ├── app.js                  # ~1800 LOC — SteamGameCard, ProgressTab, ActivityTab
│       └── utils/
│           ├── constants.js        # STEAM_STATUS, PROGRESS_SORTS
│           └── helpers.js          # formatPlaytime, achIconUrl, headerUrl, rarityLabel, etc.
│
├── activity/
│   ├── index.html
│   ├── app.js                      # ~1100 LOC — Heatmap, streak, timeline, lazy loading
│   └── utils/
│       ├── constants.js            # PLATFORM_COLOR, TILDE_TAG_COLORS
│       ├── helpers.js              # fmtDay, fmtTime, parseTitle
│       └── normalizers.js          # normalizeRA(), normalizeSteam() → unified shape
│
├── completions/
│   ├── index.html
│   └── app.js                      # ~600 LOC — grouped by month, mastered/beaten/perfect
│
├── changelog/
│   ├── index.html
│   └── app.js                      # Parses changelog.md and renders collapsible releases
│
├── scripts/
│   ├── ra-pipeline.js              # RA ETL: API → data/ra/ (~600 LOC)
│   └── steam-pipeline.js           # Steam ETL: API → data/steam/ (~800 LOC)
│
└── .github/workflows/
    ├── fetch-ra-data.yml            # Hourly cron + manual dispatch
    └── fetch-steam-data.yml         # Hourly cron (offset :10) + manual dispatch
```

---

## Pages

### Hub (`index.html`)
Vanilla JS (no React). Reads `data/hub/config.json`, `data/ra/profile.json`, `data/steam/profile.json`, and chunk 1 from both platforms. Shows platform cards, recent achievements, summary stats. Has its own shimmer skeleton in `<style>`.

### RA Profile (`profile/ra/`)
Reads `data/ra/profile.json` (via `transform.js`) and `data/ra/games.json`. Key sections: game awards (Mastered/Beaten sorted by type then date desc), tabs for games/backlog/recent achievements, site awards. `transform.js` is the critical data layer — it merges multiple API response shapes into what the UI expects.

### Steam Profile (`profile/steam/`)
Reads `data/steam/profile.json` on mount, then `data/steam/games/index.json` when any game tab opens (~200KB, no achievement arrays). Full achievement data for a specific game is lazy-fetched from `data/steam/games/{appId}.json` only when the user opens the achievement modal (`handleViewDetails`). Three tabs: Recent Games, Completion Progress, Activity. The `SteamGameCard` component is reused across both Recent Games and Completion Progress tabs and uses pre-computed `preview`, `lastUnlockedAt`, and `lastUnlockName` fields from the index — it does not need `achievements[]`. The Activity tab has its own heatmap (Steam-only, blue tones).

### Activity (`activity/`)
Combined RA + Steam activity. Reads both heatmaps and both achievement chunk sets. Key features:
- **Heatmap**: 365-day GitHub-style grid, filterable by platform (RA/Steam/All)
- **Streak panel**: Below heatmap. 14-day circle timeline, current/longest streak, animated flame icons on active days, gold connectors between consecutive active days. Today is never counted as a streak break — the streak holds until the day ends without any achievements.
- **Timeline**: Achievement groups by day → game → individual achievements. Lazy-loads chunks 2–4 via IntersectionObserver (300px rootMargin).

### Completions (`completions/`)
Shows mastered (RA), beaten (RA), and perfect (Steam) games grouped by month.

### Changelog (`changelog/`)
Fetches `../changelog.md`, parses `## date`, `### section`, `- entry` structure. Sections are color-coded: RetroAchievements (gold), Steam (blue), Activity (teal), etc. Inline backtick code rendered as `<code>`.

---

## Data Pipelines

### Shared behavior
- Both pipelines write JSON to `data/{ra,steam}/` and commit to main via GitHub Actions.
- Concurrency group `data-pipeline` prevents overlapping runs.
- `--debug` flag on either pipeline prints API responses without writing files.
- Chunk files split by 91-day windows: chunk 1 = 0–91 days, chunk 2 = 91–182, etc.

### RA Pipeline (`scripts/ra-pipeline.js`)
Env vars: `RA_USERNAME`, `RA_API_KEY`. Uses `@retroachievements/api` package.
- Default (incremental): fetches profile + recent achievements + progress
- `--refresh-games`: re-fetches per-game achievement details
- Game details cached in Firestore to avoid re-fetching unchanged games
- Outputs: `profile.json`, `games.json`, `achievements/1-4.json`, `achievements/heatmap.json`

### Steam Pipeline (`scripts/steam-pipeline.js`)
Env vars: `STEAM_API_KEY`, `STEAM_USER_ID`.
- Default: recently played games only
- `--refresh-unlocked-games`: re-fetches games with any unlocked achievements
- `--refresh-games`: all owned games
- Stores achievement icon hash only (not full URL) to keep file sizes down
- Cache loading reads individual `games/{appId}.json` files; falls back to legacy `games.json` on first migration run
- Outputs: `profile.json`, `games/index.json`, `games/{appId}.json`, `games/sentinel.json`, `achievements/1-4.json`, `achievements/heatmap.json`
- `games/index.json` pre-computes `lastUnlockedAt`, `lastUnlockName`, and `preview` (top 6 achievement icons) per game
- `games/sentinel.json` tracks no-achievement games (pipeline-only, never fetched by frontend)

---

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| UI framework | React 18.2 | Via CDN (`esm.sh`), no build step |
| Styling | Tailwind CSS | Via CDN, arbitrary values used heavily |
| Icons | Lucide React 0.263.1 | Via CDN |
| JS transform | Babel standalone | Transpiles JSX in-browser |
| Node scripts | Node.js 20 | Pipelines only, not frontend |
| CI/CD | GitHub Actions | Hourly data fetch + commit |
| Hosting | GitHub Pages | Static files served as-is |

There is **no bundler, no npm for the frontend, no TypeScript**. All frontend files are plain `.js` (JSX transpiled in-browser by Babel).

---

## Code Conventions

### Styling
- **Tailwind className** for fixed/structural styles
- **Inline `style={{}}`** for dynamic values (colors from data, animations with delays)
- **`<style>` tag with `@keyframes`** for CSS animations injected inside the React return — this is the established pattern for animations (see `activity/app.js`)
- Arbitrary Tailwind values are used extensively: `text-[11px]`, `w-[140px]`, `tracking-[0.07em]`

### Component patterns
- All functional components with hooks (`useState`, `useEffect`, `useMemo`, `useRef`, `useCallback`)
- `useMemo` used aggressively for derived data (heatmapData, sourceAchs, groups, streakInfo, etc.)
- Large `app.js` files contain all components for that page — no separate component files
- Sub-components defined at module level, not inline

### Data flow
- Data fetched on mount with `useEffect` + `fetch()`
- Loading skeletons shown while data is `null`/loading
- Chunk-based lazy loading via `IntersectionObserver` with a sentinel `ref` at the bottom of the list

### RA title parsing
RA game titles use special syntax handled by `parseTitle()`:
- `~Tag~` prefix → tag (Homebrew, Demo, Prototype, Hack)
- `[Subset - Name]` suffix → subset game, extract parent title and subset name

---

## Design System

### Color palette
```
Background:        #171a21   (page bg)
Card bg:           #1b2838   (primary card)
Card bg darker:    #202d39   (secondary card, hover)
Border:            #2a475e   (standard border)
Border dark:       #101214   (inner/inset border)
Text primary:      #c6d4df
Text secondary:    #8f98a0
Text muted:        #546270

RA gold:           #e5b143
Steam blue:        #66c0f4
Cyan accent:       #57cbde
```

### Platform colors
- **RA**: `#e5b143` (gold) — mastered, points, heatmap peak
- **Steam**: `#66c0f4` (blue) — perfect, progress, heatmap peak

### Completion status colors
- Mastered / Perfect: `#e5b143` (gold)
- Beaten: `#8f98a0` (gray)
- In Progress: `#66c0f4` (blue)
- Not started / border: `#323f4c`

### Rarity colors (Steam achievements)
- Ultra Rare (<5%): `#e5b143` (gold)
- Very Rare (<10%): `#c8901a` (dark gold)
- Rare (<25%): `#66c0f4` (blue)
- Uncommon (<50%): `#8f98a0` (gray)
- Common (≥50%): `#546270` (muted)

### Tilde tag colors
- Hack: red tones
- Homebrew: blue tones
- Demo: cyan tones
- Prototype: gray tones

### Typography
- Font: `'Segoe UI', Arial, sans-serif`
- Sizes: 7–15px (very compact, dashboard-style)
- Labels: `uppercase tracking-[0.07em]` or `tracking-[0.1em]` with `font-semibold`
- Border radius: mostly 2–3px (sharp, minimal)

### Section headers
Consistent pattern across all pages:
```jsx
<span className="w-[3px] h-[14px] bg-[#66c0f4] rounded-[1px] shrink-0" />  {/* accent bar */}
<span className="text-[13px] text-white tracking-wide uppercase font-medium">Title</span>
```
RA sections use `#e5b143`, Steam/Activity sections use `#66c0f4`.

### Shimmer skeleton
Defined in each `index.html` `<style>` block (not in app.js). Class name: `.shimmer`. Used on loading placeholders before data arrives.

---

## Overflow / Mobile Notes

- `html, body { overflow-x: clip }` must be on **both** `html` and `body` in each `index.html` — `clip` on `body` alone does not propagate to the viewport scroller.
- The RA profile `index.html` has no overflow rule (its content fits without it).
- Use `flex-wrap` on toolbar rows that contain multiple buttons on mobile.
- Heatmaps use `overflow-x: auto` wrapper with `minWidth: ${53 * 14}px` inner — this is intentional and correct.

---

## Changelog Convention

**Always update `changelog.md` after making any code changes.** Every feature, fix, or improvement must be logged — do not wait for the user to ask.

When making changes, add an entry to `changelog.md` at the top under a `## YYYY-MM-DD` heading with:
- A one-line summary after the date
- `### SectionName` subsections matching the page changed (RetroAchievements, Steam, Activity, Hub, Completions, Pipelines, Structure)
- Bullet points per change, technical but readable

Section order in `SECTION_ORDER` (changelog/app.js): RetroAchievements, Steam, Hub, Completions, Activity, Pipelines, Structure.
